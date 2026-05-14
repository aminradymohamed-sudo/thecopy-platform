# خطة تنفيذ إصلاح إخفاقات صفحة العصف الذهني

> **لمنفذ آلي:** المهارة الفرعية المطلوبة عند التنفيذ هي مهارة تنفيذ الخطط أو مهارة التطوير المدفوع بوكلاء فرعيين.
> اتبع المربعات بندًا بندًا ولا تعدل ملفات الفحص بما يضعفها.

**الهدف:** إغلاق كل الحالات الفاشلة في تقرير الاختبار الميداني لصفحة العصف الذهني.

**المعمارية:** الإصلاح مقسم إلى خمس حزم مستقلة: دلالات الوصولية، رسائل التحقق، استجابة الواجهة، الرفع الآمن، والتخزين غير الحساس. كل حزمة تبدأ باختبار فاشل محدد ثم تعديل محدود ثم تحقق حي يعيد تشغيل الحالات المتأثرة.

**التقنيات:** React، Next، Vitest، Testing Library، Playwright، pnpm.

---

## نطاق الإغلاق

التقرير المرجعي:

```text
artifacts/brain-storm-ai/latest-report.json
```

الحالات الفاشلة المطلوب إغلاقها:

```text
A11Y-01
A11Y-02
A11Y-04
A11Y-07
A11Y-09
UX-01
UX-05
UX-11
PERF-05
PERF-06
VAL-07
SESS-03
```

الحالات غير الموجودة ليست ضمن إصلاح الإخفاقات الحالي، ولا يجوز تحويلها إلى نجاح إلا إذا أضيفت ميزات فعلية جديدة لها.

---

## ملفات العمل

تعديل:

```text
apps/web/src/app/(main)/brain-storm-ai/page.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/BrainStormContent.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/AgentCard.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/layout/AgentsSidebar.tsx
apps/web/src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.ts
apps/web/src/components/file-upload.tsx
apps/web/src/app/__integration__/brain-storm-ai.integration.test.tsx
```

إنشاء:

```text
apps/web/src/app/(main)/brain-storm-ai/src/lib/browserPersistence.ts
apps/web/src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx
apps/web/src/components/file-upload.test.tsx
```

إعادة استخدام:

```text
artifacts/brain-storm-ai/run-brain-storm-ai-test.mjs
```

---

## السبب الجذري حسب الإخفاق

| الحالة | السبب الجذري | الحزمة |
|---|---|---|
| A11Y-01 | أزرار أيقونية بلا اسم متاح | الوصولية |
| A11Y-02 | أزرار توسيع الوكلاء بلا تسمية | الوصولية |
| A11Y-04 | زر بدء الجلسة غير قابل للتركيز عند تعطيله | التحقق |
| A11Y-07 | أزرار المراحل ليست نموذج تبويبات بلوحة المفاتيح | الوصولية |
| A11Y-09 | بعد بدء الجلسة لا يبقى مدخل دلالي مكشوف للموضوع | الوصولية |
| UX-01 | تحميل الصفحة يعتمد على استيراد ديناميكي داخل عميل الصفحة | الأداء |
| UX-05 | لا توجد رسالة تحقق صريحة عند محاولة بدء جلسة فارغة | التحقق |
| UX-11 | عرض جانبي زائد على شاشة صغيرة بسبب حاويات لا تقيد العرض | التخطيط |
| PERF-05 | كل تغيير في المدخل يعيد رسم مساحة عمل كبيرة | الأداء |
| PERF-06 | تغيير المرحلة يعيد حساب ورسم أقسام أكثر من اللازم | الأداء |
| VAL-07 | رفض الملف غير المدعوم لا يترك أثرًا واضحًا في قائمة الملفات | الرفع |
| SESS-03 | التخزين المحلي يحتوي مفاتيح وقيم باسم جلسة ومحتوى كامل | التخزين |

---

