/**

 * @fileoverview Next.js Proxy — يضيف رؤوس الحماية الأساسية (CSP، HSTS،

 * X-Frame-Options، X-Content-Type-Options، Referrer-Policy، إلخ).

 *

 * ملاحظة: في Next.js 16، `proxy.ts` هو الاسم الرسمي لطبقة الإدخال هذه،

 * بديلًا عن `middleware.ts` القديم. يعمل Proxy كحدود شبكة أمام التطبيق.

 */

import { NextRequest, NextResponse } from "next/server";

interface ContentSecurityPolicyOptions {
  isDevelopment: boolean;

  allowedDevOrigin?: string;

  sentryOrigin?: string;

  cdnOrigin?: string;

  connectOrigins?: string[];

  nonce?: string;
}

function getOriginFromUrl(url: string | undefined): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * توليد nonce آمن باستخدام Web Crypto API (128-bit entropy)
 */
function generateSecureNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // استخدام btoa القياسي لتحويل إلى base64
  const base64 = btoa(String.fromCharCode(...array));
  // تحويل إلى base64url (استبدال + بـ -, / بـ _, إزالة = من النهاية)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildContentSecurityPolicy({
  isDevelopment,

  allowedDevOrigin,

  sentryOrigin,

  cdnOrigin,

  connectOrigins = [],

  nonce,
}: ContentSecurityPolicyOptions): string | null {
  if (isDevelopment) {
    return null;
  }

  // توليد nonce إذا لم يتم تقديمه
  const effectiveNonce = nonce ?? generateSecureNonce();

  const connectSrcParts = Array.from(
    new Set(
      [
        "'self'",

        "https://apis.google.com",

        "https://maps.googleapis.com",

        "https://identitytoolkit.googleapis.com",

        "https://securetoken.googleapis.com",

        "https://generativelanguage.googleapis.com",

        "https://oauth2.googleapis.com",

        "https://www.googleapis.com",

        "https://api.thecopy.app",

        ...connectOrigins,

        sentryOrigin,

        cdnOrigin,
      ].filter(Boolean)
    )
  );

  const frameAncestors = allowedDevOrigin
    ? `frame-ancestors 'self' ${allowedDevOrigin}`
    : "frame-ancestors 'none'";

  // Sentry report-uri endpoint
  const reportUri = sentryOrigin
    ? `report-uri ${sentryOrigin}/api/${process.env["NEXT_PUBLIC_SENTRY_PROJECT_ID"] ?? "default"}/security/?sentry_key=${process.env["NEXT_PUBLIC_SENTRY_PUBLIC_KEY"] ?? ""}`
    : "";

  return [
    "default-src 'self'",

    [
      "script-src",

      "'self'",

      // استخدام nonce بدلاً من unsafe-inline
      `'nonce-${effectiveNonce}'`,

      // السماح للسكربتات الموثوقة باستدعاء سكربتات أخرى (مهم لـ Sentry و Google APIs)
      "'strict-dynamic'",

      "https://apis.google.com",

      "https://www.gstatic.com",

      "https://maps.googleapis.com",

      "https://*.sentry.io",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    "worker-src 'self' blob:",

    "child-src 'self' blob:",

    [
      "style-src",

      "'self'",

      // استخدام nonce بدلاً من unsafe-inline
      `'nonce-${effectiveNonce}'`,

      "https://fonts.googleapis.com",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    // style-src-attr: توجيه مستقل لسمات style="..." المدمجة على عناصر HTML.
    // الـ nonce في style-src يطبق فقط على عناصر <style> الحرة ولا يغطي
    // السمة المدمجة. هذه السمات يصدرها Next.js و React في وقت التشغيل
    // (مثل أبعاد كروت Hero V-shape وسمة color:transparent من next/image).
    // بدون هذا التوجيه، يحجب المتصفح كل سمة style="..." في HTML
    // فتفقد العناصر أبعادها وتنكسر طبقة GSAP/ScrollTrigger للهيرو.
    "style-src-attr 'unsafe-inline'",

    [
      "font-src",

      "'self'",

      "https://fonts.gstatic.com",

      "https://r2cdn.perplexity.ai",

      "data:",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    [
      "img-src",

      "'self'",

      "data:",

      "blob:",

      "https:",

      "https://placehold.co",

      "https://images.unsplash.com",

      "https://picsum.photos",

      "https://www.gstatic.com",

      "https://*.googleapis.com",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    "media-src 'self' https://cdn.pixabay.com https://*.pixabay.com blob: data:",

    `connect-src ${connectSrcParts.join(" ")}`,

    "frame-src 'self' https://apis.google.com https://*.googleapis.com",

    "object-src 'none'",

    "base-uri 'self'",

    "form-action 'self'",

    frameAncestors,

    "upgrade-insecure-requests",

    reportUri,
  ]
    .filter(Boolean)
    .join("; ");
}

function collectAllowedConnectOrigins(urls: (string | undefined)[]): string[] {
  return Array.from(
    new Set(
      urls

        .map((url) => getOriginFromUrl(url))

        .filter((origin): origin is string => Boolean(origin))
    )
  );
}

/**

 * نقطة الدخول الرسمية لطبقة Next.js Proxy. تُحسب رؤوس CSP الديناميكية

 * وتُلصق بكل استجابة قبل تسليمها للمتصفح.

 *

 * @param request - طلب Next.js الوارد. يُستخدم لتمرير الـ nonce والـ CSP
 *
 *   عبر request headers قبل render، حتى يتمكن Next.js من حقن الـ nonce
 *
 *   تلقائيًا في كل سكربت يولّده (متطلَّب لـ CSP الصارم: nonce + strict-dynamic).

 * @returns NextResponse مع رؤوس الحماية.

 */

export function proxy(request: NextRequest) {
  // Development mode detection

  const isDevelopment = process.env.NODE_ENV === "development";

  const allowedDevOrigin = process.env.ALLOWED_DEV_ORIGIN ?? "";

  const sentryOrigin = getOriginFromUrl(process.env.NEXT_PUBLIC_SENTRY_DSN);

  const cdnOrigin = getOriginFromUrl(process.env.NEXT_PUBLIC_CDN_URL);

  const connectOrigins = collectAllowedConnectOrigins([
    process.env.NEXT_PUBLIC_API_URL,

    process.env.NEXT_PUBLIC_BACKEND_URL,

    process.env.BACKEND_URL,

    process.env.EDITOR_RUNTIME_BASE_URL,

    process.env.FILE_IMPORT_BACKEND_URL,

    process.env.NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL,

    process.env.NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL,
  ]);

  // توليد nonce لكل طلب
  const nonce = generateSecureNonce();

  const contentSecurityPolicy = buildContentSecurityPolicy({
    isDevelopment,

    allowedDevOrigin,

    sentryOrigin,

    cdnOrigin,

    connectOrigins,

    nonce,
  });

  // تمرير الـ nonce و الـ CSP عبر request headers لكي يتمكن Next.js من
  // قراءتهما أثناء render وحقن الـ nonce تلقائيًا في كل <script> يولّده.
  // هذا الجزء حاسم لعمل CSP الصارم (nonce + strict-dynamic) مع SSR.
  // المرجع الرسمي: https://nextjs.org/docs/app/guides/content-security-policy
  const requestHeaders = new Headers(request.headers);

  if (contentSecurityPolicy) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (contentSecurityPolicy) {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    // حقن nonce في header مخصص لاستخدامه في templates / أدوات الفحص
    response.headers.set("x-nonce", nonce);
  }

  // Additional security headers

  if (!isDevelopment) {
    response.headers.set(
      "Strict-Transport-Security",

      "max-age=31536000; includeSubDomains; preload"
    );
  }

  response.headers.set("X-Content-Type-Options", "nosniff");

  response.headers.set("X-Frame-Options", "DENY");

  response.headers.set("X-XSS-Protection", "1; mode=block");

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*

     * Match all request paths except:

     * - _next/static (static files)

     * - _next/image (image optimization files)

     * - favicon.ico (favicon file)

     * - public files (public folder)

     */

    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
