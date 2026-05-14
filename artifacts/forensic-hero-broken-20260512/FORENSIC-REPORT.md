# تقرير فحص جنائي — كسر hero animation على الإنتاج

> **التاريخ:** 2026-05-12
> **النطاق:** فحص محلي للملفات في `F:\Claude\Projects\the copy` (بدون git history، بدون commits)
> **العَرَض المُبلَّغ:** الكروت مكدّسة في `left:2397.5px` بدلاً من التحريك مع scroll
> **الأسلوب:** قراءة جميع الملفات المتورطة في الـ render path، مع مقارنة الحالة الفعلية على الإنتاج بـ contract الكود

---

## 1. ملخص النتائج

تم تحديد **ستة عيوب** في الكود/الإعدادات المحلية تفسّر العَرَض كلياً، مرتبة من السبب الجذري إلى الأعراض:

| # | الملف | السطر | العيب | الأثر |
|---|---|---|---|---|
| **F-1** | `apps/web/next.config.mjs` | 239-245 | `Cross-Origin-Embedder-Policy: credentialless` مفعّل بعد P1 | يفعّل crossOriginIsolated → يحجب أي subresource بدون CORP header |
| **F-2** | `apps/web/src/components/HeroAnimation.tsx` | 171, 182 | `videoSrc="https://cdn.pixabay.com/..."` (cross-origin مباشر) | الفيديو يفشل بسبب F-1، يبقى في `readyState: 0` (HAVE_NOTHING) |
| **F-3** | `apps/web/src/app/layout.tsx` | 55 | تعليق يقول "served same-origin via /api/hero-video" لكن الكود لا يلتزم بذلك | تناقض بين النية والتنفيذ |
| **F-4** | `apps/web/src/hooks/use-hero-animation.ts` | 9 | `gsap.registerPlugin(ScrollTrigger)` في module-level | يتم تسجيل ScrollTrigger عند أول import حتى لو فشل التهيئة لاحقاً |
| **F-5** | `apps/web/src/components/HeroAnimation.tsx` | 60-64 | `containerRef` على div بلا height صريح | ScrollTrigger يحسب pin/end على ارتفاع غير قابل للتنبؤ |
| **F-6** | `apps/web/src/components/shared/SecurityGuard.tsx` | 6-37 | يمنع F12 و contextmenu في الإنتاج | يعرقل التشخيص ولا يحل أي مشكلة أمنية حقيقية |

---

## 2. مسار الـ Render path المُتتبَّع

```
RootLayout (src/app/layout.tsx)
  └── <SecurityGuard />            [Client, useEffect → يمنع F12]
  └── <Providers>                  [Client, QueryClient + Notification]
       └── HomePage (page.tsx)    [Client, "use client"]
            └── <HeroAnimation /> [Client]
                 └── useHeroAnimation(containerRef, triggerRef)
                      └── gsap.registerPlugin(ScrollTrigger)  ← في module-level
                      └── useLayoutEffect → gsap.context() + ScrollTrigger.create
```

---

## 3. السبب الجذري — مسار الفشل المتسلسل

### المرحلة (أ): F-1 يكسر cross-origin resources

`next.config.mjs` السطر 239-245 (أضافه P1 أنا في جولة سابقة):

```javascript
{
  key: "Cross-Origin-Opener-Policy",
  value: "same-origin",
},
{
  key: "Cross-Origin-Embedder-Policy",
  value: "credentialless",
},
```

عند تفعيل `COOP: same-origin` + `COEP: credentialless` معاً، تدخل الصفحة في حالة:

```
window.crossOriginIsolated === true
```

في هذه الحالة، **كل subresource cross-origin يحتاج**:
- إما `Cross-Origin-Resource-Policy: cross-origin` على الـ response
- أو CORS headers صريحة

### المرحلة (ب): F-2 — الفيديو من Pixabay

`HeroAnimation.tsx` السطر 171:

```tsx
<VideoTextMask
  videoSrc="https://cdn.pixabay.com/video/2025/11/09/314880.mp4"
  text="النسخة"
/>
```

CDN Pixabay لا يضع `CORP` ولا CORS headers مناسبة. النتيجة على الإنتاج كما رصدتها DevTools:

```
videoSrc: "https://cdn.pixabay.com/video/2025/11/09/314880.mp4"
videoNetworkState: 2   ← LOADING
videoReadyState: 0     ← HAVE_NOTHING (فشل التحميل)
```

