# EXECUTOR RUNBOOK — للوكيل المنفِّذ

> اقرأ هذا الملف قبل أي تشغيل. هو الـ runbook التشغيلي الأقصر — للتفاصيل ارجع لـ [HANDOFF.md](./HANDOFF.md).

## TL;DR

```powershell
# 1. تأكد من البيئة
pnpm agent:bootstrap
pnpm infra:up

# 2. شغّل الحزمة كاملة
pwsh tests/integrated-suite/run-suite.ps1 -All

# 3. اقرأ النتيجة
Get-Content artifacts/integrated-suite/<run-id>/SUMMARY.md

# 4. أغلق الجولة
pnpm agent:persistent-memory:session:close
pnpm agent:verify
```

## الترتيب الإلزامي للتشغيل

| # | الخطوة | الأمر | متى يُتجاوز |
|---|---|---|---|
| 1 | bootstrap | `pnpm agent:bootstrap` | أبداً — لا يُتجاوز |
| 2 | infra | `pnpm infra:up` | إذا لم تتطلب الحزم backend |
| 3 | dev servers | `pnpm dev:all` (background) | إذا staging URL محدد |
| 4 | 01-security | `pwsh tests/integrated-suite/run-suite.ps1 -Package 01-security` | لا يُتجاوز إلا بإذن صريح موثَّق |
| 5 | 02-performance | `pwsh tests/integrated-suite/run-suite.ps1 -Package 02-performance` | إذا غاب k6 (يُسجَّل skip) |
| 6 | 03-compatibility | `pwsh tests/integrated-suite/run-suite.ps1 -Package 03-compatibility` | لا يُتجاوز |
| 7 | 04-regression | `pwsh tests/integrated-suite/run-suite.ps1 -Package 04-regression` | لا يُتجاوز |
| 8 | 05-exploratory | تشغيل runner لإنشاء القوالب → مختبر بشري | لا يُتجاوز قبل RC |
| 9 | 06-pre-deployment | `pwsh tests/integrated-suite/run-suite.ps1 -Package 06-pre-deployment` | لا يُتجاوز |
| 10 | session close | `pnpm agent:persistent-memory:session:close` | لا يُتجاوز |
| 11 | verify | `pnpm agent:verify` | لا يُتجاوز |

## متغيرات البيئة المهمة

```powershell
# للحصول على بيئة staging مطابقة للإنتاج
$env:PRE_DEPLOY_BASE_URL = 'https://staging.example.com'
$env:PRE_DEPLOY_API_URL  = 'https://staging-api.example.com'
$env:K6_TARGET_BASE_URL  = 'https://staging-api.example.com'
$env:COMPAT_BASE_URL     = 'https://staging.example.com'

# Tokens للـ DAST و pen-test
$env:DAST_TEST_USER      = 'zap-test@example.com'
$env:DAST_TEST_PASS      = '<redacted>'
$env:K6_TEST_USER_TOKEN  = '<jwt>'
$env:TEST_JWT            = '<jwt>'
$env:TEST_JWT_A          = '<jwt-user-A>'
$env:TEST_JWT_B          = '<jwt-user-B>'

# للسريعة: تقصير soak من 2h لـ 10m
$env:K6_SOAK_DURATION    = '10m'
```

## ما لا يجب فعله مطلقاً

- ❌ تعديل أي ملف داخل `apps/web/playwright.*.ts` لتمرير اختبار
- ❌ تعديل `vitest.*.config.ts`
- ❌ تخفيض `thresholds.json` أو `policy.json`
- ❌ إضافة استثناءات في `01-security/deps/policy.json`
- ❌ حذف أو تعطيل اختبار قائم في `apps/*/tests/`
- ❌ تجاوز `--no-verify` في git hooks
- ❌ تشغيل `git push --force` على main

## ما يجب فعله عند الفشل

| الفشل | الإجراء |
|---|---|
| `01-security` ثغرة `critical`/`high` | توقّف فوراً، أبلغ Security Officer، لا تُكمل الحزم |
| `02-performance` تجاوز threshold | لا تخفّض threshold. ابحث عن root cause |
| `03-compatibility` فشل critical browser | لا تُسقط المتصفح من matrix. عالج المشكلة |
| `04-regression` فشل critical-path | توقّف فوراً، أنشئ issue، اطلب fix |
| `05-exploratory` `critical` finding | أنشئ issue بـ tag `release-blocker` |
| `06.smoke` فشل في staging | لا تنشر للإنتاج. rollback staging |
| `06.smoke` فشل في الإنتاج post-deploy | rollback فوري |
| غياب أداة (k6/semgrep/trivy) | سجّل skip في summary، لكن RC في 06 يحجب |

## نقاط الدخول المرجعية

| الملف | الغرض |
|---|---|
| [HANDOFF.md](./HANDOFF.md) | brief كامل |
| [INDEX.md](./INDEX.md) | خريطة الحزمة |
| [manifest.json](./manifest.json) | الـ machine-readable manifest |
| [run-suite.ps1](./run-suite.ps1) | الـ orchestrator |
| كل `*/run.ps1` | runner لـ sub-package |
| كل `*/README.md` | تفاصيل sub-package |

## الإغلاق

عند انتهاء التشغيل:

1. تأكد أن `artifacts/integrated-suite/<run-id>/SUMMARY.md` موجود
2. تأكد أن `06-pre-deployment/rc-decision.md` ممتلئ ومُوقَّع
3. شغّل:

   ```powershell
   pnpm agent:persistent-memory:session:close
   pnpm agent:verify
   ```

4. حدّث `output/round-notes.md` بنتيجة التشغيل
5. حدّث `output/session-state.md` إذا تغيّرت الحقيقة التشغيلية

## الحوكمة

كل فعل في هذا الـ runbook يخضع لـ:

- [AGENTS.md](../../AGENTS.md) — العقد الأعلى، قاعدة منع الإضعاف
- [.repo-agent/OPERATING-CONTRACT.md](../../.repo-agent/OPERATING-CONTRACT.md) — العقد التشغيلي
- [.repo-agent/HANDOFF-PROTOCOL.md](../../.repo-agent/HANDOFF-PROTOCOL.md) — بروتوكول إغلاق الجولة
