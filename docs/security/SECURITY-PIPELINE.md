# Pipeline الأمن الكامل

> فحوصات أمنية بصفر تكلفة تشغيل، تغطي عشر طبقات من التحليل الساكن إلى الديناميكي.

---

## ١. نظرة عامة

هذا الـ pipeline يقدم ثلاث طبقات من الفحص:

| الطبقة | الموقع | المتى | الهدف |
|---|---|---|---|
| pre-commit | محلي | قبل كل commit | منع تسريب الأسرار و الأخطاء الأمنية الواضحة |
| CI ثابت | GitHub Actions | كل push و PR | فحص شامل قبل الدمج |
| CI ديناميكي | GitHub Actions | أسبوعياً + يدوي | فحص بيئة التشغيل الفعلية |

---

## ٢. الفحوصات المغطاة

| رقم | الفحص | الأداة | النوع | يعمل في |
|---|---|---|---|---|
| 1 | SAST | Semgrep CE | ثابت | pre-commit و CI |
| 2 | Secrets | Gitleaks | ثابت | pre-commit و CI |
| 3 | JavaScript و TypeScript | ESLint Security | ثابت | pre-commit و CI |
| 4 | Dependency Audit | pnpm audit | ثابت | CI |
| 5 | Filesystem Scan | Trivy | ثابت | CI |
| 6 | SBOM | CycloneDX | ثابت | CI |
| 7 | License Audit | license-checker | ثابت | CI |
| 8 | DAST Baseline | OWASP ZAP | ديناميكي | CI أسبوعي |
| 9 | HTTP Probes | Nuclei | ديناميكي | CI أسبوعي |
| 10 | Report Aggregation | سكربت داخلي | تجميع | CI |

---

## ٣. بنية الملفات

البنية المُقترحة:

```
.github/workflows/
    security-pipeline.yml
scripts/
    security-scan.sh
    security-summary.sh
configs/
    .semgrep.yml
    .gitleaks.toml
    .zap-rules.tsv
    nuclei-templates.txt
    eslint.security.config.mjs
.pre-commit-config.yaml
Makefile
```

---

## ٤. التثبيت

### ٤.١ تثبيت أدوات الفحص محلياً

```bash
make install-tools
```

هذا الأمر يثبت:

- Semgrep
- Gitleaks
- Trivy
- jq

### ٤.٢ تثبيت ESLint plugins

```bash
pnpm add -D eslint-plugin-security eslint-plugin-no-secrets
```

### ٤.٣ تفعيل pre-commit hooks

```bash
make precommit-install
```

### ٤.٤ تثبيت دعم ESLint SARIF (للـ CI)

```bash
pnpm add -D @microsoft/eslint-formatter-sarif
```

---

## ٥. التشغيل المحلي

### ٥.١ كل الفحوصات الثابتة

```bash
make security-all
```

### ٥.٢ فحص سريع

```bash
make security-quick
```

### ٥.٣ فحص محدد

```bash
make security-sast
make security-secrets
make security-deps
make security-trivy
make security-sbom
make security-licenses
```

### ٥.٤ الفحوصات الديناميكية

تحتاج تحديد الـ URL المستهدف:

```bash
export ZAP_TARGET_URL=https://staging.thecopy.app
export NUCLEI_TARGET_URL=https://staging.thecopy.app
make security-dast
```

---

## ٦. التشغيل في CI

### ٦.١ التشغيل التلقائي

الـ workflow يعمل تلقائياً عند:

- كل push على فروع main و develop
- كل pull request على هذه الفروع
- جدولة أسبوعية يوم الأحد (للفحوصات الديناميكية)

### ٦.٢ التشغيل اليدوي

من تبويب Actions في المستودع، اضغط Run workflow و حدد ما إذا كنت تريد تشغيل الفحوصات الديناميكية.

### ٦.٣ المتغيرات المطلوبة في المستودع

