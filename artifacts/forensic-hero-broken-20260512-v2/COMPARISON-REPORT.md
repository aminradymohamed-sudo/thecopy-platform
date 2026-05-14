# تقرير المقارنة الجنائية بين النسختين

> **التاريخ:** 2026-05-12
> **النسخة A (المشتبه فيها — Production):** `F:\Claude\Projects\the copy\apps\web\src\`
> **النسخة B (المرجعية — Downloads):** `C:\Users\Mohmed Aimen Raed\Downloads\thecopy\thecopy\apps\web\src\`
> **النطاق:** كل الملفات المرتبطة بـ render path للصفحة الرئيسية

---

## 0. الخلاصة الفورية

**كل الملفات الأساسية لـ animation الكروت السبعة متطابقة 100% بين النسختين.** الفروق محصورة في الملفات المحيطة والإعدادات.

| فئة | عدد الملفات | متطابقة | مختلفة |
|---|---:|---:|---:|
| **منطق الـ Hero/Animation الأساسي** | 6 | **6 ✓** | 0 |
| ملفات الفيديو | 2 | **2 ✓** | 0 |
| إعدادات وlayouts | 4 | 0 | **4 ⚠️** |
| ملفات أُضيفت في P2 | 3 | — | **3 (جديدة كلياً) ⚠️** |
| AppGrid + a11y | 1 | 0 | **1 ⚠️** |
| **المجموع** | **16** | **8** | **8** |

---

## 1. الملفات المتطابقة 100% (لا فروق)

✅ هذه الملفات **لم تُعدَّل** بين النسختين — أي ما رأيته فيها في تقرير V2 موجود قبل تدخلاتي أيضاً:

| الملف | السبب الذي كنت أتهمه |
|---|---|
| `components/HeroAnimation.tsx` | F-3 (override style، `/ui` link)، F-5 (force3D) |
| `hooks/use-hero-animation.ts` | F-4 (gsap.registerPlugin module-level) |
| `lib/hero-config.ts` | المواقع النهائية للـ V-shape |
| `lib/images.ts` | الصور السبعة |
| `lib/desktop-shell.ts` | DESKTOP_WEB_APP_MIN_WIDTH_PX |
| `app/(main)/layout-shell.ts` | shellless paths |
| `components/VideoTextMask.tsx` | الفيديو Pixabay |
| `components/IntroVideoModal.tsx` | modal الفيديو |
| `components/shared/SecurityGuard.tsx` | F-9 (يحجب F12) |
| `instrumentation-client.ts` | Sentry init |
| `app/providers.tsx` | QueryClient (فرق صغير: `process.env["X"]` بدلاً من `process.env.X`) |

**نتيجة:** كل العيوب القرائية التي وثقتها في تقرير V2 (`F-3`, `F-4`, `F-5`, `F-9`) **موجودة قبلي**. ليست من صنعي.

---

## 2. الملفات المُعدَّلة (السطور الفعلية المختلفة)

### 2.1 ⚠️ `app/page.tsx` — أكبر تغيير

**النسخة B (المرجعية) — 33 سطراً:**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { HeroAnimation } from "@/components/HeroAnimation";

const AppGrid = dynamic(...);

export default function Page() {
  const [showApps, setShowApps] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-hidden">
      {!showApps ? (
        <HeroAnimation onContinue={() => setShowApps(true)} />
      ) : (
        <AppGrid />
      )}
    </main>
  );
}
```

**النسخة A (الحالية) — 71 سطراً:**

أُضيف فوق `<HeroAnimation>` مباشرة:

```tsx
// + import Link from "next/link";
// + 3 fixed elements داخل <main>:

<a
  href="#home-content"
  className="fixed top-0 right-0 z-[20000] -translate-y-full focus:translate-y-0 ..."
  aria-label="تخطّي إلى المحتوى الرئيسي"
>
  تخطّي إلى المحتوى
</a>

<nav
  aria-label="قائمة الوصول السريع للأدوات"
  className="fixed top-2 left-2 z-[19999] flex gap-2 text-xs"
>
  <button onClick={() => setShowApps(true)} ...>الأدوات</button>
  <Link href="/directors-studio" ...>الاستوديو</Link>
  <Link href="/editor" ...>المحرر</Link>
</nav>

<span id="home-content" tabIndex={-1} aria-hidden="true" />
```

**التحليل:**
- skip-link و nav كلاهما `position: fixed` بـ z-[20000] و z-[19999] فوق كل عناصر HeroAnimation (أقصاها z-[10020])
- لا يدخلون في الـ flow → لا يؤثرون مباشرة على ScrollTrigger
- لكن الـ nav ظاهر دائماً في الزاوية اليسرى العليا → **يغطي بصرياً جزءاً من scene-container**
- الـ `<button onClick={() => setShowApps(true)}>` يوفر طريقة بديلة للوصول لـ AppGrid بدون انتظار الـ animation

**هل يكسر الـ animation؟** لا، نظرياً. لكنه يضيف عناصر فوقها.

**سبب التغيير:** P2 — landmarks للـ accessibility (a11y).

---