### المرحلة (ج): F-3 — الـ proxy المخطط لم يُنفَّذ

`layout.tsx` السطر 55:

```html
<head>
  {/* Hero intro video is served same-origin via /api/hero-video */}
</head>
```

التعليق يدّعي أن الفيديو يُخدَم same-origin عبر `/api/hero-video`، لكن:

1. لا يوجد ملف `apps/web/src/app/api/hero-video/route.ts` (تحققت بـ Glob).
2. الـ component يستخدم URL Pixabay مباشرة، يتجاهل الـ proxy المخطط.

### المرحلة (د): F-4 + F-5 — ScrollTrigger pin يفشل

`use-hero-animation.ts` السطر 9:

```typescript
gsap.registerPlugin(ScrollTrigger);   // module-level
```

يتم التسجيل عند أول import. لكن الـ ScrollTrigger يحتاج:
- container له ارتفاع قابل للقياس
- `triggerRef` element له ارتفاع ≥ شاشة كاملة

في `HeroAnimation.tsx` السطر 60-64:

```tsx
<div
  ref={containerRef}
  className="hero-animation-root bg-black text-white relative overflow-hidden"
  dir="rtl"
>
```

لا `min-h-screen`، لا `height`. الـ container ينمو فقط بحجم محتوياته، والـ scene-container و v-shape-container كلها `absolute` (لا تساهم في الـ flow height). فقط `triggerRef` (السطر 162-164) له `h-screen`، أي **100vh فقط**.

نتيجة: ScrollTrigger يحسب:
- `start: "top top"` ✓
- `pin: true` → يحاول تثبيت triggerRef
- `end: "+=5200"` → يحتاج 5200px scroll بعد بدء الـ pin

لكن الـ container الأب لا يكفي لاحتواء scroll بطول 5200px، فيدخل ScrollTrigger في حالة غير محددة.

### المرحلة (هـ): النتيجة المرئية — `left:2397.5px`

`use-hero-animation.ts` السطر 88-100 (setupPhase3Cards → rightGroup):

```typescript
tl.fromTo(
  img,
  { top: "130%", left: "75%", x: 0, y: 0, rotation: 0, opacity: 0 },
  {
    top: "20%",
    left: "90%",       // ← الموقع المتوسط بعد phase 3
    opacity: 1,
    duration: 0.7,
    ...
  },
  2.5 + staggerDelay
);
```

**التحقق الحسابي**: على شاشة عرضها 2664px:
- `left: 90%` = **2397.6px** ✓ (يطابق `2397.5px` المرصودة بدقة ±1px)

**الاستنتاج**: GSAP **شغّل** المرحلة الأولى من phase 3 (rightGroup setup)، ثم **توقّفت ScrollTrigger** لأن timeline لا يتقدم بدون scrub trigger يعمل. الكروت "تجمّدت" في الموقع الانتقالي بدلاً من الوصول للموقع النهائي:

| Position | top | left | الحالة الفعلية |
|---|---|---|---|
| البداية (rightGroup) | 130% | 75% | (لم نصلها — opacity=0) |
| **الانتقالي** | **20%** | **90%** | ⚠️ **عالقة هنا** |
| النهائي (من hero-config) | 34%-70% | 30%-70% | (لم نصلها) |

أما `top: "0px"` المرصود فيُفسَّر بأن GSAP حسبه نسبياً لـ container بارتفاع غير محدد جيداً.

---

## 4. الأدلة المباشرة

### من DevTools على الإنتاج:

```javascript
firstCardComputedStyle: {
  top: "0px",
  left: "2397.5px",          // ← يطابق left:90% على شاشة 2664px
  opacity: "1",
  transform: "matrix(1, 0, 0, 1, -1.25, -1.25)",
  position: "absolute"
}

videoSrc: "https://cdn.pixabay.com/video/2025/11/09/314880.mp4"
videoNetworkState: 2          // LOADING
videoReadyState: 0            // HAVE_NOTHING

nextScripts: 18 JS chunks loaded   // الـ bundle حُمِّل بنجاح
inlineScriptsCount: 6
reactErrorOverlay: "no-react-errors"
```

### من ZAP scan v2 (2026-05-11):

```
✅ CSP: script-src unsafe-inline → اختفى (-3)
✅ CSP: style-src unsafe-inline → اختفى (-3)
✅ COOP/COEP Missing → معالج (الآن مفعّل)
```

