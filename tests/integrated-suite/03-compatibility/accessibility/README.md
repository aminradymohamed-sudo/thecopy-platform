# 03-compatibility/accessibility — axe-core a11y scans

## التعريف

اختبارات إمكانية الوصول (WCAG 2.1 AA) عبر `axe-core`. تتقاطع مع التوافق لأن a11y issues كثيراً ما تكون أيضاً browser-specific.

## ما يستخدمه

- `axe-core` (موجود في node_modules)
- `@axe-core/playwright` (يثبَّت تلقائياً عند الحاجة)
- نمط من [artifacts/art-director/run-art-director-field-test.cjs](../../../../artifacts/art-director/run-art-director-field-test.cjs)

## النتائج المتوقعة (مرجعية لـ baseline)

تقارير سابقة موجودة كـ baseline:

```text
artifacts/art-director/a11y-report.json
artifacts/art-director/a11y-buttons.json
artifacts/art-director/a11y-inputs.json
artifacts/art-director/contrast-report.json
artifacts/art-director/keyboard-trace.json
artifacts/art-director/screen-reader-semantics.json
output/playwright/BREAKAPP/axe-report.json
```

> هذه التقارير **ليست قواعد** — هي baseline للمقارنة. أي تدهور في عدد violations يجب أن يفشّل الجولة.

## المسارات المختبَرة

كل المسارات الحرجة من [04-regression/critical-paths.json](../../04-regression/critical-paths.json):

- `/`
- `/editor`
- `/cinematography-studio`
- `/breakdown`
- `/actorai-arabic`
- `/art-director`
- `/brain-storm`

## التشغيل

```powershell
pwsh tests/integrated-suite/03-compatibility/accessibility/run.ps1 -ArtifactsDir <dir>
```

## ما يفحصه

- WCAG 2.1 A + AA rules
- color-contrast (≥ 4.5:1 للنص العادي، ≥ 3:1 للكبير)
- keyboard navigation traces
- ARIA roles & labels
- form input labels
- heading hierarchy
- landmark regions
- alt text for images
