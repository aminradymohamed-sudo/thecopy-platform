# 06 — اختبارات ما قبل النشر (Pre-Deployment)

## الهدف

البوابة النهائية قبل قرار Go/No-Go. تحوي 6 طبقات:

| الطبقة | الاسم | السؤال |
|---|---|---|
| Smoke | Smoke Test | فور النشر، التطبيق يعمل أصلاً؟ |
| System | System Testing | هل النظام ككتلة واحدة متكاملة يعمل (E2E عرضي)؟ |
| UAT | User Acceptance Testing | هل التطبيق يلبّي متطلبات الأعمال؟ |
| RC | Release Candidate Testing | هل الـ build النهائي مستعد للإعلان؟ |
| Staging | Staging Pre-Production | هل كل أنواع الاختبارات تنجح في بيئة مطابقة للإنتاج؟ |
| Acceptance | Acceptance Testing | إشارة Go/No-Go صريحة |

## التسلسل الإلزامي

```text
1. تشغيل الحزمة في staging:
   - smoke (سريع، < 2 min)
   - system (E2E شامل)
2. UAT بواسطة صاحب المنتج
3. ملء RC checklist
4. قرار Go/No-Go نهائي → rc-decision.md
5. (بعد النشر فقط) smoke في الإنتاج
```

## المجلدات الفرعية

| المجلد | المحتوى |
|---|---|
| [smoke/](./smoke/) | Playwright smoke tests + post-deploy script |
| [system/](./system/) | Playwright E2E system tests |
| [uat/](./uat/) | UAT scenarios + acceptance criteria |
| [rc/](./rc/) | Release Candidate checklist |
| [staging/](./staging/) | Staging runbook |

## التشغيل

```powershell
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -ArtifactsDir artifacts/integrated-suite/<run-id>/06-pre-deployment

# طبقة محددة
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -Layer smoke
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -Layer system

# في بيئة staging
$env:PRE_DEPLOY_BASE_URL = 'https://staging.the-copy.example.com'
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -Layer smoke
```

## القرار النهائي

[rc-decision.md](./rc/rc-decision-template.md) — يجب أن يُملأ بدقة قبل أي نشر.
