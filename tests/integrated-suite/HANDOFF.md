# HANDOFF — حزمة الاختبارات المتكاملة

## للوكيل التنفيذ

هذا الـ brief موجه لوكيل التنفيذ الذي سيشغّل الحزمة. اقرأه بالكامل قبل أي خطوة.

## الحقائق التشغيلية (3-7)

1. **حزمة الاختبارات هذه لا تعدّل ولا تضعف أي فحص قائم** — قاعدة `AGENTS.md` المتعلقة بمنع إضعاف ملفات الفحص والتحقق مقروءة ومثبتة في كل ملفاتها.
2. مدير الحزم الرسمي الوحيد هو `pnpm@10.33.3`. الـ shell الرسمي على ويندوز هو PowerShell.
3. التطبيقات هي `@the-copy/web` على المنفذ `5000` و `@the-copy/backend` على `3001` — كما هو مثبت في [output/session-state.md](../../output/session-state.md).
4. البنية القائمة تشمل: 4 ملفات Playwright config، 3 ملفات vitest config، Cypress، وسلسلة `pnpm security:*` كاملة. الحزمة هذه تستدعيها ولا تستبدلها.
5. كل تشغيل يكتب مخرجاته تحت `artifacts/integrated-suite/<run-id>/`، وأي قرار Go/No-Go يكتب في `06-pre-deployment/rc-decision.md`.
6. أي فشل في فحص الأمان (`01-security`) يحجب البقية إلا بإذن صريح موثَّق في `output/round-notes.md`.

## ترتيب التنفيذ الإلزامي

```text
1. agent:bootstrap     (إثبات قراءة العقود)
2. infra:up            (إذا كانت اختبارات تتطلب backend/db/qdrant/weaviate)
3. 01-security
4. 02-performance      (يحتاج بيئة staging؛ في dev يخفض الحمل)
5. 03-compatibility
6. 04-regression
7. 05-exploratory      (يدوي — يُترك للمختبر البشري)
8. 06-pre-deployment   (smoke → system → UAT → RC decision)
9. agent:persistent-memory:session:close
10. agent:verify
```

## أوامر يمكن للوكيل تشغيلها مباشرة

```powershell
# تشغيل الحزمة بالكامل
pwsh tests/integrated-suite/run-suite.ps1 -All

# تشغيل حزمة واحدة
pwsh tests/integrated-suite/run-suite.ps1 -Package 01-security

# تشغيل سيناريو محدد
pwsh tests/integrated-suite/run-suite.ps1 -Package 02-performance -Scenario spike

# قراءة الـ manifest الآلي
Get-Content tests/integrated-suite/manifest.json | ConvertFrom-Json
```

## المتطلبات قبل التشغيل

| المتطلب | كيف تتحقق |
|---|---|
| `pnpm install` تم | `pnpm -v` ينجح |
| `infra:up` تشغيل قواعد البيانات | `pnpm infra:status` |
| تثبيت متصفحات Playwright | `pnpm --filter @the-copy/web exec playwright install --with-deps` |
| تثبيت `k6` للأداء | `k6 version` (Windows: `winget install k6`) |
| تثبيت `semgrep`, `trivy`, `gitleaks`, `snyk` | اختياري — السكريبت يكتشف الغياب ويسجّل skip |
| متغيرات البيئة | `pnpm security:env:check` |

## نقاط فشل معروفة (وكيف يتعامل معها الوكيل)

- إذا غاب أحد الأدوات (k6/semgrep/trivy)، السكربت يسجل `tool-missing` في تقرير الحزمة ويكمل البقية. **الحزمة لا تُسقط إذا غابت أدوات — لكن RC decision في 06 لا تمر إلا بتشغيل فعلي.**
- إذا فشل `infra:up`، حزم 02/03/04 لا تستطيع الاتصال بالـ backend. يسجل ذلك ويُحجب القرار النهائي.
- إذا تجاوز الأداء العتبات في `02-performance/thresholds.json`، يفشل سيناريو الأداء فشلاً صريحاً ولا يُتجاوز.

## ما لا يجب على الوكيل فعله

- لا تعدّل أي ملف داخل `apps/web/playwright.*.ts` أو `vitest.config.ts` لتمرير اختبار.
- لا تخفّض العتبات في `thresholds.json` أو `policy.json` لتمرير حزمة.
- لا تتجاوز فشلاً أمنياً بإضافة exception. القاعدة الحاكمة في `AGENTS.md`: أي تخفيف للفحص محظور حظراً قاطعاً.
- لا تكتب تقرير "نجاح" قبل وجود artifact فعلي في `artifacts/integrated-suite/<run-id>/`.

## handoff brief النهائي المطلوب

عند انتهاء التشغيل، يجب أن ينتج الوكيل ملفًا واحدًا:

```text
artifacts/integrated-suite/<run-id>/SUMMARY.md
```

يحتوي:
1. ما الذي تغيّر (نتائج كل حزمة)
2. ما الذي ثبت مباشرة (تشغيل فعلي مع artifact)
3. ما الذي بقي مفتوحاً (failures/skips/blockers)
4. هل استلزم الأمر تحديث `output/session-state.md` أو `output/round-notes.md`
5. قرار Go/No-Go للإصدار

## مراجع

- [INDEX.md](./INDEX.md) — خريطة الحزمة
- [manifest.json](./manifest.json) — الواجهة الآلية
- [run-suite.ps1](./run-suite.ps1) — الـ orchestrator
- [AGENTS.md](../../AGENTS.md) — العقد الأعلى