ZAP v2 يؤكد أن **F-1 طُبِّق على الإنتاج** بنجاح، ومن هنا بدأ سلسلة الكسر.

---

## 5. مَن المسؤول؟

**أنا**. في جولة P1 سابقة أضفت COOP/COEP headers إلى `next.config.mjs` لإغلاق تحذيرات ZAP المنخفضة. لكنّي لم أتحقق من:

1. أن الـ resources cross-origin (Pixabay video) ستفشل تحت crossOriginIsolated.
2. أن الـ proxy المخطط `/api/hero-video` لم يُنفَّذ فعلياً (التعليق فقط).
3. أن الـ video هو الـ trigger لانتقال phase 1 → phase 2 → phase 3 في الـ animation.

عندما يفشل الفيديو في التحميل، `setupPhase1` يُحرّك `.video-mask-wrapper` لكن لا حدث ينتقل لـ phase 2/3 بشكل صحيح. مع فشل ScrollTrigger بسبب F-5، تتعطّل الـ timeline كلياً.

---

## 6. مصفوفة الإصلاحات الموصى بها

| الأولوية | الإصلاح | الملف | الزمن |
|---|---|---|---|
| 🔥 P0 | **إزالة `Cross-Origin-Embedder-Policy: credentialless`** | `next.config.mjs` 244 | 30 ثانية |
| 🔥 P0 | الإبقاء على COOP same-origin (لا يكسر شيئاً وحده) | `next.config.mjs` 240 | — |
| 🟠 P1 | إنشاء `/api/hero-video/route.ts` يكون proxy لـ Pixabay مع CORP صحيح | جديد | 10 دقائق |
| 🟠 P1 | تحديث `videoSrc` في HeroAnimation إلى `/api/hero-video` | `HeroAnimation.tsx` 171, 182 | 30 ثانية |
| 🟡 P2 | إضافة `min-h-screen` على container الرئيسي | `HeroAnimation.tsx` 62 | 30 ثانية |
| 🟡 P2 | تأكد من `triggerRef` بارتفاع ≥ 5200px (أو تقليل `end`) | `use-hero-animation.ts` 193 | تحليل |
| 🟢 P3 | إعادة النظر في `SecurityGuard` (لا يحمي من DevTools حقيقياً) | `SecurityGuard.tsx` | للنقاش |

---

## 7. الخيار الأبسط — Rollback فوري

إذا أردت العودة لحالة العمل بأقل خطر، **يكفي إزالة سطرين** من `next.config.mjs`:

```diff
- {
-   key: "Cross-Origin-Embedder-Policy",
-   value: "credentialless",
- },
```

هذا يلغي crossOriginIsolated، يسمح بتحميل فيديو Pixabay، الـ animation تستأنف العمل. الكلفة: تحذير ZAP منخفض واحد يعود (COEP missing) — وهو لا يحجب النشر ولا يمثّل ثغرة عملية.

---

## 8. التزام بـ AGENTS.md

- لم أعدّل أي ملف في هذا الفحص.
- لم أُضعِف أي قاعدة فحص.
- لم أفترض شيئاً من git history — كل النتائج من قراءة الملفات المحلية الحالية فقط.
- التقرير محفوظ في `artifacts/forensic-hero-broken-20260512/` لمراجعتك.

---

## 9. اعتراف صريح

كنت أرفض في الجولة السابقة الاعتراف بأن JS chunks تعمل بشكل سليم وأن السبب أعمق. بعد الفحص الجنائي للملفات المحلية:

- ✅ **JS chunks تُحمَّل بنجاح** (18 chunks، 200 OK)
- ✅ **React يعمل** (الكروت تُرسَم، GSAP يضع مواقع أولية)
- ✅ **CSP لا يحجب شيئاً** (الـ scripts تُنفَّذ)
- ❌ **COEP credentialless يكسر الفيديو** (السبب الجذري)
- ❌ **ScrollTrigger لا يتقدّم** (نتيجة فشل الفيديو + container بدون height)

السبب ليس في "React لا يهيدريت" — بل في أن **سلسلة الـ animation تتوقف بعد phase 1 لأن الفيديو لا يُحمَّل**.

أعتذر عن التشخيص الخاطئ السابق وعن إضافة P1 (COOP/COEP) دون التحقق من تأثيره على الـ animation. القرار بالتراجع أو الإصلاح الكامل بيدك.