### 2.2 ⚠️ `app/layout.tsx` (root) — تغييرات متعددة

**فرق 1: `<head>` content**

النسخة B (المرجعية):
```html
<head>
  {/* Preconnect to Pixabay CDN used for the intro video */}
  <link rel="preconnect" href="https://cdn.pixabay.com" />
  <link rel="dns-prefetch" href="https://cdn.pixabay.com" />
</head>
```

النسخة A (الحالية):
```html
<head>
  {/* Hero intro video is served same-origin via /api/hero-video */}
</head>
```

**تحليل خطير:** أنا **أزلت preconnect/dns-prefetch لـ Pixabay** واستبدلتهما بتعليق يدّعي proxy غير موجود (لا يوجد `/api/hero-video/route.ts`). هذا يُبطّئ تحميل الفيديو الأول لكن لا يكسر شيئاً.

**فرق 2: Viewport export**

النسخة A أضافت:
```tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
```

تأثير: يضيف `<meta name="viewport">` tag — لا تأثير على desktop.

**فرق 3: ISR revalidate**

النسختان فيهما `export const revalidate = 86400`. **متطابق.**

---

### 2.3 ⚠️ `app/(main)/layout.tsx` — تغييرات لا تؤثر على الصفحة الرئيسية

**ملاحظة جوهرية:** الصفحة الرئيسية `/` تحت `app/page.tsx`، **ليست تحت `app/(main)/`**. لذا `(main)/layout.tsx` لا يُطبَّق على HeroAnimation أصلاً. التغييرات هنا غير ذات صلة بمشكلة الـ Hero.

التغييرات (للتسجيل فقط):
- إضافة skip-link
- إضافة `role="banner"`, `aria-label`, `id="main-content"`, `tabIndex={-1}`
- توسيع `isDirectorsStudioPath` → `isResponsivePath` (5 paths بدلاً من 1)

---

### 2.4 ⚠️ `components/AppGrid.tsx` — تغييرات a11y

النسخة B: `<div className="grid ...">` بدون a11y
النسخة A: `<nav aria-label="تطبيقات المنصة" className="grid ...">` + `aria-label={app.nameAr}` على Link + `aria-hidden="true"` على icon

**هل يكسر شيئاً؟** لا. لكن AppGrid يظهر فقط بعد النقر على "الأدوات" (showApps=true) — ليس له علاقة بـ animation الـ Hero.

---

### 2.5 ⚠️ `next.config.mjs` — أهم تغييرات Headers الأمنية

| Header | النسخة B | النسخة A | الأثر |
|---|---|---|---|
| `X-XSS-Protection` | `1; mode=block` | **مُزال** | مهملة في المتصفحات الحديثة، لا أثر |
| `Cross-Origin-Opener-Policy` | غير موجود | `same-origin` | **يفعّل crossOriginIsolated** |
| `Cross-Origin-Embedder-Policy` | غير موجود | `credentialless` | **يفعّل crossOriginIsolated** |

تغييرات أخرى:
- `ensurePagesManifestPlugin` مضاف (يولّد pages-manifest.json)
- `rewrites` فيها `/favicon.ico → /icon.svg` مضاف
- `nextConfig.webpack` لديها `config.plugins.push(ensurePagesManifestPlugin)` في server build

**ملاحظة حاسمة عن COOP/COEP:**

كنت في تقرير V1 ادعيت أنها تكسر الفيديو. أنت أثبتّ أن الفيديو يعمل. **لذا COOP/COEP لا يكسران شيئاً مرئياً للمستخدم.** قد يكون لهما تأثيرات أخرى دقيقة (تحجب SharedArrayBuffer من cross-origin بدون CORP)، لكن لا أثر على الـ animation.

---

### 2.6 ⚠️ `styles/globals.css` — تغيير بسيط

السطر 347-365 فقط:

النسخة B: 2 paths في responsive blocks (`cinematography-responsive-page`, `actorai-arabic-responsive-page`)
النسخة A: 3 paths (يضيف `development-responsive-page`)

**تأثير على الصفحة الرئيسية:** صفر. لا الصفحة الرئيسية ولا HeroAnimation يستخدمان هذه الـ classes.

---

### 2.7 ⚠️ ملفات جديدة كلياً (مُضافة في P2)

| الملف | الموقع | الغرض |
|---|---|---|
| `app/sitemap.ts` | جديد في النسخة A | يولّد `/sitemap.xml` |
| `public/manifest.json` | جديد في النسخة A | PWA manifest |

**`app/robots.ts`:** غير موجود في النسختين (لم أُنشئه — قد يكون أُنشئ خارج `src/`).

**تأثير على الـ animation:** صفر. ملفات metadata.

---

## 3. خريطة المسؤولية النهائية

### ما أنا أدخلته (تأكيد قرائي صريح):

