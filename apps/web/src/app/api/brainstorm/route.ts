import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** حد معدل الطلبات للمستخدمين المجهولين على مسار POST */
const ANON_RATE_LIMIT = {
  limit: 10,
  windowMs: 60 * 1000, // 60 ثانية
} as const;

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/brainstorm");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تحميل كتالوج Brain Storm AI");
  }
}

export async function POST(request: NextRequest) {
  // فحص حد معدل الطلبات قبل الإرسال للباك إند
  const ip = getClientIp(request);
  const rl = checkRateLimit(`brainstorm:${ip}`, ANON_RATE_LIMIT);

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.resetAt),
  };

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "تم تجاوز الحد المسموح من الطلبات - يرجى المحاولة لاحقاً",
        retryAfter: rl.resetAt - Math.floor(Date.now() / 1000),
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rl.resetAt - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  try {
    const response = await proxyToBackend(request, "/api/brainstorm");
    // إضافة رأسيات الحد إلى الاستجابة الناجحة
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تنفيذ مناظرة Brain Storm AI");
  }
}

export function HEAD() {
  return NextResponse.json({
    service: "Brain Storm AI",
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