## المهمة الأولى: اختبارات فاشلة قبل الإصلاح

**الملفات:**

```text
apps/web/src/app/__integration__/brain-storm-ai.integration.test.tsx
apps/web/src/components/file-upload.test.tsx
apps/web/src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx
```

- [ ] أضف اختبارات الوصولية والتدفق إلى ملف التكامل.

أضف حالات تغطي الآتي:

```tsx
it("exposes named agent expand buttons", async () => {
  render(<BrainStormContent />);
  await screen.findByText("منصة العصف الذهني الذكي");
  const buttons = screen.getAllByRole("button");
  expect(buttons.every((button) => button.textContent?.trim() || button.getAttribute("aria-label"))).toBe(true);
});

it("keeps phase controls keyboard selectable", async () => {
  const user = userEvent.setup();
  render(<BrainStormContent />);
  const phase = await screen.findByRole("tab", { name: /توليد الأفكار/ });
  phase.focus();
  await user.keyboard("{Enter}");
  expect(phase).toHaveAttribute("aria-selected", "true");
});

it("shows validation when starting without a brief", async () => {
  const user = userEvent.setup();
  render(<BrainStormContent />);
  const start = await screen.findByRole("button", { name: /بدء جلسة/ });
  await user.click(start);
  expect(await screen.findByRole("alert")).toHaveTextContent(/اكتب ملخص الفكرة/);
});
```

- [ ] أنشئ اختبار الرفع غير المدعوم.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileUpload from "./file-upload";

it("renders a visible error row for unsupported files", async () => {
  const user = userEvent.setup();
  render(<FileUpload onFileContent={vi.fn()} />);
  const input = document.getElementById("file-upload") as HTMLInputElement;
  const file = new File(["x"], "malicious.exe", { type: "application/x-msdownload" });
  await user.upload(input, file);
  expect(await screen.findByRole("alert")).toHaveTextContent(/غير مدعوم/);
  expect(screen.getByText("malicious.exe")).toBeInTheDocument();
});
```

- [ ] أنشئ اختبار التخزين.

```tsx
it("does not write brainstorm sessions to localStorage", async () => {
  localStorage.clear();
  await writeBrainstormStore({
    sessions: [],
    currentSessionId: null,
    version: 2,
  });
  expect(Object.keys(localStorage).join(" ")).not.toMatch(/session|auth|token|secret/i);
});
```

- [ ] شغل الاختبارات وتأكد أنها تفشل قبل الإصلاح.

```text
pnpm --filter @the-copy/web exec vitest run "src/app/__integration__/brain-storm-ai.integration.test.tsx" "src/components/file-upload.test.tsx" "src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx"
```

المتوقع:

```text
FAIL
```

---

## المهمة الثانية: إصلاح أسماء الأزرار ودلالات المراحل

**الملفات:**

```text
apps/web/src/app/(main)/brain-storm-ai/src/components/features/AgentCard.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/layout/AgentsSidebar.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
```

- [ ] في بطاقة الوكيل أضف اسمًا متاحًا لزر التوسيع.

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-6 w-6 p-0"
  onClick={onToggleExpand}
  aria-label={isExpanded ? `إخفاء تفاصيل ${agent.nameAr}` : `عرض تفاصيل ${agent.nameAr}`}
  title={isExpanded ? `إخفاء تفاصيل ${agent.nameAr}` : `عرض تفاصيل ${agent.nameAr}`}
>
```

- [ ] في شريط الوكلاء أضف اسمًا متاحًا لزر التبديل.

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowAllAgents(!showAllAgents)}
  aria-label={showAllAgents ? "عرض وكلاء المرحلة الحالية" : "عرض كل الوكلاء"}
