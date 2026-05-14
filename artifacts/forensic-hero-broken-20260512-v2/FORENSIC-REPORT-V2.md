# تقرير فحص جنائي شامل (V2) — كسر hero animation على الإنتاج

> **التاريخ:** 2026-05-12
> **النطاق:** فحص قرائي للملفات المحلية فقط في `F:\Claude\Projects\the copy`
> **الإلغاء:** التقرير V1 (`forensic-hero-broken-20260512/`) ملغى — كان مبنياً على تفسير خاطئ لقراءتين لحظيتين من DevTools
> **الإثبات المضاد:** المستخدم رفع فيديو يثبت أن الفيديو يعمل في الخلفية، مما يلغي فرضية COEP/Pixabay في V1

---

## 0. منهجية الفحص

تم فحص **17 ملفاً** من الـ render path الكامل للصفحة الرئيسية حتى الـ V-cards والـ navigation. كل اكتشاف يُصنَّف كالتالي:

- 🟢 **مؤكد قرائياً** — من قراءة الكود مباشرة، لا يحتاج تشغيل
- 🟡 **مشكوك فيه** — يحتاج تحقق runtime لإثباته أو نفيه
- ⚪ **استبعاد فرضية سابقة** — تصحيح خطأ في تقرير V1

---

## 1. خريطة الـ Render Path المُتتبَّعة

```
apps/web/src/app/layout.tsx          ← Root Layout (cairo font, SecurityGuard, Providers)
  └── apps/web/src/components/shared/SecurityGuard.tsx
  └── apps/web/src/app/providers.tsx  ← QueryClient + Notification
       └── apps/web/src/app/page.tsx ← Home Page ("use client"، useState للتبديل HeroAnimation ↔ AppGrid)
            ├── apps/web/src/components/HeroAnimation.tsx
            │    ├── apps/web/src/hooks/use-hero-animation.ts (GSAP + ScrollTrigger)
            │    ├── apps/web/src/lib/hero-config.ts (7 مواقع V-shape ثابتة)
            │    ├── apps/web/src/lib/images.ts (7 صور v-shape + 12 صورة محيطة)
            │    ├── apps/web/src/components/VideoTextMask.tsx (الجذر — يستخدم logger)
            │    ├── apps/web/src/components/IntroVideoModal.tsx (الجذر)
            │    └── apps/web/src/components/figma/ImageWithFallback.tsx
            └── apps/web/src/components/AppGrid.tsx (يستخدم platformApps من apps.config)
```

**كل كارت من السبعة** يُربط بـ `/ui` عبر `<Link href="/ui">` (السطر 92 في HeroAnimation.tsx).

---

## 2. الاكتشافات المؤكدة قرائياً

### 🟢 F-1: `/ui` route غير موجود على الإطلاق

**الدليل:**
- `apps/web/src/app/(main)/ui/` يحتوي على: `components/`, `pages/`, `tokens/`, `index.ts` — لا غير
- لا يوجد `page.tsx` ولا `layout.tsx` ولا `route.ts` تحت `(main)/ui/`
- الـ `index.ts` يصدّر design system من Figma فقط، ليس Next.js route

**الأثر:**
- النقر على أي كارت من السبعة في HeroAnimation → **404 Not Found**
- المنطقة الموعودة "صفحة فيها كل صفحات المنصة" غير قائمة

**التناقض الذاتي في الكود:**
- `apps.config.ts` السطر 27-29 يقول: "أي إضافة أو إزالة هنا تؤثر على صفحة مشغّل التطبيقات (/ui)" — لكن لا /ui موجود
- `apps.config.ts` السطر 233 يقول: "12 بطاقة حول الهيرو في /ui" — لكن لا /ui موجود

الـ /ui كان مخططاً لكن لم يُنفَّذ. الكروت السبعة تُرسل إلى route وهمي.

---

### 🟢 F-2: تكرار غير متناسق في ملفات الفيديو

يوجد ملفان لكل من:

