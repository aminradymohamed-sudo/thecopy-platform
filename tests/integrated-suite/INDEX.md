# حزمة الاختبارات المتكاملة — INDEX

## التعريف

`tests/integrated-suite/` هي حزمة الاختبارات الموحدة لما قبل النشر داخل مستودع `the copy`. تجمع تحت مظلة واحدة كل فئات الاختبار التي تثبت جاهزية الإصدار، وتعتمد على البنية القائمة (vitest, Playwright, Cypress, Snyk, Trivy, ZAP, Semgrep, Gitleaks, CodeQL) دون تعديلها أو استبدالها.

> **حظر صريح:** هذه الحزمة لا تعدّل ولا تضعف أي ملف فحص أو اختبار قائم. تضيف فقط فوقه. أي تشغيل لها بعد تعديل ملف فحص يجب أن يتبعه تشغيل فعلي للفحص المتأثر — كما تنص [AGENTS.md](../../AGENTS.md).

## الحزم الفرعية

| الترتيب | الحزمة | المسار | الأداة الأساسية | الحالة المتوقعة |
|---|---|---|---|---|
| 01 | الأمان | [01-security/](./01-security/) | Snyk · Trivy · ZAP · Semgrep · Gitleaks · CodeQL | يجب اجتيازها قبل أي حزمة لاحقة |
| 02 | الأداء | [02-performance/](./02-performance/) | k6 + Lighthouse CI (web-vitals) | تُشغَّل في بيئة staging مطابقة للإنتاج |
| 03 | التوافق + الوصولية | [03-compatibility/](./03-compatibility/) | Playwright (متعدد المتصفحات والأجهزة) + axe-core | تُشغَّل بعد اجتياز الانحدار |
| 04 | الانحدار النهائي | [04-regression/](./04-regression/) | Playwright + Vitest | تُشغَّل قبل قرار الإصدار |
| 05 | الاستكشاف الآلي | [05-exploratory/](./05-exploratory/) | Playwright + agentic field-test | **آلي بالكامل** (يستفيد من نمط `artifacts/art-director/run-art-director-field-test.cjs`) |
| 06 | ما قبل النشر | [06-pre-deployment/](./06-pre-deployment/) | Playwright (smoke + system) + UAT/RC checklists | البوابة النهائية Go/No-Go |

## التسلسل المرجعي

```text
01-security  →  02-performance  →  03-compatibility  →  04-regression  →  05-exploratory  →  06-pre-deployment
```

أي فشل في حزمة سابقة يحجب الحزم اللاحقة، إلا إذا وُثِّق الفشل في `output/round-notes.md` كاستثناء صريح بقرار صاحب المنتج.

## نقاط الاتصال مع البنية القائمة

| القائم | كيف تستخدمه الحزمة |
|---|---|
| [scripts/security/zap-baseline.sh](../../scripts/security/zap-baseline.sh) | يُستدعى من `01-security/dast/run.ps1` كما هو، ثم تُضاف فوقه سيناريوهات DAST مصادَقة |
| [scripts/security/trivy-scan.sh](../../scripts/security/trivy-scan.sh) | يُستدعى من `01-security/deps/run.ps1` |
| `pnpm security:semgrep` / `security:secrets` / `security:deps` | تُستدعى كأوامر pnpm رسمية ضمن `01-security/*/run.ps1` |
| [apps/web/lighthouserc.json](../../apps/web/lighthouserc.json) | source-of-truth لـ web-vitals — يُستهلَك من `02-performance/web-vitals/run.ps1` بدون تعديل |
| `apps/web/playwright.*.config.ts` (4 ملفات) | لا تُعدَّل. حزم 03/04/05/06 تُعرِّف configs مستقلة في مجلداتها ذاتيًا |
| [apps/web/tests/e2e/](../../apps/web/tests/e2e/) | تظل مرجع الـ e2e للميزات. حزمة 04 تجمع منها مجموعة critical-paths عبر استدعاء |
| `.github/workflows/codeql.yml` و `security-audit.yml` | تظل البوابة الأساسية في CI. الحزمة هذه = إعادة تشغيل محلي + امتداد |
| [artifacts/art-director/](../../artifacts/art-director/) | baseline لـ a11y/contrast/keyboard/sessions — تُقارَن نتائج الجولة الجديدة بها |
| [artifacts/editor-e2e/latest-report.json](../../artifacts/editor-e2e/latest-report.json) | baseline لـ editor-explore في 05-exploratory |
| `node_modules/axe-core` و `@axe-core/playwright` | يُستهلَك من `03-compatibility/accessibility/` |

## المخرجات (Artifacts)

كل تشغيل للحزمة ينتج تحت:

```text
artifacts/integrated-suite/<run-id>/
├── 01-security/
│   ├── sast/semgrep.json
│   ├── sast/codeql-summary.md
│   ├── dast/zap-report.html
│   ├── deps/audit.json
│   └── pentest/findings.md
├── 02-performance/
│   ├── load.json
│   ├── stress.json
│   ├── soak.json
│   ├── spike.json
│   └── scalability.json
├── 03-compatibility/
│   ├── browser-matrix.json
│   └── playwright-report/
├── 04-regression/
│   └── playwright-report/
├── 05-exploratory/
│   └── session-<n>.md
├── 06-pre-deployment/
│   ├── smoke/playwright-report/
│   ├── system/playwright-report/
│   └── rc-decision.md
└── SUMMARY.md
```

## التشغيل

```text
pwsh tests/integrated-suite/run-suite.ps1 -All
pwsh tests/integrated-suite/run-suite.ps1 -Package 01-security
pwsh tests/integrated-suite/run-suite.ps1 -Package 02-performance -Scenario load
```

التفاصيل في [run-suite.ps1](./run-suite.ps1) و [HANDOFF.md](./HANDOFF.md).

## الـ manifest الآلي

[manifest.json](./manifest.json) — الواجهة الآلية الوحيدة التي يقرأها وكيل التنفيذ. لا يقرأ هذا الملف بل يقرأ الـ manifest.

## مراجع حاكمة

- [AGENTS.md](../../AGENTS.md) — قاعدة منع إضعاف الفحوصات
- [.repo-agent/OPERATING-CONTRACT.md](../../.repo-agent/OPERATING-CONTRACT.md)
- [output/session-state.md](../../output/session-state.md) — مصدر الحقيقة التشغيلية
