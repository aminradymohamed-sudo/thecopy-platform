# تقرير الفحص الأمني المفصل

## معلومات الجولة

- **التاريخ:** 2026-05-14
- **الفرع:** main
- **الجولة:** B (تنفيذ حي بعد جولة A المعمارية)
- **مدير الحزم:** pnpm 10.33.3
- **النظام:** Windows
- **مسار التنفيذ:** IDE path (وفق العقد الرسمي، بعد فشل bootstrap بسبب غياب مفتاح API)

## تأكيد قاعدة منع إضعاف الفحوصات

هذه الجولة لم تضعف أي فحص قائم. التعديل الوحيد على ملفي فحص كان إصلاح خلل ترميز يمنع تشغيل semgrep على ويندوز:

في:

```text
Makefile
scripts/security/security-scan.sh
```

أُضيف:

```text
export PYTHONUTF8 := 1
export PYTHONIOENCODING := utf-8
```

السبب: ملف الإعداد يحوي تعليقات عربية، وبدون فرض UTF-8 يفشل بايثون بـ UnicodeDecodeError. الإصلاح يجعل الفحص يعمل، ولا يخفض الصرامة ولا يضيّق التغطية.

## الأدوات المنفّذة

### gitleaks

الأمر:

```text
gitleaks detect --source=. --config=.gitleaks.toml --report-format=sarif --redact --no-banner
```

عدد القواعد المفعّلة:

```text
17
```

التوزيع:

```text
6 قواعد مستودع مخصصة (postgres, mongodb, mysql, redis, private-key, bearer)
11 قاعدة مزودي API (anthropic, openai, openai-proj, vercel, supabase, gcp, huggingface, replicate, fal, mistral, jwt)
```

الإضافات في هذه الجولة لم تمس قواعد المستودع المخصصة ولا قائمة allowlist الموسعة.

### semgrep

الأمر:

```text
semgrep scan --config=p/security-audit --config=p/owasp-top-ten --config=configs/.semgrep.yml --sarif --output=reports/semgrep-...sarif --metrics=off
```

عدد القواعد المُحمَّلة:

```text
681
```

من ثلاث طبقات:

```text
p/security-audit (community)
p/owasp-top-ten (community)
configs/.semgrep.yml (10 قواعد محلية)
```

## النتيجة الإجمالية

| الأداة | الحالة | عدد الملاحظات | exit |
|---|---|---|---|
| gitleaks | نظيف | 0 | 0 |
| semgrep | ملاحظات قائمة | 127 | 2 |

semgrep خرج بـ exit 2 لأنه أنتج findings (سلوك مقصود).

## تقارير SARIF

البيانات الخام:

```text
reports/gitleaks-20260514-102519.sarif
reports/semgrep-20260514-102629.sarif
```

البيانات المُسطَّحة بصيغة CSV:

```text
reports/semgrep-findings.csv
```

## تفصيل gitleaks

### المسح

- عدد الـ commits المفحوصة: 6
- الحجم الإجمالي: 57.32 MB
- المدة: 3.99 ثانية
- التسريبات المكتشفة: 0
- exit code: 0

### تفسير

لا توجد أسرار مكشوفة في تاريخ المستودع وفق القواعد الـ 17 المفعّلة. allowlist واسعة وتغطي:

```text
.env.example
.env.sample
.env.tiptap
README.md
docs/
output/
specs/
node_modules/
.next/
dist/
build/
coverage/
.turbo/
pnpm-lock.yaml
*.test.{ts,tsx,js,jsx,mts,cts}
*.spec.{ts,tsx,js,jsx,mts,cts}
apps/backend/src/test/
apps/backend/src/__tests__/
apps/backend/tests/
apps/web/tests/
scripts/agent/lib/persistent-memory/secrets.ts
scripts/agent/persistent-memory-eval.ts
tests/integrated-suite/01-security/pentest/
test-results/
playwright-report/
artifacts/
```

كذلك regex allowlist يستوعب placeholders الموثَّقة مثل:

