/**
 * مسار فحص الصحة لخدمة البريك دون
 *
 * يُعيد استجابة سريعة دون الحاجة إلى الخلفية أو المصادقة.
 * يُستخدم أيضًا لضبط رمز CSRF قبل إرسال الطلبات.
 */

import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";

/** توليد رمز CSRF آمن */
function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/** قراءة رمز CSRF الحالي أو توليد رمز جديد */
function resolveCsrfToken(request: NextRequest): string {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  return existingToken ?? generateCsrfToken();
}

/** إعداد رمز CSRF في ملف ارتباط مشدد في كل فحص صحة */
function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
}

export function GET(request: NextRequest): NextResponse {
  const csrfToken = resolveCsrfToken(request);
  const response = NextResponse.json({
    success: true,
    data: {
      service: "breakdown",
      status: "ok",
      timestamp: new Date().toISOString(),
      source: "nextjs-native",
      csrfToken,
    },
  });

  // ضبط رمز CSRF للطلبات اللاحقة
  setCsrfCookie(response, csrfToken);
  return response;
}
