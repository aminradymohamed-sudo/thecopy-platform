# خطة Hardening — CSP بـ nonces بدلاً من unsafe-inline

> **الحالة الحالية:** CSP موجودة وفعّالة لكن تستخدم `'unsafe-inline'` على `script-src` و `style-src`.
> **مرجع الفحص:** `DISC-007` في `prod-20260510-063907/00-discovery/production-surface.json`.
> **التصنيف:** P2 — informational. مقبول لـ Next.js App Router runtime الذي يحقن hydration scripts inline.
> **الأولوية:** متوسطة (post-launch hardening، لا يحجب أي شيء).

---

## لماذا الحالة الحالية مقبولة

Next.js App Router يولّد:
1. **inline `<script>` tags** للـ React Server Components hydration (data + props serialization)
2. **inline `<style>` tags** عبر styled-jsx و CSS-in-JS libraries (Tailwind static CSS منفصل ولا يتأثر)
3. **inline event handlers** نادرة (تُجنّب في React modern)

بدون `'unsafe-inline'`، كل هذه ستُحجب → التطبيق ينكسر كلياً. الحل المعياري: **CSP nonces**.

---

## الخطة (3 خطوات)

### الخطوة 1: إنشاء middleware يولّد nonce

ملف جديد: `apps/web/src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // توليد nonce فريد لكل request (base64، 16 bytes)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // CSP صارمة — تستبدل 'unsafe-inline' بـ nonce
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://www.gstatic.com;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://images.unsplash.com https://picsum.photos https://placehold.co https://r2cdn.perplexity.ai https://*.pixabay.com;
    media-src 'self' https://*.pixabay.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.sentry.io https://o4511284205453312.ingest.us.sentry.io https://backend-thecopy-production.up.railway.app;
    frame-src 'self' https://apis.google.com;
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // قراءة الـ nonce في server components عبر header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // وضع CSP على response أيضاً
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    // كل المسارات ما عدا الستاتيك و _next/static
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

### الخطوة 2: قراءة nonce في root layout وتمريره للـ scripts

تعديل: `apps/web/src/app/layout.tsx`

```typescript
import { headers } from "next/headers";
import Script from "next/script";

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* أي inline script يجب يحمل nonce */}
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce ?? undefined}>
          {`/* theme initialization */`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### الخطوة 3: إزالة `'unsafe-inline'` من Vercel/Next.js CSP

حالياً CSP يُحقن من مكان خارجي (Vercel platform أو next.config). بعد إضافة middleware، CSP الجديدة من middleware ستكون لها الأولوية. أزل أي CSP مكرّرة من:
- `apps/web/next.config.mjs` async headers (إن وُجدت)
- `vercel.json` headers (إن وُجد)

---

## المخاطر والاحتياطات

### مخاطر التطبيق العشوائي (لماذا لا أفعلها الآن بدون testing)

1. **أي inline script بدون nonce → الموقع لا يعمل** (white screen)
2. **مكتبات third-party تستخدم inline scripts** (Google Analytics، Sentry، إلخ) قد تحتاج تكييف
3. **Server Components hydration** قد تنكسر إذا nonce لم يُمرّر صحيحاً
4. **CSS-in-JS libraries** (styled-jsx، emotion) قد تحتاج إعداد nonce

### Testing المطلوب قبل الإنتاج

1. **تشغيل في staging environment** — لا تطبّق على production مباشرة
2. **فحص كل صفحة عامة** + console errors
3. **فحص كل dynamic component** (editor، studios، modals)
4. **فحص integrations**: Firebase auth، Sentry، Google APIs، analytics
5. **Lighthouse re-run** بعد التطبيق
6. **axe-core re-run**
7. **e2e tests كاملة**

### خطة rollback

- نشر CSP عبر `Content-Security-Policy-Report-Only` header أولاً (لا يحجب، فقط يبلّغ)
- جمع reports لـ 1-2 أسبوع
- معالجة كل violation
- ثم نشر CSP enforcement فعلياً

---

## التقدير الزمني

- **التطوير:** 4-8 ساعات
- **Testing في staging:** 8-16 ساعة (يشمل bug fixes للـ inline scripts المكتشفة)
- **Report-Only mode في إنتاج:** 1-2 أسبوع جمع بيانات
- **التطبيق الفعلي:** 30 دقيقة + verification

**الإجمالي:** 1-2 أسبوع عمل من بدء التطوير حتى enforcement كامل في إنتاج.

---

## التوصية

**لا تطبّق هذا الـ hardening الآن**. الحالة الحالية مقبولة لأن:
- CSP موجودة وتغطي frame-ancestors، object-src، base-uri، form-action
- HSTS preload + X-Frame-Options DENY يضيفان دفاعات إضافية
- لا توجد ثغرات XSS مرصودة في SAST

**خطّط للتطبيق في إصدار minor مستقبلي** بعد توفر staging environment وbandwidth للـ testing الشامل.

---

> **حوكمة:** هذا الملف خطة hardening لـ DISC-007، محفوظ في `docs/security/CSP-NONCES-HARDENING-PLAN.md`. لا يطلب تطبيقاً فورياً.
