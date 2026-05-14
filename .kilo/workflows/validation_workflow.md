
تشغيل خط أنابيب فحص متسلسل (Pipeline) لمونوريبو
pnpm + Turborepo + TypeScript
يتألف من ثماني مراحل (تحقق مسبق، فحص ثغرات إنتاج، تنسيق، Lint صارم،
فحص أنواع، اختبارات، بناء، حدود حجم)، يتوقف فور أي فشل ويسجّل نتائج
كل مرحلة في ملف سجلات موحّد. الجمهور المستهدف: وكيل ترميز
(Claude Code / Cursor / Windsurf / Codex / Copilot) ينفّذ الخطة
حرفياً قبل أي push أو merge.
التقنيات المستخدمة

مدير الحزم:
pnpm (الإصدار المثبّت في packageManager داخل package.json الجذري)
منسّق المهام:
Turborepo عبر سكربتات pnpm المعرّفة في الجذر
مولّد المخرجات:
Bash 5+ على Linux/macOS، أو PowerShell 7+ على Windows
التنسيق والـ Lint:
Prettier, ESLint
فحص الأنواع:
TypeScript (tsc --noEmit عبر سكربت type-check)
الاختبارات:
إطار الاختبارات المُعتمد في المستودع (يتم اكتشافه من test:strict)
ميزانيات الحجم:
سكربت guard:budgets الداخلي

هيكل المشروع المستهدف
monorepo-root/
├── package.json              # يحتوي سكربتات pnpm المطلوبة كلها
├── pnpm-workspace.yaml
├── turbo.json
├── apps/                     # تطبيقات Turborepo
├── packages/                 # حزم مشتركة
└── .validation-logs/         # (تُنشأ بهذه الخطة) — سجلات تشغيل
    └── validate-YYYYMMDD-HHMMSS.log
المتطلبات المسبقة

Node.js بالإصدار المحدد في .nvmrc أو engines (الحد الأدنى 20 LTS).
pnpm مُثبّت عالمياً ومُفعّل عبر corepack enable.
جميع التبعيات منصّبة عبر pnpm install --frozen-lockfile قبل البدء.
صلاحية كتابة داخل جذر المستودع لإنشاء مجلد .validation-logs/.
وجود السكربتات التالية معرّفة في package.json الجذري:
agent:guard:verify, deps:audit:prod, format:check, lint:strict,
type-check, test:strict, prepush:verify, build:all, guard:budgets.

مبادئ التنفيذ الحاكمة

التسلسل الصارم:
الخطوات تُنفَّذ بالترتيب من 1 إلى 8، أي فشل = توقف فوري.
سياسة الخروج:
exit code != 0 في أي خطوة يُنهي خط الأنابيب ويُسجّل الخطأ.
التسجيل الإلزامي:
كل خطوة تُلحق نتيجتها (بدء، نهاية، حالة، مدة، stdout/stderr) في ملف
سجلات واحد بصيغة:
.validation-logs/validate-YYYYMMDD-HHMMSS.log
عدم التداخل:
لا تُشغَّل خطوتان بالتوازي مهما كانت مستقلة منطقياً — التسلسل جزء
من العقد.
عدم الإصلاح التلقائي:
هذه الخطة للفحص فقط (Read-only Validation)، لا تشغّل
--fix أو --write في أي مرحلة.


خطوات التنفيذ
الخطوة 1: تهيئة جلسة التحقق وإنشاء ملف السجلات
الهدف:
تجهيز بيئة التشغيل، التحقق من المتطلبات المسبقة، وإنشاء ملف سجلات
موحّد سيستخدمه باقي الخطوات.
الملفات:

.validation-logs/ — إنشاء: مجلد جديد إن لم يكن موجوداً.
.validation-logs/validate-YYYYMMDD-HHMMSS.log — إنشاء: ملف سجل
الجلسة الحالية.
.gitignore — تعديل: إضافة السطر .validation-logs/ إن لم يكن
مُضافاً مسبقاً.

