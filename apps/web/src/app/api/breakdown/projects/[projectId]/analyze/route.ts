/**
 * مسار تحليل مشروع البريك دون بالذكاء الاصطناعي
 *
 * يحلِّل جميع مشاهد السيناريو المُجزَّأة سابقًا في خطوة bootstrap
 * باستخدام Gemini API مباشرة من طبقة Next.js.
 *
 * لا يتطلب:
 * - مصادقة JWT
 * - خلفية منفصلة
 * - قاعدة بيانات
 */

import { NextRequest, NextResponse } from "next/server";

import {
  BreakdownAnalyzeRequestSchema,
  type BreakdownAnalyzeRequestOutput,
} from "@/app/(main)/breakdown/domain/schemas";
import { segmentScriptLocally } from "@/app/(main)/breakdown/infrastructure/screenplay/local-segmenter";
import { analyzeBreakdownLocally } from "@/app/api/breakdown/_lib/breakdown-gemini-server";
import {
  getProjectSession,
  deleteProjectSession,
} from "@/app/api/breakdown/_lib/breakdown-session";
import { logger } from "@/lib/ai/utils/logger";
import { buildSafeErrorResponse } from "@/lib/server/safe-error-response";

import type {
  SceneHeaderData,
  ScriptSegmentResponse,
} from "@/app/(main)/breakdown/domain/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** مهلة الطلب: 5 دقائق (التحليل قد يستغرق وقتًا) */
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

type AnalysisSource =
  | {
      ok: true;
      projectId: string;
      title: string;
      scenes: ScriptSegmentResponse["scenes"];
      deleteSessionAfterSuccess: boolean;
    }
  | {
      ok: false;
      response: NextResponse;
    };

async function readAnalyzeRequestBody(
  request: NextRequest
): Promise<BreakdownAnalyzeRequestOutput | null | NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = request.headers.get("content-length");
  const hasJsonBody =
    contentType.toLowerCase().includes("application/json") ||
    (contentLength !== null && Number(contentLength) > 0);

  if (!hasJsonBody) {
    return null;
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "تنسيق طلب البريك دون غير صالح.",
      errorCode: "BREAKDOWN_INVALID_JSON",
      traceIdPrefix: "breakdown",
    });
  }

  const parsedBody = BreakdownAnalyzeRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "بيانات طلب التحليل غير صالحة.",
      errorCode: "BREAKDOWN_ANALYZE_REQUEST_INVALID",
      traceIdPrefix: "breakdown",
    });
  }

  return parsedBody.data;
}

function compactSegmentScenes(
  scenes: NonNullable<BreakdownAnalyzeRequestOutput["parsed"]>["scenes"]
): ScriptSegmentResponse["scenes"] {
  return scenes.map((scene) => {
    const nextScene: ScriptSegmentResponse["scenes"][number] = {
      header: scene.header,
      content: scene.content,
    };

    if (scene.headerData !== undefined) {
      nextScene.headerData = compactHeaderData(scene.headerData);
    }
    if (scene.sceneId !== undefined) {
      nextScene.sceneId = scene.sceneId;
    }

    return nextScene;
  });
}

function compactHeaderData(
  headerData: NonNullable<
    NonNullable<
      BreakdownAnalyzeRequestOutput["parsed"]
    >["scenes"][number]["headerData"]
  >
): SceneHeaderData {
  const nextHeaderData: SceneHeaderData = {
    sceneNumber: headerData.sceneNumber,
    sceneType: headerData.sceneType,
    location: headerData.location,
    timeOfDay: headerData.timeOfDay,
    pageCount: headerData.pageCount,
    storyDay: headerData.storyDay,
  };

  if (headerData.rawHeader !== undefined) {
    nextHeaderData.rawHeader = headerData.rawHeader;
  }

  return nextHeaderData;
}