>
```

- [ ] في لوحة التحكم حوّل المراحل إلى تبويبات دلالية.

```tsx
const handlePhaseKeyDown = (
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number
) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" ? 1 : -1;
  const nextIndex = (index + direction + phases.length) % phases.length;
  const nextPhase = phases[nextIndex];
  setActivePhase(nextPhase.id);
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLButtonElement>(`[data-brainstorm-phase="${nextPhase.id}"]`)
      ?.focus();
  });
};
```

```tsx
<div
  role="tablist"
  aria-label="مراحل جلسة العصف الذهني"
  className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
>
  {phases.map((phase, index) => (
    <Button
      key={phase.id}
      role="tab"
      type="button"
      data-brainstorm-phase={phase.id}
      aria-selected={activePhase === phase.id}
      aria-controls={`brainstorm-phase-panel-${phase.id}`}
      variant={activePhase === phase.id ? "default" : "outline"}
      className="h-auto min-w-0 p-4 text-right"
      onClick={() => setActivePhase(phase.id)}
      onKeyDown={(event) => handlePhaseKeyDown(event, index)}
    >
```

- [ ] تحقق من الحالات.

```text
pnpm --filter @the-copy/web exec vitest run "src/app/__integration__/brain-storm-ai.integration.test.tsx"
```

المتوقع:

```text
PASS
```

---

## المهمة الثالثة: إصلاح التحقق الفارغ وتركيز زر البدء

**الملف:**

```text
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
```

- [ ] أضف حالة رسالة تحقق محلية.

```tsx
const [briefError, setBriefError] = useState<string | null>(null);
const canStartSession = brief.trim().length > 0 && brief.length <= 5000 && !isLoading;

const handleStartClick = () => {
  if (!brief.trim()) {
    setBriefError("اكتب ملخص الفكرة قبل بدء الجلسة.");
    return;
  }
  if (brief.length > 5000) {
    setBriefError("ملخص الفكرة يتجاوز الحد الأقصى.");
    return;
  }
  setBriefError(null);
  onStartSession();
};
```

- [ ] لا تجعل زر البدء غير قابل للتركيز بسبب فراغ النص.

```tsx
<Button
  type="button"
  onClick={handleStartClick}
  disabled={isLoading}
  aria-disabled={!canStartSession}
  aria-describedby={briefError ? "brainstorm-brief-error" : undefined}
  className="w-full"
  size="lg"
>
```

- [ ] اعرض رسالة صريحة قابلة للقراءة.

```tsx
{briefError ? (
  <p
    id="brainstorm-brief-error"
    role="alert"
    aria-live="polite"
    className="rounded-md border border-amber-400/30 bg-amber-500/12 px-3 py-2 text-sm text-amber-100"
  >
    {briefError}
  </p>
) : null}
```

- [ ] تحقق من الحالات.

```text
pnpm --filter @the-copy/web exec vitest run "src/app/__integration__/brain-storm-ai.integration.test.tsx"
```

المتوقع:

```text
PASS
```

---

## المهمة الرابعة: إصلاح الدلالة بعد بدء الجلسة

**الملف:**

```text
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
```

- [ ] أضف مدخلًا نصيًا مقروءًا لقارئ الشاشة عند وجود جلسة حالية.

```tsx
<textarea
  readOnly
  aria-label="موضوع الجلسة الحالي"
  value={currentSession.brief}
  className="sr-only"
/>
```

- [ ] أضف منطقة دلالية للملخص.

```tsx
<section
  id={`brainstorm-phase-panel-${activePhase}`}
  role="tabpanel"
  aria-label="ملخص الجلسة الحالية"
  className="rounded-2xl border border-white/8 bg-white/6 p-4"
>
```

- [ ] تحقق من الحالة.

```text
pnpm exec node artifacts/brain-storm-ai/run-brain-storm-ai-test.mjs
```

المتوقع:

```text
A11Y-09 ناجح
```

---

## المهمة الخامسة: إصلاح رفض الملفات غير المدعومة

**الملف:**

```text
apps/web/src/components/file-upload.tsx
```

- [ ] أضف عنصر ملف فاشل عند رفض النوع.

```tsx
function addRejectedFile(file: File, messageText: string) {
  setFiles((prev) => [
    ...prev,
    {
      name: file.name,
      size: file.size,
      type: file.type,
      content: "",
      status: "error",
      progress: 0,
    },
  ]);
  setMessage(messageText);
  onUploadError?.(messageText);
}
```

- [ ] استخدمه في فحص الحجم والنوع.

```tsx
if (file.size > maxSize * 1024 * 1024) {
  addRejectedFile(file, `الملف ${file.name} كبير جداً. الحد الأقصى ${maxSize}MB`);
  return;
}

if (!getSupportedFileKind(file)) {
  addRejectedFile(
    file,
    `نوع الملف ${file.name} غير مدعوم. الأنواع المدعومة: PDF, DOCX, TXT`
  );
  return;
}
```

- [ ] أضف اسمًا متاحًا لزر حذف الملف.

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => removeFile(file.name)}
  aria-label={`إزالة الملف ${file.name}`}
>
```

- [ ] تحقق من الحالة.

```text
pnpm --filter @the-copy/web exec vitest run "src/components/file-upload.test.tsx"
```

المتوقع:

```text
PASS
```

---

## المهمة السادسة: إزالة حساسية التخزين المحلي

**الملفات:**

```text
apps/web/src/app/(main)/brain-storm-ai/src/lib/browserPersistence.ts
apps/web/src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.ts
apps/web/src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx
```

- [ ] أنشئ طبقة تخزين تستخدم قاعدة بيانات المتصفح بدل التخزين المحلي للجلسات.

```ts
const DB_NAME = "the-copy-brainstorm";
const STORE_NAME = "records";
const STORE_KEY = "saved-records-v2";

export interface BrainstormStorePayload<T> {
  sessions: T[];
  currentSessionId: string | null;
  version: number;
}
```

- [ ] أضف دوال القراءة والكتابة.

```ts
export async function writeBrainstormStore<T>(
  value: BrainstormStorePayload<T>
): Promise<void> {
  const db = await openBrainstormDatabase();
  await putValue(db, STORE_KEY, value);
}

export async function readBrainstormStore<T>(): Promise<BrainstormStorePayload<T> | null> {
  const db = await openBrainstormDatabase();
  return await getValue<BrainstormStorePayload<T>>(db, STORE_KEY);
}
```

- [ ] في الهوك اقرأ التخزين الجديد أولًا.

```ts
const stored = await readBrainstormStore<PersistedSavedSession>();
```

- [ ] بعد نجاح الترحيل احذف المفاتيح المحلية القديمة.

```ts
localStorage.removeItem(STORAGE_KEY);
localStorage.removeItem(STORAGE_KEY_LEGACY);
localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY);
localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY);
```

- [ ] لا تكتب جلسات جديدة إلى التخزين المحلي.

```ts
void writeBrainstormStore({
  sessions: store.sessions.map(serializeSavedSession),
  currentSessionId: currentId,
  version: 2,
});
```

- [ ] تحقق من الحالة.

```text
pnpm --filter @the-copy/web exec vitest run "src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx"
```

المتوقع:

```text
PASS
```

---

## المهمة السابعة: إصلاح التمدد الأفقي على الشاشات الصغيرة

**الملفات:**

```text
apps/web/src/app/(main)/brain-storm-ai/page.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/BrainStormContent.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/AgentCard.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/layout/AgentsSidebar.tsx
```

- [ ] قيّد عرض الجذر.

```tsx
<main
  style={shellStyle}
  className="relative isolate min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--page-bg)]"
>
```

- [ ] قيّد الحاوية الداخلية.

```tsx
<div className="relative z-10 mx-auto w-full max-w-[1600px] overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 md:py-6">
```

- [ ] أضف حدود عرض للأعمدة.

```tsx
<div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
  <div className="min-w-0 space-y-6 lg:col-span-2">
  <div className="min-w-0 space-y-6">
```

- [ ] أضف التفافًا آمنًا للنصوص الطويلة.

```tsx
className="break-words"
```

- [ ] تحقق من الحالة.

```text
pnpm exec node artifacts/brain-storm-ai/run-brain-storm-ai-test.mjs
```

المتوقع:

```text
UX-11 ناجح
```

---

## المهمة الثامنة: تحسين التحميل والاستجابة

**الملفات:**

```text
apps/web/src/app/(main)/brain-storm-ai/page.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/BrainStormContent.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/ControlPanel.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/layout/AgentsSidebar.tsx
apps/web/src/app/(main)/brain-storm-ai/src/components/features/AgentCard.tsx
```

- [ ] استبدل الاستيراد الديناميكي باستيراد ثابت.

```tsx
import BrainStormContent from "./src/components/BrainStormContent";
```

- [ ] احذف كتلة التحميل الديناميكي.

```tsx
const BrainStormContent = dynamic(...)
```

- [ ] لف المكونات الثقيلة بالتذكير.

```tsx
export default memo(AgentCard);
```

```tsx
export default memo(AgentsSidebar);
```

- [ ] اجعل تغيير المرحلة انتقالًا خفيفًا.

```tsx
const [isPendingPhaseChange, startPhaseTransition] = useTransition();

const selectPhase = (phase: BrainstormPhase) => {
  startPhaseTransition(() => setActivePhase(phase));
};
```

- [ ] استخدم الاختيار الخفيف في أزرار المراحل.

```tsx
onClick={() => selectPhase(phase.id)}
```

- [ ] تحقق من الأداء.

```text
pnpm exec node artifacts/brain-storm-ai/run-brain-storm-ai-test.mjs
```

المتوقع:

```text
UX-01 ناجح
PERF-05 ناجح
PERF-06 ناجح
```

---

## المهمة التاسعة: تشغيل تحقق نهائي كامل

- [ ] شغل اختبارات الوحدة والتكامل المتأثرة.

```text
pnpm --filter @the-copy/web exec vitest run "src/app/__integration__/brain-storm-ai.integration.test.tsx" "src/components/file-upload.test.tsx" "src/app/(main)/brain-storm-ai/src/hooks/useSessionPersistence.test.tsx"
```

المتوقع:

```text
PASS
```

- [ ] شغل فحص النوع للمشروع.

```text
pnpm --filter @the-copy/web type-check
```

المتوقع:

```text
PASS
```

- [ ] شغل الاختبار الميداني نفسه.

```text
pnpm exec node artifacts/brain-storm-ai/run-brain-storm-ai-test.mjs
```

المتوقع:

```text
فاشل: 0
محجوب: 0
```

- [ ] افحص التقرير النهائي.

```text
artifacts/brain-storm-ai/latest-report.json
```

يجب أن تتحول الحالات التالية إلى نجاح:

```text
A11Y-01
A11Y-02
A11Y-04
A11Y-07
A11Y-09
UX-01
UX-05
UX-11
PERF-05
PERF-06
VAL-07
SESS-03
```

---

## ترتيب التنفيذ الفوري

1. نفذ المهمة الأولى.
2. نفذ المهمة الثانية.
3. نفذ المهمة الثالثة.
4. نفذ المهمة الرابعة.
5. نفذ المهمة الخامسة.
6. نفذ المهمة السادسة.
7. نفذ المهمة السابعة.
8. نفذ المهمة الثامنة.
9. نفذ المهمة التاسعة.

لا تنتقل من مهمة إلى التالية إذا فشل اختبارها المحدد.

لا تعدل مشغّل الاختبار لتخفيف أي فحص.

لا تعتبر إصلاحًا ناجحًا إلا بعد تشغيل الاختبار الميداني الكامل.