التنفيذ:
تحقّق أولاً أنك في جذر المستودع (يحتوي pnpm-workspace.yaml).
ثم نفّذ الأوامر التالية (Bash):
```bash
# التأكد من جذر المستودع
test -f pnpm-workspace.yaml || { echo "خطأ: لست في جذر المونوريبو"; exit 1; }

# إنشاء مجلد السجلات
mkdir -p .validation-logs

# توليد اسم ملف سجل فريد بختم زمني
LOG_TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE=".validation-logs/validate-${LOG_TS}.log"
export VALIDATE_LOG_FILE="${LOG_FILE}"

# كتابة رأس السجل
{
  echo "==================================================================="
  echo "  pnpm validate — Sequential Pipeline Run"
  echo "==================================================================="
  echo "Started:        $(date -Iseconds)"
  echo "Node version:   $(node --version)"
  echo "pnpm version:   $(pnpm --version)"
  echo "Git commit:     $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
  echo "Git branch:     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')"
  echo "==================================================================="
  echo ""
} > "${LOG_FILE}"

# إضافة المجلد إلى .gitignore إن لم يكن موجوداً
grep -qxF '.validation-logs/' .gitignore 2>/dev/null \
  || echo '.validation-logs/' >> .gitignore

echo "ملف السجل: ${LOG_FILE}"
```
استبدل الأمر date +%Y%m%d-%H%M%S على PowerShell بـ:
Get-Date -Format "yyyyMMdd-HHmmss".
احتفظ بمتغير VALIDATE_LOG_FILE في بيئة الجلسة لاستخدامه في كل
الخطوات اللاحقة.
✅ معيار القبول:
الملف .validation-logs/validate-YYYYMMDD-HHMMSS.log موجود ويحتوي
رأس السجل بالحقول الخمسة (Started, Node, pnpm, commit, branch)،
ومتغير VALIDATE_LOG_FILE مُعرَّف في الـ shell.

الخطوة 2: تشغيل التحقق المسبق agent:guard:verify
الهدف:
التأكد من سلامة سياق الوكيل (Agent context guard) وأن المستودع في
حالة قابلة للفحص قبل بدء أي مرحلة لاحقة.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
نفّذ السكربت وسجّل المخرجات الكاملة (stdout + stderr) في ملف السجل
مع ختم زمني وحالة:
```bash
STEP="01-prevalidate"
SCRIPT="agent:guard:verify"

{
  echo ""
  echo "-------------------------------------------------------------------"
  echo "STEP ${STEP} — pnpm ${SCRIPT}"
  echo "Started: $(date -Iseconds)"
  echo "-------------------------------------------------------------------"
} >> "${VALIDATE_LOG_FILE}"

START=$(date +%s)
pnpm "${SCRIPT}" >> "${VALIDATE_LOG_FILE}" 2>&1
EXIT_CODE=$?
END=$(date +%s)
DURATION=$((END - START))

{
  echo ""
  echo "Ended:    $(date -Iseconds)"
  echo "Duration: ${DURATION}s"
  echo "Exit:     ${EXIT_CODE}"
  if [ ${EXIT_CODE} -eq 0 ]; then
    echo "Status:   PASS"
  else
    echo "Status:   FAIL"
  fi
} >> "${VALIDATE_LOG_FILE}"

if [ ${EXIT_CODE} -ne 0 ]; then
  echo "فشل في خطوة ${STEP} — راجع ${VALIDATE_LOG_FILE}"
  exit ${EXIT_CODE}
fi
```
اعتبر هذا القالب نمطاً موحّداً سيتكرر في الخطوات من 2 إلى 8 مع تغيير
STEP و SCRIPT فقط.
✅ معيار القبول:
pnpm agent:guard:verify ينتهي بـ exit code = 0 ويظهر سطر
Status: PASS في ${VALIDATE_LOG_FILE} تحت قسم STEP 01-prevalidate.

الخطوة 3: فحص ثغرات تبعيات الإنتاج deps:audit:prod
الهدف:
كشف الثغرات الأمنية في dependencies فقط (تجاهل
devDependencies) قبل أي بناء أو نشر.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
استخدم نفس قالب التنفيذ من الخطوة 2 مع تغيير المتغيرات:
```bash
STEP="02-deps-audit-prod"
SCRIPT="deps:audit:prod"
```
ثم كرّر بقية القالب حرفياً (header → run → footer → fail-stop).
ملاحظة على التفسير:
السكربت داخلياً يستدعي ما يشبه:
pnpm audit --prod --audit-level=high
أي فشل بمستوى high أو أعلى = توقف فوري. لا تخفّف المستوى ولا
تضف --fix.
✅ معيار القبول:
pnpm deps:audit:prod ينتهي بـ exit code = 0، ولا توجد ثغرات
بمستوى high أو critical في تبعيات الإنتاج، ويظهر
Status: PASS في السجل تحت STEP 02-deps-audit-prod.

الخطوة 4: التحقق من تنسيق الكود format:check
الهدف:
التأكد من التزام كل ملفات المستودع بقواعد Prettier المعرّفة في
.prettierrc دون تعديل أي ملف.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
```bash
STEP="03-format-check"
SCRIPT="format:check"
```
كرّر القالب الموحّد. السكربت داخلياً يجب أن يستدعي:
prettier --check
وليس
prettier --write
لأن الخطة فحص فقط.
في حالة الفشل:
ملف السجل سيحتوي قائمة الملفات غير المنسّقة. الإصلاح يكون
بأمر منفصل خارج هذه الخطة:
pnpm format (إن وجد) أو
pnpm exec prettier --write <FILE>.
✅ معيار القبول:
pnpm format:check ينتهي بـ exit code = 0 بدون قائمة ملفات
Code style issues found، ويظهر Status: PASS في السجل تحت
STEP 03-format-check.