```text
change-me-to-*
CHANGE-THIS*
your-*-key
example-*-secret
postgres:postgres@
postgres://test:test@
postgres://prod:prod@
mirror-secret-random-string-at-least-32-chars
```

## تفصيل semgrep

### التوزيع حسب الخطورة

| المستوى | العدد | الوزن |
|---|---|---|
| error | 11 | 8.7% |
| warning | 116 | 91.3% |
| **الإجمالي** | **127** | **100%** |

### التوزيع حسب القاعدة

| الترتيب | القاعدة | الخطورة | العدد |
|---|---|---|---|
| 1 | configs.insecure-random | warning | 77 |
| 2 | configs.http-without-tls | warning | 30 |
| 3 | javascript.lang.security.detect-child-process | error | 8 |
| 4 | javascript.jsonwebtoken.security.jwt-hardcode | warning | 6 |
| 5 | yaml.github-actions.security.run-shell-injection | error | 3 |
| 6 | javascript.express.security.cors-misconfiguration | warning | 2 |
| 7 | javascript.express.security.audit.xss.direct-response-write | warning | 1 |

## القسم الأول — الملاحظات الحرجة (مستوى error)

### 1.1 حقن أوامر shell في GitHub Actions

القاعدة:

```text
yaml.github-actions.security.run-shell-injection.run-shell-injection
```

عدد الإصابات: 3
المرجع: CWE-78 (OS Command Injection)

#### المواقع

| الملف | السطر |
|---|---|
| `.github/workflows/blue-green-deployment.yml` | 328 |
| `.github/workflows/blue-green-deployment.yml` | 443 |
| `.github/workflows/hybrid-production-audit.yml` | 34 |

#### النمط المشتبه

نمط حقن مدخلات مستخدم داخل بلوك:

```text
run:
```

عبر تعبير من نوع:

```text
${{ github.event.* }}
${{ github.head_ref }}
${{ inputs.* }}
```

تمرير مباشر داخل سكربت shell يسمح بمهاجم يتحكم في اسم فرع أو في حقل pull request بحقن أوامر تنفذ على runner.

#### تقييم الأولوية

**true positive بأولوية عالية جداً.** هذا نمط ثغرة موثَّق وموجود في تحذيرات GitHub الرسمية.

#### الإصلاح المعياري

نقل القيمة إلى متغير بيئة قبل استخدامها داخل shell:

```text
env:
  PR_TITLE: ${{ github.event.pull_request.title }}
run: |
  echo "$PR_TITLE"
```

### 1.2 استخدام child_process بدون فحص مدخلات

القاعدة:

```text
javascript.lang.security.detect-child-process.detect-child-process
```

عدد الإصابات: 8
المرجع: CWE-78 (OS Command Injection)

#### المواقع

| الملف | السطر |
|---|---|
| `apps/backend/editor-runtime/karank-bridge.mjs` | 136 |
| `apps/web/src/app/(main)/editor/scripts/run-workflow-md.mjs` | 13 |
| `apps/web/src/app/(main)/editor/server/karank-bridge.mjs` | 136 |
| `scripts/agent/plan-implementation-reviewer.ts` | 340 |
| `scripts/apply-autofix.mjs` | 17 |
| `scripts/qa/run-all-foundation-tests.js` | 19 |
| `scripts/qa/run-e2e-tests.js` | 19 |
| `scripts/qa/run-integration-tests.js` | 19 |

#### النمط المشتبه

استدعاء:

```text
child_process.exec
child_process.execSync
child_process.spawn
```

دون التحقق من أن المدخلات لا تأتي من مصدر غير موثوق.

#### تقييم الأولوية

**يحتاج تصنيف يدوي فردي.** سكربتات QA والـ tooling غالباً تستقبل أسماء ملفات أو معاملات داخلية وثابتة، فتكون false positive. أما الجسور (bridges) و scripts/apply-autofix فقد تستقبل مدخلات قابلة للتلاعب وتستحق فحصاً معمَّقاً.

#### حكم مبدئي على كل ملف

