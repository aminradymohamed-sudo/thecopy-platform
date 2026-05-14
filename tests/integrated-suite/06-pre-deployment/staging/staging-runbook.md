# Staging Runbook

## التعريف

كيفية نشر الإصدار في بيئة staging وتشغيل الحزمة الكاملة فيها قبل القرار النهائي.

## الفلسفة

Staging = إنتاج مطابق. أي اختلاف بين staging والإنتاج drift يجب توثيقه.

## التسلسل

### 1. التحضير

```powershell
# تحديث المرجع الحي
pnpm agent:bootstrap

# تثبيت الاعتماديات
pnpm install --frozen-lockfile

# بناء الإنتاج
pnpm build:all
```

### 2. النشر إلى staging

```powershell
# Docker (مسار رسمي)
pnpm docker:prod:build
pnpm docker:prod:up

# أو Vercel staging deployment
# (راجع .github/workflows/blue-green-deployment.yml)
```

### 3. التحقق الفوري

```powershell
$env:PRE_DEPLOY_BASE_URL = 'https://staging.the-copy.example.com'
$env:PRE_DEPLOY_API_URL = 'https://staging-api.the-copy.example.com'

# smoke (< 2 min)
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -Layer smoke -ArtifactsDir artifacts/integrated-suite/<run-id>/06-pre-deployment
```

إذا فشل smoke → **rollback فوري**.

### 4. تشغيل الحزمة كاملة في staging

```powershell
$env:K6_TARGET_BASE_URL = 'https://staging-api.the-copy.example.com'
$env:COMPAT_BASE_URL = 'https://staging.the-copy.example.com'

pwsh tests/integrated-suite/run-suite.ps1 -All
```

ملاحظة: `01-security/dast` يحتاج بيئة معزولة — قد تحتاج staging-isolated أو dedicated security-staging.

### 5. UAT في staging

- صاحب المنتج يستخدم staging URL
- يكمل [uat/scenarios.md](../uat/scenarios.md)
- يوقّع [uat/acceptance-criteria.md](../uat/acceptance-criteria.md)

### 6. Pre-Production الموازي

(اختياري لكن موصى به)

```powershell
# تشغيل الحزمة على pre-prod (نسخة قريبة جداً من production)
$env:PRE_DEPLOY_BASE_URL = 'https://preprod.the-copy.example.com'
pwsh tests/integrated-suite/run-suite.ps1 -All
```

### 7. القرار

- اقرأ كل summary.json تحت artifacts
- املأ [rc/rc-decision-template.md](../rc/rc-decision-template.md)
- اطلب التواقيع

### 8. النشر إلى الإنتاج

```powershell
# blue-green deployment
# (راجع .github/workflows/blue-green-deployment.yml)
```

### 9. Post-deploy smoke

```powershell
$env:PRE_DEPLOY_BASE_URL = 'https://the-copy.example.com'
pwsh tests/integrated-suite/06-pre-deployment/run.ps1 -Layer smoke
```

## خطة Rollback

إذا فشل smoke في الإنتاج خلال أول 10 دقائق:

1. شغّل blue-green switchback:

   ```powershell
   gh workflow run blue-green-deployment.yml -f action=rollback
   ```

2. أكّد أن traffic عاد للإصدار السابق
3. شغّل smoke مرة أخرى للتأكيد
4. أنشئ incident report
5. **لا تشغّل** post-mortem fix على الإنتاج مباشرة

## نقاط اتصال

| الحدث | المسؤول | القناة |
|---|---|---|
| smoke فشل | DevOps oncall | #incidents |
| critical bug في UAT | Product Owner | #product |
| security finding | Security Officer | #security |
| rollback نُفِّذ | كل الفريق | #incidents + email |

## ملاحظات حوكمة

- `output/session-state.md` يجب أن يكون up-to-date قبل النشر
- `output/round-notes.md` يحوي جولة "deployment-<version>"
- بعد النشر، **حدّث** session-state إذا تغيّر شيء (منافذ، scripts، …)