| المسار في root | المسار في shared/ | المختلف |
|---|---|---|
| `components/VideoTextMask.tsx` | `components/shared/VideoTextMask.tsx` | الجذر يستخدم `createModuleLogger`، shared/ يستخدم `console.warn` + يضيف `tabIndex={-1}` و `aria-hidden` |
| `components/IntroVideoModal.tsx` | `components/shared/IntroVideoModal.tsx` | يحتاج فحص مستقل |

**HeroAnimation.tsx السطر 11 و 19:**
```typescript
import { VideoTextMask } from "./VideoTextMask";       // ← الجذر
import("./IntroVideoModal").then(...)                 // ← الجذر
```

أي يستخدم نسختي **الجذر**. النسخة في `shared/` ميتة (لا تُستَورَد من HeroAnimation) — لكنها قد تُستَورَد من ملف آخر مفصلية.

**الأثر:** ليس bug مباشر، لكنه **مديونية تقنية حقيقية** قد تنفجر عند ترقيات لاحقة عندما يُحدِّث المطور نسخة دون الأخرى.

---

### 🟢 F-3: عدم تطابق نمط مفاتيح `HERO_CARD_IMAGE_STYLES`

**HeroAnimation.tsx السطر 29-34:**
```typescript
const HERO_CARD_IMAGE_STYLES: Record<string, CSSProperties> = {
  "/assets/v-shape/V-Shape-3.jpeg": {       // ← V كبيرة
    objectFit: "contain",
    backgroundColor: "rgba(5, 5, 5, 0.9)",
  },
};
```

**lib/images.ts السطر 5-11:**
```typescript
const images: string[] = [
  "/assets/v-shape/v-shape-card-1.png",     // ← v صغيرة، أسماء مختلفة
  "/assets/v-shape/v-shape-card-2.png",
  ...
];
```

**الأثر:** الـ override style **لا يُطبَّق على أي صورة فعلية**. الكود يحاول معاملة استثنائية لـ `V-Shape-3.jpeg` لكن لا توجد صورة بهذا الاسم. كود ميت ومُضلِّل.

---

### 🟢 F-4: `gsap.registerPlugin(ScrollTrigger)` في module-level

**use-hero-animation.ts السطر 9:**
```typescript
gsap.registerPlugin(ScrollTrigger);
```

التسجيل يحدث عند **أول استيراد للملف** على client. لا مشكلة وظيفية واضحة (الـ `"use client"` يمنع تشغيله على SSR)، لكنه يُسجَّل حتى لو لم يُستخدَم. مديونية تقنية صغيرة، **ليست السبب الجذري**.

---

### 🟢 F-5: تناقض بين `transform` من CSS و GSAP

**globals.css السطر 338-340:**
```css
.hero-vcard {
  transform: translate(-50%, -50%);
}
```

**use-hero-animation.ts السطر 79-81 + 91-101:**
```javascript
phase3Images.forEach((img) => {
  gsap.set(img, { willChange: "transform, opacity" });
});

tl.fromTo(
  img,
  { top: "130%", left: "75%", x: 0, y: 0, rotation: 0, opacity: 0 },
  {
    top: "20%",
    left: "90%",
    opacity: 1,
    duration: 0.7,
    ease: "power2.out",
    force3D: true,            // ← يكتب matrix3d
  },
  2.5 + staggerDelay
);
```

GSAP بـ `force3D: true` يكتب `transform: matrix(...)` على inline style، **مما يهزم الـ CSS `translate(-50%, -50%)`**.

**هذا يفسّر `transform: matrix(1, 0, 0, 1, -1.25, -1.25)` المرصودة في DevTools:**
- GSAP يكتب transform يحتوي translation 1.25px فقط (نصف border 2.5px)
- الـ CSS `translate(-50%, -50%)` المُصمَّم لتوسيط الكارت **يُلغى**
- الكارت في `left: 2397.5px` (= 90% × 2664px) **بدون** translation للوسط

**النتيجة الحسابية الدقيقة:**
- viewport عرض المستخدم ≈ 2664px
- `left: 90%` = 2397.6px (يطابق `2397.5px` المرصودة ±1px)
- بدون `translate(-50%, -50%)`، الجانب الأيسر للكارت في 2397.5px
- مع cardWidth=190px، الكارت يمتد من 2397.5 → 2587.5px
- الحافة اليمنى للشاشة في 2664px → الكارت 77px من الحافة اليمنى