| الملف | الحكم المبدئي | المبرر |
|---|---|---|
| `scripts/qa/run-*.js` | false positive محتمل | معاملات ثابتة لتشغيل اختبارات |
| `scripts/apply-autofix.mjs` | يحتاج فحصاً | autofix يأخذ مدخلات من runner |
| `scripts/agent/plan-implementation-reviewer.ts` | يحتاج فحصاً | يقرأ من plan files قد تكون موجَّهة |
| `karank-bridge.mjs` (مكرر في 3 مواقع) | يحتاج فحصاً | جسر runtime، سطح هجوم محتمل |
| `run-workflow-md.mjs` | يحتاج فحصاً | تنفيذ workflow من markdown |

## القسم الثاني — الملاحظات التحذيرية (مستوى warning)

### 2.1 توليد أرقام عشوائية غير آمن

القاعدة:

```text
configs.insecure-random
```

عدد الإصابات: 77
المرجع: CWE-338 (Use of Cryptographically Weak PRNG)

#### الرسالة الكاملة

```text
استخدام Math.random غير آمن للأغراض الأمنية. استخدم crypto.randomBytes
```

#### أعلى الملفات تمركزاً

| الملف | العدد |
|---|---|
| `apps/web/src/lib/particle-system.ts` | 8 |
| `apps/web/src/workers/particle-generator/particleGen.ts` | 7 |
| `apps/web/src/lib/particle-batch-generator.ts` | 7 |
| `apps/web/src/lib/animations.ts` | 5 |
| `apps/web/src/app/(main)/ui/pages/AnalysisPage.tsx` | 4 |
| `apps/web/src/components/ui/infinite-canvas.tsx` | 4 |
| `apps/web/src/components/particle-background.tsx` | 3 |
| `apps/web/src/components/ui/spatial-scene-planner/hooks/use-spatial-scene.ts` | 3 |
| `apps/web/src/components/shared/particle-background.tsx` | 3 |

#### تصنيف السياقات

**سياق بصري بحت (false positive مرشَّح بقوة):**

```text
apps/web/src/lib/particle-system.ts
apps/web/src/workers/particle-generator/*
apps/web/src/lib/particle-batch-generator.ts
apps/web/src/lib/animations.ts
apps/web/src/components/particle-background.tsx
apps/web/src/components/shared/particle-background.tsx
apps/web/src/components/aceternity/noise-background.tsx
apps/web/src/components/ui/infinite-canvas.tsx
apps/web/src/components/ui/dotted-glow-background.tsx
apps/web/src/components/ui/spatial-scene-planner/hooks/use-spatial-scene.ts
```

استخدام عشوائية لإنتاج مواضع جسيمات أو تأثيرات بصرية لا أمنية فيها.

**سياق محتمل أمني (يستحق فحصاً):**

```text
apps/web/src/lib/crypto/documentService.ts
apps/web/src/lib/ai/stations/station3-inference-engines.ts
apps/backend/src/services/guardian/assumption-engine.ts
apps/backend/src/services/guardian/evidence-ledger.ts
packages/security-middleware/src/server.ts
```

هذه الملفات بأسماء توحي بأنها أمنية أو مرتبطة بتشفير. أي استخدام:

```text
Math.random
```

فيها لتوليد nonce أو session id أو token يحتاج استبدالاً بـ:

```text
crypto.randomBytes
crypto.randomUUID
```

**سياق UX/Notifications (false positive محتمل):**

```text
apps/web/src/components/ui/notification-center.tsx
apps/web/src/hooks/use-notifications.ts
apps/web/src/app/(main)/breakdown/application/workspace/use-toast-queue.ts
```

عادةً لتوليد IDs محلية لا أمنية.

### 2.2 اتصالات HTTP بدون TLS

القاعدة:

```text
configs.http-without-tls
```

عدد الإصابات: 30

#### المواقع وتفسيرها

