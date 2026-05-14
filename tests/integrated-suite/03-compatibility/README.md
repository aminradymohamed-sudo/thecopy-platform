# 03 — اختبارات التوافق (Compatibility)

## الهدف

التحقق من أن التطبيق يعمل بشكل صحيح عبر:

| البُعد | التغطية |
|---|---|
| Cross-Browser | Chromium · Firefox · WebKit (Safari) |
| Cross-Device | Desktop (1920×1080, 1440×900) · Tablet (iPad) · Mobile (iPhone, Pixel) |
| Cross-OS | Windows · macOS · iOS · Android (عبر emulation + matrix CI) |

> **ملاحظة من سياسة المستودع:** قاعدة `OPERATING-CONTRACT.md` تنص على أن المرجع البصري هو سطح المكتب فقط، ولا يُسمح بـ mobile fallback يغيّر الشكل المرجعي. لذلك اختبارات هذه الحزمة تتحقق من **التشغيل الصحيح** عند ضيق المساحة (تمرير، إطار ثابت، حواف محجوزة)، **لا** من تخطيط جوال مستقل.

## الأداة

Playwright مع device emulation و browser channels. هذه الحزمة لها `playwright.config.ts` خاص بها لا يعدّل أي config قائم.

## المتطلبات

```powershell
pnpm --filter @the-copy/web exec playwright install --with-deps
```

## التشغيل

```powershell
pwsh tests/integrated-suite/03-compatibility/run.ps1 -ArtifactsDir artifacts/integrated-suite/<run-id>/03-compatibility

# تشغيل project محدد
pwsh tests/integrated-suite/03-compatibility/run.ps1 -Project chromium-desktop
pwsh tests/integrated-suite/03-compatibility/run.ps1 -Project webkit-mobile
```

## المصفوفة

[matrix.json](./matrix.json) — مصفوفة المتصفح × الجهاز × OS. تُقرأ من قبل CI لتوزيع التشغيل على runners مختلفة.

## الاختبارات

| الملف | المغطّى |
|---|---|
| [tests/critical-views.spec.ts](./tests/critical-views.spec.ts) | الصفحات الأساسية (هيرو، editor، dashboard) — لا تنكسر بصرياً |
| [tests/cross-browser.spec.ts](./tests/cross-browser.spec.ts) | فروقات JS/CSS بين المتصفحات (clipboard, pointer, RTL) |
| [tests/cross-device.spec.ts](./tests/cross-device.spec.ts) | viewport scrolling، الإطار الثابت لا يكسر التكوين المرجعي |

## القرارات

- لا screenshot diffs استباقية (snapshots) — تخفض القدرة على كشف الانحدارات بمجرد تحديث الـ snapshot.
- بدلاً عنها: assertions على الأبعاد، الـ box model، وعدد العناصر المرئية.
