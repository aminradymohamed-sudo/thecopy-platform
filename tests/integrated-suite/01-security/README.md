# 01 — اختبارات الأمان

## الهدف

التحقق من سلامة المستودع أمنياً عبر أربع طبقات متكاملة:

| الفئة | الاختصار | السؤال الذي يجيب عنه |
|---|---|---|
| التحليل الساكن | SAST | هل الكود المصدري يحتوي ثغرات قبل التشغيل (SQLi, XSS, weak crypto…)؟ |
| التحليل الديناميكي | DAST | هل التطبيق المُشغَّل يكشف ثغرات وقت التشغيل (broken auth, headers, …)؟ |
| فحص التبعيات | Deps | هل المكتبات الخارجية تحتوي ثغرات معروفة (CVE) أو رخص ممنوعة؟ |
| اختبار الاختراق | PenTest | هل توجد حالات استغلال تتجاوز ما تكشفه الأدوات الآلية (IDOR, SSRF, business logic)؟ |

## البنية القائمة المُستهلَكة

هذه الحزمة لا تستبدل أي فحص أمني قائم — بل تستدعيه:

| القائم في المستودع | كيف يُستهلَك |
|---|---|
| `pnpm security:semgrep` | SAST/run.ps1 يستدعيه ويلتقط مخرجاته في artifacts |
| `pnpm security:secrets` (gitleaks) | SAST/run.ps1 — ضمن نفس الجولة |
| `pnpm security:deps` (snyk) | Deps/run.ps1 |
| `pnpm security:trivy` | Deps/run.ps1 (image + filesystem) |
| `pnpm security:zap` و `security:zap:full` | DAST/run.ps1 — مع توسعة authenticated context |
| `.github/workflows/codeql.yml` | SAST/checks.json يثبت أنه نشِط في CI ويولّد ملخصاً |
| `pnpm security:env:check` | Deps/run.ps1 يستدعيه قبل بقية الفحوص |

## الفحوص المضافة فوق القائم

1. **SAST**: ESLint security rules check + ملخص CodeQL من آخر تشغيل في GitHub Actions.
2. **DAST**: سيناريو ZAP مصادَق (authenticated) لتغطية المسارات خلف JWT — لا يغطيها baseline.
3. **Deps**: license-allowlist enforcement + SBOM generation (CycloneDX).
4. **PenTest**: قائمة فحص OWASP ASVS L1/L2 + probes يدوية قابلة للتشغيل (HTTP files).

## التشغيل

```powershell
# تشغيل كامل
pwsh tests/integrated-suite/01-security/run.ps1 -ArtifactsDir artifacts/integrated-suite/<run-id>/01-security

# فئة واحدة
pwsh tests/integrated-suite/01-security/run.ps1 -Category sast
pwsh tests/integrated-suite/01-security/run.ps1 -Category dast
pwsh tests/integrated-suite/01-security/run.ps1 -Category deps
pwsh tests/integrated-suite/01-security/run.ps1 -Category pentest
```

## سياسة الحجب

| النتيجة | السلوك |
|---|---|
| ثغرة `critical` أو `high` غير مستثناة في `policy.json` | فشل فوري — حجب كل الحزم اللاحقة |
| ثغرة `medium` بلا تخفيف موثَّق | فشل يحتاج قرار صاحب المنتج |
| `low` / `informational` | تُسجَّل في التقرير ولا تحجب |
| غياب أداة (semgrep/trivy/snyk/zap) | يُسجَّل `tool-missing`؛ في وضع RC ⇒ no-go |

## المخرجات

```text
artifacts/integrated-suite/<run-id>/01-security/
├── sast/
│   ├── semgrep.json
│   ├── eslint-security.json
│   ├── gitleaks.json
│   └── codeql-summary.md
├── dast/
│   ├── zap-baseline.html
│   ├── zap-authenticated.html
│   └── zap-report.json
├── deps/
│   ├── pnpm-audit.json
│   ├── snyk.json
│   ├── trivy-fs.json
│   ├── trivy-image.json
│   ├── sbom.cdx.json
│   └── license-report.md
└── pentest/
    ├── checklist-result.md
    ├── probes/
    │   └── *.http.result.json
    └── findings.md
```