اذهب إلى Settings و Secrets and variables و Actions و Variables:

| المتغير | القيمة | مستخدم في |
|---|---|---|
| ZAP_TARGET_URL | رابط بيئة staging | ZAP scan |
| NUCLEI_TARGET_URL | رابط بيئة staging | Nuclei scan |

---

## ٧. التقارير

### ٧.١ مواقع التقارير

- **GitHub Security tab:** كل نتائج SARIF تُنشر هنا تلقائياً
- **Workflow Artifacts:** التقارير الخام بصيغة JSON و SARIF
- **PR Comments:** ملخص تلقائي على كل pull request
- **Step Summary:** ملخص مرئي في صفحة الـ workflow

### ٧.٢ مدد الاحتفاظ

| نوع التقرير | المدة |
|---|---|
| SARIF و JSON | ٣٠ يوم |
| SBOM | ٩٠ يوم |
| Summary | ٩٠ يوم |

---

## ٨. ترقية الـ pipeline

### ٨.١ ترقية مدفوعة عند بلوغ ١٠ مساهمين

عند تجاوز سقف Semgrep Cloud المجاني، توجد ثلاثة خيارات:

| الخيار | التكلفة الشهرية | المميزات |
|---|---|---|
| Semgrep Team | ٣٥ دولار للمساهم | أكثر من ٢٠٠٠٠ قاعدة Pro و تحليل عبر الملفات |
| Snyk Team | ٢٥ دولار للمطور | Reachability analysis للحزم |
| GitHub Advanced Security | ٣٠ دولار للمساهم النشط | CodeQL و Copilot Autofix |

### ٨.٢ التوسع للمشاريع متعددة اللغات

إذا أضفت لغات جديدة، عدّل قواعد Semgrep لتشمل:

- p/python
- p/golang
- p/rust
- p/java

---

## ٩. استكشاف الأخطاء

### ٩.١ Semgrep يبطئ التشغيل

سبب: حجم المشروع كبير. الحل:

```bash
semgrep scan --config=p/security-audit --include='src/**'
```

### ٩.٢ Gitleaks يرفع false positives

أضف القيمة لـ allowlist في configs و gitleaks.toml تحت قسم regexes أو stopwords.

### ٩.٣ Trivy يستهلك ذاكرة كبيرة

قلل scope الفحص بإضافة:

```bash
trivy fs --skip-dirs node_modules,dist,.next .
```

### ٩.٤ ZAP يفشل في الـ CI

تأكد من:

- متغير ZAP_TARGET_URL معرّف في Variables
- الـ URL متاح من internet (مش internal)
- الـ URL لا يحتاج auth أو وفّر credentials عبر ZAP context

---

## ١٠. الأمان التشغيلي

### ١٠.١ الصلاحيات في GitHub Actions

الـ workflow يستخدم الحد الأدنى من الصلاحيات:

```yaml
permissions:
  contents: read
  security-events: write
  pull-requests: write
  actions: read
```

### ١٠.٢ تثبيت إصدارات Actions

كل actions مثبتة بإصدارات محددة لمنع supply chain attacks. للتشديد أكثر، استبدل الـ tags بـ commit SHAs:

```yaml
uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
```

### ١٠.٣ إدارة الأسرار

- لا تخزن أي مفتاح في الكود
- استخدم GitHub Secrets للقيم الحساسة
- استخدم Variables للقيم غير الحساسة (URLs مثلاً)
- فعّل secret scanning في إعدادات المستودع

---

## ١١. مرجع سريع للأوامر

```bash
# تثبيت كل شيء
make install-tools
pnpm add -D eslint-plugin-security eslint-plugin-no-secrets
make precommit-install

# الفحص اليومي
make security-quick

# الفحص الكامل قبل الـ release
make security-all

# الفحص الديناميكي قبل الـ deploy
ZAP_TARGET_URL=https://staging.thecopy.app make security-dast

# تنظيف
make security-clean
```