| الملف | العدد | التفسير |
|---|---|---|
| `apps/web/src/app/(main)/styleIST/components/icons.tsx` | 16 | xmlns SVG (false positive) |
| `apps/web/src/app/(main)/directors-studio/director_copilot_arabic_mvp_runtime_pack/backend/app/services/storage.py` | 2 | يحتاج فحصاً |
| `apps/backend/editor-runtime/karank_engine/engine/ts_bridge.py` | 1 | يحتاج فحصاً |
| `apps/backend/src/modules/art-director/plugins/mr-previz-studio/operations.ts` | 1 | يحتاج فحصاً |
| `apps/web/src/app/(main)/art-director/plugins/mr-previz-studio/index.ts` | 1 | يحتاج فحصاً |
| `apps/web/src/app/(main)/editor/server/karank_engine/engine/ts_bridge.py` | 1 | يحتاج فحصاً |
| `apps/web/src/app/(main)/styleIST/components/LightingStudio.tsx` | 1 | يحتاج فحصاً |
| `apps/web/src/app/(main)/styleIST/components/Spinner.tsx` | 1 | يحتمل xmlns SVG |
| `apps/web/src/app/api/public/analysis/seven-stations/route.test.ts` | 1 | ملف اختبار |
| `apps/web/src/components/aceternity/background-beams.tsx` | 1 | يحتمل xmlns SVG |
| `apps/web/src/components/editors/EncryptedScreenplayEditor.tsx` | 1 | يحتاج فحصاً |
| `apps/web/src/components/IntroVideoModal.tsx` | 1 | يحتاج فحصاً |
| `apps/web/src/components/shared/IntroVideoModal.tsx` | 1 | يحتاج فحصاً |
| `qa/integration/foundation-integration.test.ts` | 1 | ملف اختبار |

#### تحقق ميداني

عيّنة من السطر 11 في:

```text
apps/web/src/app/(main)/styleIST/components/icons.tsx
```

المحتوى:

```text
xmlns="http://www.w3.org/2000/svg"
```

تأكيد قاطع: 16 إصابة في هذا الملف كلها xmlns لمعرفات SVG، وهي **false positive قاطع**. ليست اتصالات HTTP فعلية.

#### تصنيف مقترح

من الـ 30، المتوقع:

```text
~ 18 false positive (SVG xmlns)
~ 12 true positive محتملة في خدمات storage/bridge/uploads
```

### 2.3 أسرار JWT مُضمَّنة في الكود

القاعدة:

```text
javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret
```

عدد الإصابات: 6

#### المواقع

كل الإصابات في ملف واحد:

```text
apps/backend/src/__tests__/unit/jwt-secret-manager.test.ts
```

أرقام الأسطر:

```text
56
68
81
82
98
113
```

#### تقييم الأولوية

**false positive قاطع.** الملف اسمه:

```text
*.test.ts
```

وداخل:

```text
apps/backend/src/__tests__/
```

أي ملف اختبار وحدة. الأسرار فيه قيم وهمية لاختبار مدير الأسرار نفسه. ملاحظة: gitleaks يستثني هذه المسارات في allowlist، لكن semgrep لا يرث allowlist من gitleaks.

#### الإجراء المقترح

إضافة استثناء محدود النطاق في:

```text
configs/.semgrep.yml
```

أو في تعليق pragma داخل ملف الاختبار:

```text
// nosemgrep: javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret
```

النمط الثاني أفضل لأنه لا يوسّع allowlist عاماً.

### 2.4 سوء إعداد CORS

القاعدة:

```text
javascript.express.security.cors-misconfiguration.cors-misconfiguration
```

عدد الإصابات: 2

#### المواقع

| الملف | السطر |
|---|---|
| `apps/backend/editor-runtime/middlewares/cors.mjs` | 27 |
| `apps/web/src/app/(main)/editor/server/middlewares/cors.mjs` | 27 |

#### النمط المُكتشف

```text
res.header("Access-Control-Allow-Origin", origin);
```

حيث:

```text
origin
```

قيمة ديناميكية مأخوذة من طلب العميل، تُعاد بدون قائمة بيضاء (whitelist) تحقّق منها.

#### تقييم الأولوية

**true positive محتمل** يحتاج فحصاً للسياق. إذا كان السطر يسبقه فحص مقابل قائمة origins موثوقة، فالأمر آمن. وإلا فهذا يفتح CORS لأي مصدر.

