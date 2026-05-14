/**
 * @file route.ts
 * @description Endpoint تحليل النص لتطبيق actorai-arabic.
 *
 * إصلاح P0-4: التقرير الميداني وثّق أن زر "حلل النص" مفعّل لكنه
 * لا يطلق أي /api/*. الحل: نوفّر هذا الـ endpoint الحقيقي بحيث
 * يربطه الـ hook الجديد عبر useAsyncOperation. المنطق التحليلي
 * يُعاد استخدامه من الدالة المحلية analyzeScriptText الموجودة
 * أصلاً، لكن خلف API يقبل validation و rate limiting و meta.
 */

import { assertActorAnalysisNotEmpty } from "@the-copy/ai-orchestration";
import {
  ApiError,
  apiSuccess,
  errorToFailure,
  generateRequestId,
  statusForCode,
} from "@the-copy/api-client";
import { enforceRateLimit } from "@the-copy/security-middleware";
import { Language, parseOrThrow, ScriptText, z } from "@the-copy/validation";
import { NextRequest, NextResponse } from "next/server";

import { analyzeScriptText } from "@/app/(main)/actorai-arabic/lib/script-analysis";

import type { AnalysisResult } from "@/app/(main)/actorai-arabic/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  scriptText: ScriptText,
  language: Language.optional().default("ar"),
  methodology: z
    .enum(["stanislavsky", "meisner", "method", "chekhov"])
    .optional()
    .default("stanislavsky"),
  sceneContext: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startedAt = Date.now();

  try {
    // ─── (1) parse + validate ────────────────────────────────────────────
    const rawBody: unknown = await request.json().catch(() => null);
    const input = parseOrThrow(RequestSchema, rawBody);

    // ─── (2) rate limit per IP ────────────────────────────────────────────
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    enforceRateLimit({
      key: `actorai-arabic:analyze-script:${clientIp}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    // ─── (3) compute analysis ─────────────────────────────────────────────
    const localResult = analyzeScriptText(input.scriptText, input.methodology);

    // المنطق المحلي يُرجع شكلاً مختلفاً قليلاً؛ نطبّع لمخرج موحّد.
    const normalized = {
      characterNotes: extractCharacterNotes(localResult),
      beats: extractBeats(localResult),
      objectives: extractObjectives(localResult),
      subtext: extractSubtext(localResult),
      performanceGuidance: extractPerformanceGuidance(localResult),
      warnings: [] as string[],
    };

    // ─── (4) منع empty response من المرور كنجاح ─────────────────────────
    const validated = assertActorAnalysisNotEmpty(normalized);

    // ─── (5) success ──────────────────────────────────────────────────────
    const envelope = apiSuccess(validated, {
      requestId,
      startedAt,
      version: "1.0",
    });
    return NextResponse.json(envelope, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toFailure(), {
        status: statusForCode(error.code),
        headers: { "x-request-id": requestId },
      });
    }
    return NextResponse.json(errorToFailure(error, requestId), {
      status: 500,
      headers: { "x-request-id": requestId },
    });
  }
}

// ─── محوّلات من شكل المخرج المحلي إلى ActorAnalysisOutput الموحد ────────────

function compactStrings(
  values: readonly (string | null | undefined)[]
): string[] {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function extractCharacterNotes(result: AnalysisResult): string[] {
  return compactStrings([
    result.objectives.main,
    result.objectives.scene,
    ...result.obstacles.internal,
    ...result.obstacles.external,
  ]);
}

function extractBeats(result: AnalysisResult): string[] {
  return compactStrings(result.objectives.beats);
}

function extractObjectives(result: AnalysisResult): string[] {
  return compactStrings([result.objectives.main, result.objectives.scene]);
}

function extractSubtext(result: AnalysisResult): string[] {
  return compactStrings([
    ...result.obstacles.internal,
    ...result.obstacles.external,
  ]);
}

function extractPerformanceGuidance(result: AnalysisResult): string[] {
  const emotionalGuidance = result.emotionalArc.map(
    (point) =>
      `الضربة ${point.beat}: ${point.emotion} بدرجة ${point.intensity}.`
  );
  return compactStrings([...result.coachingTips, ...emotionalGuidance]);
}