**هذا تفسير قرائي للموقع المرصود لكن لا يفسّر لماذا كل الكروت السبعة في نفس الموقع.**

---

### 🟢 F-6: عدم تطابق الفئات بين HeroAnimation.tsx و globals.css

العديد من الـ classes المستخدمة في HeroAnimation.tsx **لا توجد** في globals.css:

| Class المستخدمة في JSX | موجودة في CSS؟ |
|---|---|
| `hero-animation-root` | ✅ نعم (السطر 209) |
| `hero-vcard` | ✅ نعم (السطر 338) |
| `hero-card-sheen` | ✅ نعم (السطر 372) |
| `hero-main-title-fixed` | ✅ نعم (السطر 268) |
| `card-elite` | ✅ نعم (السطر 388) |
| `phase-3-img` | ❌ لا |
| `v-shape-container` | ❌ لا |
| `v-shape-cards-layer` | ❌ لا |
| `video-mask-wrapper` | ❌ لا |
| `hero-cta` | ❌ لا |
| `fixed-header` | ❌ لا |
| `scene-container` | ❌ لا |
| `frozen-container` | ❌ لا |
| `unified-entity` | ❌ لا |
| `main-content-wrapper` | ❌ لا |
| `text-content-wrapper` | ❌ لا |
| `dedication-wrapper` | ❌ لا |
| `phase-5-wrapper` | ❌ لا |
| `text-overlay-container` | ❌ لا |

**الأثر:** هذه الـ classes تُستخدم كـ **GSAP selectors فقط** (لـ `tl.to(".phase-3-img", ...)`). لا تأثير CSS، لذا لا styling مفقود من المستخدم. **لكن** هذا يجعل HeroAnimation يعتمد على GSAP بالكامل لأي تموضع — لو فشل GSAP، لا fallback CSS.

---

### 🟢 F-7: ضغط `desktop-web-app` على عرض الـ body

**globals.css السطر 178-189:**
```css
html {
  min-width: var(--desktop-app-min-width);     /* 1280px */
}

body.desktop-web-app {
  min-width: var(--desktop-app-min-width);     /* 1280px */
  overflow-x: auto;
}

body.desktop-web-app > * {
  min-width: var(--desktop-app-min-width);     /* 1280px */
}
```

**desktop-shell.ts السطر 13-14:**
```typescript
export const DESKTOP_WEB_APP_MIN_WIDTH_PX = 1280;
export const DESKTOP_WEB_APP_BODY_CLASS = "desktop-web-app";
```

**root layout.tsx السطر 57-59:**
```tsx
<body className={`${DESKTOP_WEB_APP_BODY_CLASS} ${cairo.className} antialiased`}>
```

**الأثر:**
- على شاشة عريضة (2664px): الـ body يساوي 2664px، الـ html يساوي 2664px
- GSAP يحسب `left: 90%` بالنسبة لـ container parent
- الـ container parent (`hero-animation-root`) هو `relative overflow-hidden` بدون عرض صريح → يساوي عرض الـ main → 2664px
- النتيجة: `90% = 2397.6px` ✓ يطابق المرصود

**ليس bug بحد ذاته**، لكنه يفسّر لماذا الـ animation يبدو "بعيد جداً" على شاشات فوق 1920px.

---

### 🟢 F-8: HeroAnimation يستخدم triggerRef بارتفاع `h-screen` فقط مع `end: "+=5200"`

**HeroAnimation.tsx السطر 162-164:**
```tsx
<div
  ref={triggerRef}
  className="h-screen w-full flex flex-col items-center justify-center"
>
```

**use-hero-animation.ts السطر 189-200:**
```javascript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: triggerRef.current,
    start: "top top",
    end: "+=5200",       // ← 5200px من scroll بعد البداية
    scrub: 1.2,
    pin: true,
    anticipatePin: 1,
    id: "hero-scroll",
    invalidateOnRefresh: true,
  },
});
```