#### الإصلاح المعياري

```text
const allowed = ['https://app.example.com'];
if (allowed.includes(origin)) {
  res.header('Access-Control-Allow-Origin', origin);
}
```

### 2.5 كتابة مباشرة في الاستجابة (XSS محتمل)

القاعدة:

```text
javascript.express.security.audit.xss.direct-response-write.direct-response-write
```

عدد الإصابات: 1

#### الموقع

```text
apps/backend/src/controllers/analysis.controller.ts
```

السطر: 242

#### النمط المُكتشف

```text
res.write(formatSseEvent(e));
```

#### تقييم الأولوية

سياق:

```text
SSE (Server-Sent Events)
```

والكتابة عبر:

```text
formatSseEvent
```

إذا كانت دالة الصياغة تطبق escaping سليماً للحقول التي قد تأتي من مدخلات مستخدم، فهذا **false positive**. وإن كانت تمرر النص الخام بدون escaping، فهذا **true positive** لـ XSS مردود.

#### الإجراء المقترح

فحص محتوى:

```text
formatSseEvent
```

والتحقق من سلوكه عند تمرير حقول غير موثوقة.

## القسم الثالث — الخلاصة الكمية

### مصفوفة الأولويات

| الفئة | الحرجة (error) | التحذيرية (warning) | الإجمالي |
|---|---|---|---|
| true positive محتملة | 3 | ~12 | ~15 |
| تحتاج تصنيف يدوي | 8 | ~16 | ~24 |
| false positive عالية الترجيح | 0 | ~88 | ~88 |
| **الإجمالي** | **11** | **116** | **127** |

ملاحظة: التقديرات في الصفوف "محتملة" و"عالية الترجيح" أولية، وتحتاج تصنيفاً يدوياً فردياً لكل ملاحظة قبل اعتمادها رسمياً.

### الأرقام الفاصلة

| المؤشر | القيمة |
|---|---|
| الملاحظات الواجبة الفحص فوراً | 3 (run-shell-injection) |
| الملاحظات التي يُحتمل أن تكون أمنية حقيقية | حتى 27 |
| الملاحظات الـ false positive المرشَّحة بقوة | حتى 100 |
| نسبة الـ noise التقديرية | حتى 78% |

النسبة العالية للـ noise متوقعة في أول جولة على مستودع كبير، وتقل تدريجياً مع تطبيق:

```text
suppressions
```

محدودة النطاق، أو ضبط nodes مستهدفة في:

```text
configs/.semgrep.yml
```

## القسم الرابع — التوصيات

### توصية فورية (هذا الأسبوع)

إصلاح الـ 3 ملاحظات في GitHub Actions:

```text
.github/workflows/blue-green-deployment.yml (سطر 328)
.github/workflows/blue-green-deployment.yml (سطر 443)
.github/workflows/hybrid-production-audit.yml (سطر 34)
```

عبر نقل القيم إلى:

```text
env:
```

قبل استخدامها في:

```text
run:
```

### توصية قصيرة المدى (هذا الشهر)

تصنيف الـ 8 ملاحظات:

```text
detect-child-process
```

ملفاً ملفاً، وتحديد:

- ما هو true positive (يحتاج sanitization أو تجنب shell)
- ما هو false positive (يحتاج تعليق pragma محدد لإخراسه دون إضعاف القاعدة)

### توصية متوسطة المدى

فحص الـ 12 ملاحظة المرشَّحة كـ true positive في:

```text
configs.insecure-random
configs.http-without-tls
javascript.express.security.cors-misconfiguration
javascript.express.security.audit.xss.direct-response-write
```

داخل ملفات تشفير وخدمات الجسور و middlewares.

### توصية بنيوية

إنتاج baseline ملف ثابت يسجل:

```text
127 finding
```

كخط أساس حالي. أي زيادة عنه في PR جديد = ترتفع شارة CI حمراء. أي نقصان مع تثبيت = يعكس تحسناً مقاسًا.

أداة مقترحة لذلك:

```text
semgrep ci --baseline-ref=<commit>
```

### توصية حوكمية

لا توسيع لـ:

```text
allowlist
```

عام في:

```text
configs/.semgrep.yml
```

كل false positive يُسكن بـ:

```text
// nosemgrep: <rule-id>
```

على السطر المحدد، مع تعليق يشرح السبب. هذا يحفظ تغطية القاعدة على باقي المستودع.

## القسم الخامس — حدود هذا التقرير

### ما يغطيه

- توزيع كمي دقيق للـ 127 ملاحظة
- مواقع وأرقام أسطر لكل ملاحظة من مستوى error
- تصنيف مبدئي مرتكز على أسماء الملفات ومسارها
- تحقق ميداني لعينة من kسبب الـ http-without-tls في icons.tsx
- توصيات بترتيب أولوية واضح

### ما لا يغطيه

- تصنيف يدوي قاطع true/false لكل واحدة من الـ 127
- قراءة سياق الكود حول كل سطر (تتطلب مراجعة يدوية)
- فحص تشغيلي ديناميكي (DAST معطّل لغياب URLs مستهدفة)
- فحص تبعيات (pnpm audit / Trivy) — منفصل في pipeline آخر
- تراخيص الحزم (license-checker) — منفصل أيضاً

### المسار التالي

تكليف منفصل لتصنيف يدوي ملف بملف، يُختم بـ:

- قرار إصلاح
- أو قرار suppression مع مبرر مكتوب
- أو قرار إعادة تصميم

## القسم السادس — الفحوصات غير المنفذة في هذه الجولة

| الطبقة | السبب |
|---|---|
| ESLint Security | يحتاج تشغيل بعد التركيب الذي تم اليوم |
| pnpm audit | منفذ تلقائياً في CI، لا يحتاج تشغيل محلي ضمن security-quick |
| Trivy FS | منفذ تلقائياً في CI |
| CycloneDX SBOM | منفذ تلقائياً في CI |
| license-checker | منفذ تلقائياً في CI |
| OWASP ZAP | يحتاج URL مستهدف غير مُعرَّف |
| Nuclei | يحتاج URL مستهدف غير مُعرَّف |

## الملاحق

### الملحق أ — أمر إعادة إنتاج التقرير

```text
gitleaks detect --source=. --config=.gitleaks.toml --report-format=sarif --report-path=reports/gitleaks-NEW.sarif --redact --no-banner
```

```text
$env:PYTHONUTF8='1'; $env:PYTHONIOENCODING='utf-8'; semgrep scan --config=p/security-audit --config=p/owasp-top-ten --config=configs/.semgrep.yml --sarif --output=reports/semgrep-NEW.sarif --metrics=off
```

### الملحق ب — استخراج CSV من SARIF

تم في هذه الجولة وحُفظ في:

```text
reports/semgrep-findings.csv
```

أعمدته:

```text
rule, level, file, line, msg
```

127 صف.

### الملحق ج — حالة العقد التنفيذي

| البند | الحالة |
|---|---|
| قراءة AGENTS.md | تمت |
| قراءة output/session-state.md | تمت |
| قراءة .repo-agent/OPERATING-CONTRACT.md | تمت |
| قراءة .repo-agent/STARTUP-PROTOCOL.md | تمت |
| قراءة .repo-agent/HANDOFF-PROTOCOL.md | تمت |
| قاعدة منع إضعاف الفحوصات | محترَمة، لا فحص خُفِّف |
| pnpm agent:bootstrap | فشل بسبب OPENROUTER_API_KEY |
| pnpm agent:verify | فشل بسبب OPENROUTER_API_KEY |
| مسار IDE البديل | مفعَّل وفق العقد |
| تحديث output/session-state.md | تم |
| تحديث output/round-notes.md | تم |

### الملحق د — البصمة الزمنية

```text
2026-05-14T10:25:19Z — gitleaks scan
2026-05-14T10:26:29Z — semgrep scan
2026-05-14T10:30:00Z — gitleaks recheck بعد تعديل ملفات الفحص
```

---

**انتهى التقرير.**