الخطوة 5: الفحص الصارم lint:strict
الهدف:
تشغيل ESLint بأقصى صرامة (--max-warnings=0) مع فحص التصديرات
المكررة (Duplicate exports) عبر المستودع كله.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
```bash
STEP="04-lint-strict"
SCRIPT="lint:strict"
```
كرّر القالب الموحّد. السكربت يجب أن يجمع مرحلتين متتابعتين:

eslint . --max-warnings=0
أداة فحص التصديرات المكررة الداخلية (سواء كانت سكربت Node مخصص
أو eslint-plugin-import بقاعدة no-duplicates).

ملاحظة على الأداء:
على المستودعات الكبيرة قد يستغرق هذا التنفيذ عدة دقائق. لا توقف
العملية ولا تضف timeout — انتظر الانتهاء.
في حالة الفشل:
السجل سيحتوي تقرير ESLint كاملاً بأسماء الملفات والأرقام السطرية.
الإصلاح خارج نطاق هذه الخطة.
✅ معيار القبول:
pnpm lint:strict ينتهي بـ exit code = 0 بدون أي تحذيرات
(warnings) أو أخطاء (errors)، ويظهر Status: PASS في السجل تحت
STEP 04-lint-strict.

الخطوة 6: فحص أنواع TypeScript type-check
الهدف:
تشغيل tsc --noEmit عبر كامل المونوريبو للتأكد من سلامة الأنواع
بدون توليد أي مخرجات .js.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
```bash
STEP="05-type-check"
SCRIPT="type-check"
```
كرّر القالب الموحّد. السكربت داخلياً يعتمد على turbo لاكتشاف
الـ Project References ويُنفّذ tsc -b --noEmit أو ما يكافئه على
كل حزمة وتطبيق.
ملاحظة حرجة:
لا تنفّذ tsc يدوياً خارج سكربت type-check.
الخروج عن الـ Project References يُنتج أخطاء كاذبة.
في حالة الفشل:
السجل سيحتوي تقرير أخطاء بصيغة
path/file.ts(line,col): error TS####.
✅ معيار القبول:
pnpm type-check ينتهي بـ exit code = 0 بدون أي
error TS####، ويظهر Status: PASS في السجل تحت
STEP 05-type-check.

الخطوة 7: تشغيل الاختبارات test:strict
الهدف:
تنفيذ مجموعة الاختبارات بالوضع الصارم (يشمل prepush:verify)
للتأكد من اجتياز جميع اختبارات الوحدة والتكامل قبل أي push.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
```bash
STEP="06-test-strict"
SCRIPT="test:strict"
```
كرّر القالب الموحّد. السكربت يجب أن يشغّل:

pnpm prepush:verify كخطوة سابقة (Pre-check).
ثم إطار الاختبارات بوضع صارم (مثلاً vitest run --coverage أو
jest --ci --runInBand حسب المُعتمد).

ملاحظة الذاكرة:
على بعض الأنظمة، اختبارات المونوريبو الكبيرة قد تتطلب رفع حد
ذاكرة Node:
NODE_OPTIONS="--max-old-space-size=4096"
أضِف هذا قبل الأمر إن ظهرت أخطاء OOM.
في حالة الفشل:
السجل سيحتوي تقرير الاختبارات الفاشلة (assertion errors, snapshots
mismatches, async timeouts). الإصلاح خارج نطاق هذه الخطة.
✅ معيار القبول:
pnpm test:strict ينتهي بـ exit code = 0، جميع الاختبارات تجتاز
بنجاح، تغطية الكود (إن وُجد threshold) لا تقل عن الحد الأدنى
المعرّف، ويظهر Status: PASS في السجل تحت STEP 06-test-strict.