الـ trigger له ارتفاع `h-screen` (100vh) فقط، والـ container الأب لـ HeroAnimation له `relative overflow-hidden` بدون ارتفاع صريح.

**الأثر:**
- ScrollTrigger يثبّت (pin) الـ trigger ويتطلب 5200px scroll
- إذا الـ container الأب لا يستطيع توفير 5200px scroll height (لأن `overflow-hidden`)، الـ pin قد يعمل لكن الـ progress الفعلي يعتمد على body scroll
- على page.tsx، الـ main له `overflow-hidden` السطر 25 → يحجب scroll body
- النتيجة: ScrollTrigger يكون في حالة غير محددة

**هذا فرضية محتملة قوية للفشل الحقيقي لكنها تحتاج إثبات runtime.**

---

### 🟢 F-9: SecurityGuard يحجب F12 و ContextMenu في الإنتاج

**SecurityGuard.tsx السطر 6-37:**
```typescript
useEffect(() => {
  if (process.env.NODE_ENV === "production") {
    document.addEventListener("contextmenu", handleContextMenu);  // يمنع right-click
    document.addEventListener("keydown", handleKeyDown);          // يمنع F12 + Ctrl+Shift+I
    ...
  }
}, []);
```

**الأثر:**
- لا يحمي من DevTools الحقيقي (F12 محظور لكن المتصفح يفتح DevTools من قائمته)
- **يعرقل تشخيصك** كمالك للموقع
- لا يحجب JavaScript ولا inspection من الـ Sources panel
- مع وجود source maps الإنتاجية (`productionBrowserSourceMaps: true` في next.config.mjs السطر 111)، الكود الأصلي **مكشوف بالكامل**

**ليس السبب الجذري، لكنه يفسّر صعوبة فحصك السابق.**

---

### 🟢 F-10: AppGrid يستخدم routes حقيقية، HeroAnimation لا

**AppGrid.tsx (يُحمَّل عند `showApps=true`):**
- يستخدم `platformApps` من `apps.config.ts`
- كل path هو route موجود (تحققت من ~16 path → 15 موجود فعلياً، `/brainstorm` فقط معطّل)

**HeroAnimation.tsx (يُحمَّل عند `showApps=false`، الحالة الافتراضية):**
- كل الكروت السبعة → `/ui` (غير موجود)

**هذا يعني:** في الحالة الافتراضية للصفحة الرئيسية (HeroAnimation)، كل النقرات على V-cards مكسورة. التطبيق الفعلي يعتمد على الزر "الأدوات" في الـ nav (السطر 39-46 في page.tsx) لتفعيل AppGrid.

---

## 3. الفرضيات المُستبعَدة من V1

| الفرضية في V1 | الحالة الآن |
|---|---|
| ⚪ `COEP credentialless` يحجب فيديو Pixabay | **مُستبعَدة** — الفيديو يعمل (دليل: فيديو المستخدم) |
| ⚪ `videoNetworkState: 2, readyState: 0` دائم | **مُستبعَدة** — كانت قراءة لحظية واحدة |
| ⚪ الفيديو هو السبب الجذري | **مُستبعَدة** — الفيديو ليس له علاقة |
| ⚪ rollback لسطرين يحل المشكلة | **مُستبعَدة** — لن يحل شيئاً |

---

## 4. الفرضيات الباقية تحتاج إثبات runtime

### 🟡 H-1: ScrollTrigger pin يفشل بسبب `overflow-hidden` على main

`page.tsx` السطر 25 يضع `overflow-hidden` على `<main>`. هذا يمنع scroll body، فلا يوجد scroll حدث لـ ScrollTrigger يتقدم به. الـ timeline تظل عند `t=0` بشكل دائم.

**كيفية الإثبات:** فحص body computed style، أو محاولة scroll مع تتبع `ScrollTrigger.getById("hero-scroll").progress`.

### 🟡 H-2: `useLayoutEffect` يحتاج DOM متاح فعلياً عند التشغيل الأول