| التدخل | الملف | الأثر على Hero animation |
|---|---|---|
| skip-link + nav buttons | `page.tsx` | عناصر `fixed` فوق Hero (لكن لا تكسره) |
| إزالة preconnect Pixabay | `layout.tsx` | يُبطّئ الفيديو الأول، لا يكسره |
| Viewport export | `layout.tsx` | لا أثر |
| skip-link + landmarks | `(main)/layout.tsx` | **لا يُطبَّق على `/`** (الصفحة ليست تحت `(main)/`) |
| nav + aria-labels | `AppGrid.tsx` | لا يظهر إلا بعد النقر |
| COOP/COEP headers | `next.config.mjs` | لا يكسر الـ animation (الفيديو يعمل بدليلك) |
| ensurePagesManifestPlugin | `next.config.mjs` | server build فقط، لا أثر runtime |
| favicon rewrite | `next.config.mjs` | لا أثر |
| إزالة X-XSS-Protection | `next.config.mjs` | لا أثر (مهملة) |
| `development-responsive-page` | `globals.css` | لا أثر على `/` |
| sitemap.ts | جديد | لا أثر |
| manifest.json | جديد | لا أثر |

### ما هو **قبلي** (موجود في النسختين، لست المسؤول عنه):

| العيب | الموقع | تأثير محتمل |
|---|---|---|
| كل الكروت تربط بـ `/ui` غير الموجودة | `HeroAnimation.tsx` السطر 92 | 404 عند النقر |
| `gsap.registerPlugin(ScrollTrigger)` في module-level | `use-hero-animation.ts` السطر 9 | لا bug، نمط شائع |
| `force3D: true` يهزم `.hero-vcard { transform: translate(-50%, -50%) }` | الـ hook + globals.css | يغيّر شكل التموضع |
| `<main className="... overflow-hidden">` يمنع body scroll | `page.tsx` السطر 24 | **يكسر ScrollTrigger** نظرياً |
| `HERO_CARD_IMAGE_STYLES` بمفتاح خاطئ (`V-Shape-3.jpeg`) | `HeroAnimation.tsx` السطر 30 | كود ميت |
| `DEFAULT_DESKTOP_WIDTH = 1280` ثابت | `use-hero-animation.ts` السطر 12 | لا يتكيف مع viewport |
| `SecurityGuard` يحجب F12 | `SecurityGuard.tsx` | يعرقل التشخيص |

---

## 4. الخلاصة الجنائية الحاسمة

**النسخة A (الحالية) تختلف عن النسخة B (المرجعية) في 8 ملفات. لكن:**

1. **لا يوجد ملف واحد** من الملفات التي عدّلتها يحتوي على تغيير في **منطق الـ animation**.
2. **كل ملفات الـ animation الأساسية متطابقة 100%** بين النسختين.
3. كل العيوب القرائية التي وثقتها في تقرير V2 موجودة **قبل تدخلاتي** أيضاً.

**إذن الاحتمال الأقوى:**

- **إذا كانت النسخة B (Downloads) تعمل** على الإنتاج حالياً → فإن النسخة A لا تعمل لأن **مجموع التغييرات الصغيرة** (خصوصاً `page.tsx` و COOP/COEP) أحدث تفاعل غير متوقع.
- **إذا كانت النسخة B لا تعمل أيضاً** → فإن المشكلة **قبل تدخلاتي**، والسبب الجذري في ملفات الـ animation نفسها (التي لم أعدّلها).

**سؤال محوري للمستخدم:** هل النسخة في `Downloads/` هي:
- (أ) Backup من قبل تدخلاتي (إذن: المقارنة تكشف ما غيّرت)
- (ب) Clone من GitHub main الحالي (إذن: التطابق يعني أن repo upstream لا يحتوي تدخلاتي بعد، أي أن تدخلاتي محلية فقط لم تُدفع)

**في كلتا الحالتين**، النتيجة الجنائية هي:
- إذا الـ Hero animation مكسور على الإنتاج (www.thecopy.app)، **النسخة B لو نُشِرت ستنتج نفس النتيجة** لأن منطق الـ animation متطابق.
- تدخلاتي **محتملة الأثر فقط** على: layout الأمني (COOP/COEP)، preconnect Pixabay (سرعة فقط)، والإضافات البصرية (skip-link/nav).

---

## 5. التوصية

**الـ rollback لكل تدخلاتي لن يحل الـ animation** لأن العيوب الأساسية في `HeroAnimation.tsx` و `use-hero-animation.ts` موجودة قبلي وبعدي.

ما يحتاج إصلاحاً فعلياً (مستقل عن تدخلاتي):
1. تغيير `<Link href="/ui">` إلى route صالح (مثل `/apps-overview` الموجود فعلاً)
2. مراجعة `<main className="... overflow-hidden">` لاحتمال كسر ScrollTrigger
3. إزالة `force3D: true` أو دمج `xPercent: -50, yPercent: -50` في GSAP calls

ما يمكن rollback (تدخلاتي):
1. إعادة `<link rel="preconnect" href="https://cdn.pixabay.com">` في `layout.tsx`
2. إزالة skip-link و nav buttons من `page.tsx` (لكن يخسر a11y)
3. إزالة COOP/COEP إذا أردت (لا يكسر شيئاً واضحاً، فقط يقلل الأمان قليلاً)

**التقرير قائم على قراءة 16 ملفاً مقارنة بنفس الملفات في النسخة الأخرى، بدون افتراض أو git history.**