الخطوة 8: بناء جميع المشاريع build:all
الهدف:
تشغيل البناء الإنتاجي لكل التطبيقات والحزم في المونوريبو عبر
turbo build للتأكد من عدم وجود أخطاء بناء قبل فحص الميزانيات.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.
مخرجات البناء داخل apps/*/dist, apps/*/.next, packages/*/dist
(تتولّاها turbo بنفسها).

التنفيذ:
```bash
STEP="07-build-all"
SCRIPT="build:all"
```
كرّر القالب الموحّد. السكربت داخلياً يستدعي:
turbo run build --filter=...
ويعتمد على turbo.json لتحديد التبعيات بين البناءات.
ملاحظة Turbo Cache:
إذا كانت الـ Cache مفعّلة، سيتم تخطي الحزم غير المتغيرة.
هذا مقبول داخل خط الأنابيب — لا تضف --force ولا تمسح الكاش.
في حالة الفشل:
السجل سيحتوي مخرجات turbo كاملة مع تحديد الحزمة الفاشلة.
الإصلاح خارج نطاق هذه الخطة.
✅ معيار القبول:
pnpm build:all ينتهي بـ exit code = 0، كل الحزم والتطبيقات
تظهر في تقرير turbo بحالة cached أو built، ويظهر
Status: PASS في السجل تحت STEP 07-build-all.

الخطوة 9: التحقق من حدود الحجم guard:budgets
الهدف:
التأكد من أن مخرجات البناء (Bundle sizes) لا تتجاوز الحدود
المعرّفة في إعدادات guard:budgets لكل تطبيق وحزمة.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: نتيجة الخطوة.

التنفيذ:
```bash
STEP="08-guard-budgets"
SCRIPT="guard:budgets"
```
كرّر القالب الموحّد. هذه الخطوة تعتمد على وجود مخرجات بناء من
الخطوة 8، فلا يجوز تشغيلها مستقلة.
في حالة الفشل:
السجل سيحتوي قائمة الحزم التي تخطّت الميزانية مع الحجم الفعلي
والحد الأقصى المسموح به.
✅ معيار القبول:
pnpm guard:budgets ينتهي بـ exit code = 0، كل bundle داخل
الحدود المسموحة، ويظهر Status: PASS في السجل تحت
STEP 08-guard-budgets.

الخطوة 10: إصدار ملخص نهائي للجلسة
الهدف:
كتابة قسم ختامي في ملف السجل يلخّص نتائج كل الخطوات في جدول قصير،
ويطبع رسالة نجاح/فشل واضحة على stdout.
الملفات:

${VALIDATE_LOG_FILE} — إلحاق: قسم الملخص النهائي.

التنفيذ:
```bash
{
  echo ""
  echo "==================================================================="
  echo "  Pipeline Summary"
  echo "==================================================================="
  echo "Ended:    $(date -Iseconds)"
  echo ""
  echo "Step                          Status"
  echo "----                          ------"
  grep -E "^STEP|^Status:" "${VALIDATE_LOG_FILE}" \
    | paste - - \
    | awk -F'\t' '{printf "%-30s %s\n", $1, $2}'
  echo ""
  echo "Final:    ALL PASS"
  echo "==================================================================="
} >> "${VALIDATE_LOG_FILE}"

echo ""
echo "اكتمل خط الأنابيب بنجاح — جميع الفحوصات الثمانية اجتازت."
echo "السجل الكامل: ${VALIDATE_LOG_FILE}"
```
ملاحظة:
هذه الخطوة تُنفَّذ فقط إذا اكتملت الخطوات من 2 إلى 9 بنجاح.
في حالة الفشل المبكر، الخطوة المسؤولة عن الفشل تكتب
Status: FAIL ثم تستدعي exit، فلا تصل الخطوة 10 أبداً، وهذا
سلوك مقصود.
✅ معيار القبول:
عند نجاح كل الخطوات، الملف ${VALIDATE_LOG_FILE} ينتهي بقسم
Pipeline Summary يحتوي جدول الخطوات الثماني مع PASS بجوار كل
منها وسطر Final: ALL PASS. وعلى stdout تظهر رسالة:
اكتمل خط الأنابيب بنجاح — جميع الفحوصات الثمانية اجتازت.

ملاحظات ختامية

التشغيل كأمر واحد:
يمكن تجميع الخطوات 1 إلى 10 في سكربت Shell واحد
scripts/run-validate-pipeline.sh لإعادة الاستخدام، لكن هذا
خارج نطاق الخطة الحالية وعند الحاجة يُطلب وركفلو منفصل.
التكامل مع CI:
نفس التسلسل يصلح خطوة validate في GitHub Actions أو
GitLab CI، مع رفع ${VALIDATE_LOG_FILE} كـ Artifact.
عدم الإصلاح التلقائي:
هذه الخطة Read-only بالكامل. أي عملية إصلاح
(format, lint --fix, إعادة توليد snapshots) تتم في وركفلو
منفصل مخصص للإصلاح، ثم يُعاد تشغيل هذه الخطة من الصفر.
قراءة السجل:
للوصول السريع إلى الأخطاء فقط:
grep -E "Status:|error" "${VALIDATE_LOG_FILE}".
سياسة الاحتفاظ:
مجلد .validation-logs/ مُستبعد من Git. ينصح بمسحه دورياً
(find .validation-logs -type f -mtime +14 -delete) لتجنب
تراكم السجلات.
حالة Windows:
استبدل bash المقاطع بـ PowerShell 7+ ووحدة معالجة أخطاء
مكافئة:
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }.
التوسعة المستقبلية:
أي خطوة فحص إضافية (مثل e2e:strict أو accessibility:check)
تُضاف بنفس قالب التنفيذ الموحّد بعد الخطوة 9 وقبل الخطوة 10.