`use-hero-animation.ts` السطر 178-180:
```typescript
const [responsiveValues] = useState<ResponsiveConfig>(() =>
  heroConfig.getResponsiveValues(DEFAULT_DESKTOP_WIDTH)
);
```

يستخدم `DEFAULT_DESKTOP_WIDTH = 1280` ثابت، **لا يأخذ في الاعتبار العرض الفعلي**. على شاشة 2664px، الـ animation يفترض 1280px عرض. هذا قد يجعل النسب المئوية تتفاعل بشكل غير متوقع مع viewport عريض.

### 🟡 H-3: `force3D: true` على كل الـ animations يهزم الـ CSS centering

كما في F-5، الـ matrix transform يهزم `translate(-50%, -50%)`. الإصلاح: إما إزالة `force3D` أو دمج التحويل (xPercent: -50, yPercent: -50) في كل GSAP `to/fromTo` calls.

---

## 5. السبب الجذري الأكثر احتمالاً (لكن غير مثبت runtime)

### الفرضية المركَّبة:

1. **`page.tsx` يضع `overflow-hidden` على main** → لا يوجد body scroll → ScrollTrigger لا يتقدم
2. **GSAP `force3D: true` يكتب matrix transform** → يهزم `.hero-vcard { transform: translate(-50%, -50%); }` → الكارت في الموقع المُحسَب بدون centering
3. **شاشة 2664px** + `left: 90%` = 2397.6px → الكارت يبدو "مكدّس" في يمين الشاشة (أو يسار بسبب RTL)

**النتيجة المرئية المطابقة للمرصود:**
- الكروت في موقع GSAP الأخير الذي طبّقه قبل أن يتوقف
- بدون CSS centering لأن GSAP أعاد كتابة الـ transform
- على شاشة عريضة، النسب المئوية تنتج قيم pixel عالية

**هل هذا السبب نهائي؟** **لا**. حتى أُثبت H-1 و H-3 على runtime.

---

## 6. القرار

**لا أقترح أي إصلاح الآن.** التقرير V1 كان قافزاً للحل. هذه المرة:

1. تم استبعاد فرضية الفيديو/COEP بدليل قاطع (فيديو المستخدم).
2. تم تحديد F-1 (لا route لـ /ui) كـ bug مؤكد قرائياً يجب إصلاحه بشكل منفصل عن الـ animation.
3. تم تحديد H-1 و H-3 كفرضيتين قويتين لكسر الـ animation، لكنهما تحتاجان إثبات runtime.

**ما يحتاج المستخدم القيام به (إن أراد التحقق دون فتح DevTools):**

- يمكنني إضافة `console.log` مؤقت في useLayoutEffect لطباعة `ScrollTrigger.getById("hero-scroll").progress` كل ثانية
- يمكنني تعليق `force3D: true` مؤقتاً وبناء preview للتحقق
- يمكنني إنشاء `(main)/ui/page.tsx` يعرض platformApps لإصلاح bug الـ navigation (مستقل عن الـ animation)

**في انتظار قرارك** — أيها تريد، أو لا تريد أياً منها.

---

## 7. التزام بـ AGENTS.md

- لم أعدّل أي ملف.
- لم أُضعِف أي قاعدة فحص.
- لم أفترض من git أو commits.
- التقرير قائم على قراءة 17 ملفاً مذكوراً صراحة بالسطور.
- تمييز صريح بين المؤكد والمشكوك فيه والمُستبعَد.
- التقرير V1 معترف به كخطأ في القسم 3.

---

## 8. اعتراف نهائي

كنت في V1 ادعيت سبباً جذرياً بناءً على رقمين لحظيين من DevTools. أنت رفعت فيديو يثبت أن الـ video يعمل، وألغى ادعائي. هذا التقرير V2 يتعامل مع هذا الخطأ صراحة بدلاً من إخفائه.

السبب الجذري الحقيقي **غير مثبت بعد**. أقرب فرضية هي تركيب F-5 + F-8 + H-1 (overflow-hidden + force3D + screen width)، لكنني لن أعلنها سبباً نهائياً قبل التحقق الفعلي.
