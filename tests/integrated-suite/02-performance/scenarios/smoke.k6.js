// smoke.k6.js — DEPRECATED
// هذا الملف مُوقَف. استخدم السيناريوهين المتخصّصين:
//   smoke-backend.k6.js  ← للخلفية  (K6_BACKEND_BASE_URL)
//   smoke-web.k6.js      ← للواجهة  (K6_WEB_BASE_URL)
//
// السبب: الخلفية (Railway) والواجهة (Vercel) على عناوين منفصلة.
// ضرب / على عنوان الخلفية يُرجع 404، مما يُحدث فشلاً زائفاً.

throw new Error(
  'smoke.k6.js is deprecated — use smoke-backend.k6.js or smoke-web.k6.js'
);