async function resolveAnalysisSource(
  request: NextRequest,
  projectId: string
): Promise<AnalysisSource> {
  const session = getProjectSession(projectId);

  if (session?.parsed.scenes.length) {
    return {
      ok: true,
      projectId: session.projectId,
      title: session.title,
      scenes: session.parsed.scenes,
      deleteSessionAfterSuccess: true,
    };
  }

  const body = await readAnalyzeRequestBody(request);
  if (body instanceof NextResponse) {
    return { ok: false, response: body };
  }

  const requestTitle =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : (session?.title ?? "مشروع بريك دون");

  if (body?.parsed?.scenes.length) {
    return {
      ok: true,
      projectId,
      title: requestTitle,
      scenes: compactSegmentScenes(body.parsed.scenes),
      deleteSessionAfterSuccess: Boolean(session),
    };
  }

  const scriptContent =
    typeof body?.scriptContent === "string" ? body.scriptContent.trim() : "";

  if (scriptContent) {
    const parsed = segmentScriptLocally(scriptContent);
    if (parsed.scenes.length) {
      return {
        ok: true,
        projectId,
        title: requestTitle,
        scenes: parsed.scenes,
        deleteSessionAfterSuccess: Boolean(session),
      };
    }

    return {
      ok: false,
      response: buildSafeErrorResponse({
        status: 422,
        fallbackMessage: "لا توجد مشاهد قابلة للتحليل في السيناريو.",
        errorCode: "BREAKDOWN_NO_SCENES",
        traceIdPrefix: "breakdown",
      }),
    };
  }

  if (session) {
    return {
      ok: false,
      response: buildSafeErrorResponse({
        status: 422,
        fallbackMessage: "لا توجد مشاهد قابلة للتحليل في السيناريو.",
        errorCode: "BREAKDOWN_NO_SCENES",
        traceIdPrefix: "breakdown",
      }),
    };
  }

  return {
    ok: false,
    response: buildSafeErrorResponse({
      status: 404,
      fallbackMessage:
        "لم يُعثر على بيانات المشروع أو انتهت صلاحيتها. أعد تجزئة السيناريو أولاً.",
      errorCode: "BREAKDOWN_PROJECT_SESSION_MISSING",
      traceIdPrefix: "breakdown",
    }),
  };
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  let projectId: string;
  try {
    const params = await ctx.params;
    projectId = params.projectId ?? "";
  } catch {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "معرف المشروع مطلوب.",
      errorCode: "BREAKDOWN_PROJECT_ID_REQUIRED",
      traceIdPrefix: "breakdown",
    });
  }

  if (!projectId) {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "معرف المشروع غير صالح.",
      errorCode: "BREAKDOWN_PROJECT_ID_INVALID",
      traceIdPrefix: "breakdown",
    });
  }

  const source = await resolveAnalysisSource(request, projectId);
  if (!source.ok) {
    return source.response;
  }

  try {
    // تحليل المشاهد بالذكاء الاصطناعي
    const report = await analyzeBreakdownLocally(
      source.projectId,
      source.title,
      source.scenes
    );

    // إصلاح P0-3: التحقق من أن النتيجة فعلياً تحتوي بيانات قبل الإرجاع.
    // empty response لا يجوز أن يمر كنجاح.
    if (
      report === null ||
      report === undefined ||
      (Array.isArray((report as { scenes?: unknown[] }).scenes) &&
        ((report as { scenes: unknown[] }).scenes.length ?? 0) === 0)
    ) {
      logger.error(
        "[breakdown/projects/analyze] التحليل أرجع نتيجة فارغة — يُعتبر فشلاً",
        { projectId: source.projectId }
      );
      return buildSafeErrorResponse({
        status: 502,
        fallbackMessage: "لم يرجع التحليل أي نتيجة قابلة للاستخدام.",
        errorCode: "BREAKDOWN_MODEL_EMPTY",
        traceIdPrefix: "breakdown",
      });
    }

    // حذف الجلسة بعد التحليل الناجح (توفير الذاكرة)
    if (source.deleteSessionAfterSuccess) {
      deleteProjectSession(projectId);
    }

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل تحليل السيناريو";

    // إصلاح P0-3: تصنيف الفشل بدل 500 خام.
    // الواجهة تستخدم status لتحديد كيف تعرض الخطأ، و500 الخام يجعلها
    // تبقى في "جاري التحليل" بلا رسالة. الآن نُرجع status مناسباً
    // ورسالة عربية واضحة، ولا يتسرّب stack trace.

    const lower = message.toLowerCase();
    const inferredStatus = (() => {
      if (lower.includes("timeout") || lower.includes("aborted")) {
        return {
          status: 504,
          code: "BREAKDOWN_ANALYSIS_TIMEOUT",
          msg: "انتهت مهلة التحليل.",
        };
      }
      if (
        lower.includes("api key") ||
        lower.includes("missing key") ||
        lower.includes("api_key")
      ) {
        return {
          status: 503,
          code: "BREAKDOWN_AI_UNAVAILABLE",
          msg: "خدمة التحليل غير متاحة حالياً. يرجى المحاولة لاحقاً.",
        };
      }
      if (lower.includes("rate limit") || lower.includes("quota")) {
        return {
          status: 429,
          code: "BREAKDOWN_QUOTA_EXCEEDED",
          msg: "تجاوزت حد الاستخدام. يرجى المحاولة لاحقاً.",
        };
      }
      if (lower.includes("validation") || lower.includes("schema")) {
        return {
          status: 422,
          code: "BREAKDOWN_VALIDATION_ERROR",
          msg: "بيانات السيناريو غير صالحة للتحليل.",
        };
      }
      return {
        status: 502,
        code: "BREAKDOWN_ANALYSIS_FAILED",
        msg: "فشل تحليل السيناريو. تم تسجيل الخطأ ويمكنك إعادة المحاولة.",
      };
    })();

    logger.error("[breakdown/projects/analyze] خطأ في التحليل:", {
      projectId,
      classifiedCode: inferredStatus.code,
      classifiedStatus: inferredStatus.status,
      technicalMessage: message,
    });

    return buildSafeErrorResponse({
      status: inferredStatus.status,
      fallbackMessage: inferredStatus.msg,
      errorCode: inferredStatus.code,
      traceIdPrefix: "breakdown",
    });
  }
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const params = await ctx.params;
  const projectId = params.projectId ?? "";
  const session = getProjectSession(projectId);

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      sessionFound: !!session,
      sceneCount: session?.parsed.scenes.length ?? 0,
    },
  });
}
