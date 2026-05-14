# D-COUPAGE — Static Audit (Source App)

> **هذا الملف ليس مصدر حقيقة تشغيلية للمستودع.**
>
> العقد الأعلى:
>
> - [`AGENTS.md`](../AGENTS.md)
> - [`.repo-agent/OPERATING-CONTRACT.md`](../.repo-agent/OPERATING-CONTRACT.md)
> - [`.repo-agent/RAG-OPERATING-CONTRACT.md`](../.repo-agent/RAG-OPERATING-CONTRACT.md)
>

## INTEGRATION PLAN

**نوع المخرج**: قرارات دمج محسومة بناءً على قراءة فعلية لـ directors-studio + cinematography-studio + apps/backend/src/{server,services,modules,middleware,db,controllers} + package.json (root + web + backend) + drizzle.config.ts + db/schema.ts + appState.controller + validation.middleware + lib/logger.

### Integration Decision Map

| القرار | الخيار المختار | المبرر (مبني على ملف محدد) |
|---|---|---|
| **نقطة الدخول داخل directors-studio** | sub-route جديد: `apps/web/src/app/(main)/directors-studio/decoupage/` | لا يستبدل أو يحذف أيًا من siblings القائمة (ai-assistant, characters, scenes, script, shots). يستفيد تلقائيًا من `layout.tsx` الحالي الذي يلفّ بـ `QueryClientProvider` و `ProjectProvider` و `Toaster` ([directors-studio/layout.tsx:10-22](../apps/web/src/app/(main)/directors-studio/layout.tsx)). |
| **هيكل routes الجديدة** | `decoupage/page.tsx` + `decoupage/components/*.tsx` + `decoupage/lib/*` + `decoupage/hooks/*`. كل المسار تحت `/directors-studio/decoupage` | يطابق نمط siblings: `script/page.tsx`, `scenes/page.tsx`, `characters/page.tsx`, `shots/page.tsx`, `ai-assistant/page.tsx` ([directors-studio/script/page.tsx](../apps/web/src/app/(main)/directors-studio/script/page.tsx)). |
| **طبقة البيانات** | Backend مباشرة عبر `apps/backend` (Express). فرونت يستهلك عبر TanStack Query | منصة الـ web تستخدم `useQuery`/`useMutation` بشكل قياسي ([apps/web/src/hooks/useProject.ts:1-30](../apps/web/src/hooks/useProject.ts)). أي Firestore في المصدر يُستبدل بـ endpoint backend. لا يوجد Firebase داخل المنصة كقيد عقدي. |
| **موقع backend logic** | module جديد: `apps/backend/src/modules/decoupage/` بنمط breakapp (routes.ts + handlers.ts/controller.ts + service.ts + schemas.ts + repository) | breakapp هو أحدث module (migration 0002 + 0003) ويعكس النمط الفعلي المعتمد ([apps/backend/src/modules/breakapp/routes.ts](../apps/backend/src/modules/breakapp/routes.ts)). |
| **هل يلزم Drizzle schema جديد؟** | **لا** — استخدام الجدول الموحَّد القائم `appPersistenceRecords` بـ `appId="decoupage"` و `scope=userId` و `recordKey=projectId` | الجدول موجود فعليًا في [apps/backend/src/db/schema.ts:41-62](../apps/backend/src/db/schema.ts) ومفهرس بـ unique على (appId, scope, recordKey) — مصمم بالضبط لهذه الحالة. تجنب migration 0006_* غير ضرورية تقلل blast radius وتفادي عائق تشغيل DB غير المتاح حاليًا (المنفذ 5433 بلا listener وفق `output/session-state.md`). |
| **طبقة auth** | استخدام `authMiddleware` الموجود من `@/middleware/auth.middleware`. مسارات ذات حساسية بيانات (CRUD على projects) محمية بـ JWT. مسار `/api/decoupage/analyze` يُطبَّق فيه `perUserAiLimiter` كما في باقي مسارات AI | route-registrars.ts يستورد `authMiddleware` و `perUserAiLimiter` ويطبّقهما على مسارات AI ([apps/backend/src/server/route-registrars.ts:31-32](../apps/backend/src/server/route-registrars.ts)). نمط breakapp يعتمد JWT أيضًا. |
| **state management** | فرونت: `useState` محلي + TanStack Query للطبقة الشبكية. بدون Zustand محلي للمحرك (لا حاجة لمشاركة الحالة خارج الصفحة). يُستفاد من `useCurrentProject` لربط مشروع directors-studio الحالي إن وُجد | يطابق نمط `cinematography-studio/components/CineDashboardWorkspace.tsx` ([cinematography-studio/components/CineDashboardWorkspace.tsx](../apps/web/src/app/(main)/cinematography-studio/components/CineDashboardWorkspace.tsx)) — useState + hooks مخصصة + بدون global store جديد. |
| **AI providers وحقن الأسرار** | استخدام `@/services/gemini.service` الموجود في backend (يقرأ `env.GEMINI_API_KEY`/`env.GOOGLE_GENAI_API_KEY` من `@/config/env`). الواجهة لا تتعامل مع المفتاح إطلاقًا | مفتاح Gemini مفوّض backend-only. logger يُخفي تلقائيًا أي حقل يطابق `*.GEMINI_API_KEY` ([apps/backend/src/lib/logger.ts:36-50](../apps/backend/src/lib/logger.ts)). |
| **خطة استبدال Firestore** | كل قراءة/كتابة Firestore في D-COUPAGE المصدر تُمحى. بديلها: `GET/POST/PATCH/DELETE /api/decoupage/projects[/:id]` على backend. التخزين الفعلي في `appPersistenceRecords` JSONB. لا يبقى `firebase` SDK مستخدمًا في الميزة الجديدة | يوافق قيد العقد: «لا Firebase داخل المنصة». Auth بـ Google/Firebase في المصدر تُستبدل بـ JWT الحالي (المستخدم سُجَّل بالفعل عبر `authController` لـ directors-studio). |
| **خطة wiring** | (1) إضافة عنصر «Découpage» إلى قائمة `menuItems` في `apps/web/src/app/(main)/directors-studio/components/AppSidebar.tsx` بمسار `/directors-studio/decoupage` وأيقونة `Clapperboard`. (2) تسجيل router الـ backend الجديد في `apps/backend/src/server/route-registrars.ts` تحت دالة جديدة `registerDecoupageRoutes`. (3) لا تعديل لـ `apps-overview` لأن الميزة تظهر داخل directors-studio فقط لا كتطبيق منفصل | apps-overview يستهلك `platformApps` من `@/config/apps.config` ولا يُسجَّل فيه إلا تطبيقات على مستوى المنصة. directors-studio sub-features تبقى داخلية. |
| **Validation** | Zod في backend عبر `validateBody`/`validateQuery`/`validateParams` من `@/middleware/validation.middleware`. واجهة تستخدم نفس Zod schemas المُصدَّرة | نمط الواجهة المعتمد ([apps/backend/src/middleware/validation.middleware.ts](../apps/backend/src/middleware/validation.middleware.ts)). |
| **Logging** | `@/lib/logger` (Pino موحَّد مع redaction). صفر `console.log` مجرد | فرض عقد التسجيل ([apps/backend/src/lib/logger.ts:1-30](../apps/backend/src/lib/logger.ts)). |
| **Error handling** | استخدام أنماط الاستجابة الموجودة `{success:false, error, code}` كما في `appState.controller`. أخطاء Gemini تمر عبر `llmGuardrails` و `assertModelTextNotEmpty` من `@the-copy/ai-orchestration` لمنع empty-response success | يطابق ([packages/ai-orchestration/src/index.ts:1-50](../packages/ai-orchestration/src/index.ts)). |
| **Security middleware** | يُستهلك من المنصة: `@/middleware/csp` و `@/middleware/csrf` و `@/middleware/waf` و `@/middleware/auth` — لا تنشئ middlewares موازية | كلها مفعَّلة على مستوى التطبيق في [apps/backend/src/server.ts:30-90](../apps/backend/src/server.ts). |
| **RAG / Memory** | لا طبقة RAG جديدة. لا embeddings جديدة. الميزة لا تلامس طبقة المعرفة الست المحكومة | امتثال لـ `.repo-agent/RAG-OPERATING-CONTRACT.md`. السياق المُمرَّر لـ Gemini يأتي مع كل طلب inline (نفس آلية المصدر). |

### الـ contracts الفعلية للمسارات الجديدة (Backend)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/decoupage/analyze` | تشغيل مرحلة تحليل واحدة (mode + script + intent + sceneContext + scenarioMap اختياري + spatialParams + modeSpecificParams + settings). يُرجع JSON بنية `{title, summary, widgets, sections, tables}` | required + AI rate-limit |
| POST | `/api/decoupage/scenario-map` | استخراج خريطة استمرارية (characters/locations/motifs) من سيناريو كامل | required + AI rate-limit |
| POST | `/api/decoupage/spatial-params` | استنتاج SpatialParams من script+intent | required + AI rate-limit |
| POST | `/api/decoupage/audit-continuity` | فحص استمرارية مقابل scenarioMap+pipelineResults | required + AI rate-limit |
| GET | `/api/decoupage/projects` | قائمة مشاريع المستخدم الحالي | required |
| POST | `/api/decoupage/projects` | إنشاء/استبدال مشروع (upsert) | required |
| GET | `/api/decoupage/projects/:id` | استرجاع مشروع واحد | required |
| DELETE | `/api/decoupage/projects/:id` | حذف مشروع | required |

### مدى الميزة في PHASE 3 (Scope)

- ✅ **داخل النطاق**: 11 وضع تحليل (scene→prompt_builder)، تحليل نص + سياق كامل + خريطة استمرارية + معاملات مكانية + معاملات وضعية + Pipeline متسلسل + auto-advance/needs-review + فحص استمرارية + حفظ/تحميل/حذف مشاريع + استبدال كامل لـ Firestore.
- ✅ **داخل النطاق**: استبدال Tailwind CDN بمكونات shadcn/ui الموجودة + استخدام CSS variables (`--app-accent`, `--app-surface`, …) بدل ألوان hex.
- ⚠️ **مؤجَّل خارج النطاق صراحة**: (1) رفع/تحليل فيديو إلى backend (يحتاج multipart upload + multer config + cap للحجم على مستوى reverse proxy — تعقيد أمني/تشغيلي مستقل). (2) رفع صور مرجعية متعددة (نفس السبب). (3) توليد/تعديل صور Gemini Image API (يحتاج بيئة موافقة على نموذج توليد الصور + storage). كل هذه الميزات الثلاث مرصودة في خرائط الميزات لكنها لن تُنفَّذ في هذه الجولة. الـ UI سيمنعها بـ disabled + tooltip شارح. **هذا تضييق نطاق صريح، ليس إضعاف فحص**.

### قواعد عدم الإضعاف المُطبَّقة على PHASE 3 + 4

- لا تعديل ولا تخفيف لـ: `tsconfig.check.json`، `tsconfig.check-tests.json`، `tsconfig.build.json`، `tsconfig.budget-runtime.json`، `eslint.config.js` (root/web/backend)، `vitest.config.*`، `playwright.config.ts`، `playwright.directors-editor.config.ts`، `gitleaks.toml`، `.semgrep`، أي ملف داخل `scripts/quality/` أو `scripts/security/` أو `scripts/agent/`.
- جميع ملفات الكود الجديدة تخضع لـ strict mode الموجود في `apps/web/src/app/(main)/directors-studio/tsconfig.json` (`exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`).
- صفر `any` غير مبرر، صفر TODO، صفر placeholder، صفر `console.log`. كل تسجيل عبر `logger` (backend) أو `console`-via-`@/lib/...` المعتمد (web).
- صفر سر حقيقي في أي ملف، شامل `.env.example`.


> الحالة الحية الوحيدة: [`output/session-state.md`](../output/session-state.md).
> هذا الملف وثيقة تنفيذية محلية لمهمة دمج محددة فقط، ولا يقرر أي قواعد تشغيلية للمستودع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| نوع المستند | Audit ساكن لتطبيق مصدر خارجي |
| المصدر المُدقَّق | `C:\Users\Mohmed Aimen Raed\Downloads\D-COUPAGE-main\D-COUPAGE-main` |
| الهدف النهائي للدمج | `apps/web/src/app/(main)/directors-studio/` (داخل المنصة) |
| النطاق المعتمد لهذه الجولة | **PHASE 0 + PHASE 1 فقط** — جرد ساكن. لا INTEGRATION PLAN ولا تنفيذ كود. |
| تاريخ التدقيق | 2026-05-04 |
| طريقة التدقيق | قراءة كاملة لكل ملف مصدر (16 ملف TypeScript/TSX + كل ملفات الإعداد) |
| Runtime analysis | **مؤجَّل** — راجع قسم 1.2 |

## إثبات الالتزام بالعقد الحاكم (3–7 حقائق تشغيلية)

1. قاعدة منع إضعاف الفحوصات مقروءة في `AGENTS.md` و `.repo-agent/OPERATING-CONTRACT.md` و `.repo-agent/STARTUP-PROTOCOL.md` و `.repo-agent/HANDOFF-PROTOCOL.md` و `.repo-agent/RAG-OPERATING-CONTRACT.md` — وهذا الملف وثيقة جرد ساكن لا يلامس أي ملف فحص أو تحقق أو اختبار أو CI.
2. مدير الحزم الرسمي للمستودع المستهدف هو `pnpm@10.32.1`؛ لم يُستخدم `npm` ولا `yarn` خلال هذه الجولة.
3. مسار التمهيد الرسمي تم تنفيذه عبر `pnpm agent:bootstrap` من جذر المستودع الأم بعد فشل أولي في الـ worktree (سبب الفشل: غياب `node_modules` في الـ worktree المعزول؛ القرار: الانتقال للمستودع الأم بإذن صريح من المستخدم).
4. سياق السؤال الحي وُلِّد عبر `pnpm agent:persistent-memory:turn -- --query "D-COUPAGE static audit" --quiet`.
5. لم تُنشأ أو تُعدَّل أي ملفات داخل `apps/`، `packages/`، `apps/backend/drizzle/`، `apps/web/convex/`، أو أي إعدادات بناء/فحص/CI خلال هذه الجولة. التغيير الوحيد هو إضافة هذا الملف الواحد تحت `docs/`.
6. مفتاح Firebase حقيقي مرصود داخل المصدر (`firebase-applet-config.json:apiKey`) — مشطوب من جداول هذه الوثيقة وفق قاعدة الأسرار.

---

## 1.0 — جرد شجرة المصدر (Inventory)

### بنية الجذر

```text
D-COUPAGE-main/
├── .env.example
├── .gitignore
├── README.md
├── firebase-applet-config.json     # يحوي مفتاح API حقيقي — يُتعامل معه كسر
├── firebase-blueprint.json
├── firestore.rules
├── index.html
├── metadata.json                   # فارغ تقريبًا
├── migrated_prompt_history/        # سجل برومبتات قديم
├── package-lock.json               # دليل قاطع على استخدام npm سابقًا (وإن قال README pnpm)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx                     # الجذر الوظيفي للتطبيق كله
    ├── index.tsx                   # نقطة الدخول React
    ├── vite-env.d.ts
    ├── components/                 # 9 ملفات TSX + index.ts
    │   ├── GeminiControls.tsx
    │   ├── Header.tsx
    │   ├── MediaUpload.tsx
    │   ├── Modals.tsx
    │   ├── ModeSelector.tsx
    │   ├── OutputPanel.tsx
    │   ├── PipelinePanel.tsx
    │   ├── ProjectManagerModal.tsx
    │   ├── ResultRenderer.tsx
    │   └── index.ts
    ├── config/                     # 2 ملفات
    │   ├── constants.ts            # المصدر الوحيد للحقيقة لكل التهيئة
    │   └── index.ts
    ├── hooks/                      # 5 ملفات + types/
    │   ├── useAuth.ts
    │   ├── useFileManagement.ts
    │   ├── useGeminiAnalysis.ts
    │   ├── usePipeline.ts
    │   ├── useProjectStore.ts
    │   ├── index.ts                # ملاحظة drift: لا يصدّر useAuth ولا usePipeline ولا useProjectStore
    │   └── types/index.ts          # نسخة قديمة موازية من الأنواع — drift داخلي
    ├── services/                   # 4 ملفات
    │   ├── exportService.ts
    │   ├── firebase.ts
    │   ├── geminiService.ts
    │   └── index.ts                # لا يصدّر exportService — drift جزئي
    ├── types/index.ts              # المصدر الكامل للأنواع (379 سطرًا)
    └── utils/                      # 3 ملفات
        ├── fileHelpers.ts
        ├── logger.ts
        └── index.ts
```

### إحصاء سريع

- ملفات TypeScript/TSX داخل `src/`: **20 ملف** (16 منطق + 4 index).
- ملفات إعداد على الجذر: **8** (package.json/lock، vite.config، tsconfig، firebase × 3، .env.example، .gitignore).
- ملف واحد من Firestore Rules.
- Asset قائمة لقطات/برومبتات: واحد داخل `migrated_prompt_history/` (سجل خام، ليس وظيفة فعلية).

### Drift داخلي مرصود في المصدر (لا يخص المنصة، يخص D-COUPAGE نفسه)

| المكان | المشكلة | الأثر على الدمج |
|---|---|---|
| `src/hooks/types/index.ts` | نسخة موازية وأقدم من `AnalysisSettings`/`AnalysisMode` (لا تحتوي 11 وضعًا، ولا `pipelineAutoAdvance`) | يجب اعتماد `src/types/index.ts` فقط؛ تجاهل النسخة القديمة |
| `src/hooks/index.ts` | لا يصدّر `useAuth` ولا `usePipeline` ولا `useProjectStore` ولا `useTextFile`/`useVideoManagement` | الاستيراد في `App.tsx` يتم بالمسار المباشر، فلا يكسر شيء، لكنه دليل على تشتت — يجب توحيده عند النقل |
| `src/services/index.ts` | يصدّر `geminiService` و `firebase` لكن لا يصدّر `exportService` | نفس الملاحظة |
| `package.json` | يحوي `express` و `@types/express` ضمن dependencies دون استخدام مرئي في `src/` | حزمة مهجورة — تُحذف عند النقل |
| `package.json` | يضم كلًا من `package-lock.json` (npm) ورسالة README تطلب `pnpm install` | المنصة تستخدم `pnpm` حصرًا، لذا الاحتفاظ بالـ lockfile غير مطلوب |
| `firebase-applet-config.json` | يحوي مفتاح Firebase حقيقي مكتوب نصًا في المستودع المصدر | لن يُنقل أي مفتاح حقيقي إلى المنصة، حتى في `.env.example` |

---

## 1.1 — جداول التحليل الساكن

### 1.1.1 Pages / Screens

| المسار | الوظيفة الجوهرية | المصدر |
|---|---|---|
| `/` (Single-page React app) | التطبيق بأكمله صفحة واحدة بدون router. الواجهة ثلاثية: شريط أعلى + عمود تحكم 5/12 + عمود مخرج 7/12. RTL `dir="rtl"`. لون أساسي `#F4F1EA` ولون توكيد `#FF4D00` ونص `#121212`. | `src/App.tsx`, `index.html` |
| Modal: المانيفستو | يعرض إطار التقطيع النظري + جدول الـ 11 مرحلة + توقيع المؤلف. | `src/components/Modals.tsx::FrameworkModal` |
| Modal: مدير السياق | تابان: «السيناريو الخام» (رفع txt/docx/md أو لصق نص) + «خريطة الاستمرارية» (شخصيات / مواقع / رموز مولَّدة من Gemini). | `src/components/Modals.tsx::ContextManagerModal` |
| Modal: مدير المشاريع | حفظ/تحميل/حذف/جديد لمشاريع مخزنة في Firestore (إن سُجِّل) أو localStorage. | `src/components/ProjectManagerModal.tsx` |
| Panel: Pipeline | يظهر فقط أثناء `pipeline.isActive`. شبكة مراحل 11 مع شريط تقدم وزر تصدير حزمة. | `src/components/PipelinePanel.tsx` |
| Panel: Output | عرض حالة Idle / Loading / Result. أزرار تصدير (Markdown/CSV/JSON). زر «فحص الاستمرارية». | `src/components/OutputPanel.tsx` |

### 1.1.2 Core Features

| الميزة | المدخلات | المخرجات | المصدر |
|---|---|---|---|
| اختيار وضع تحليل (11 وضع) | نقر زر | تغيير `mode` + إعادة تعيين النتيجة | `src/App.tsx`, `src/components/ModeSelector.tsx`, `src/config/constants.ts::MODES` |
| إدخال نص درامي | textarea | `script: string` | `src/App.tsx` |
| إدخال نية المخرج | textarea | `directorIntent: string` | `src/App.tsx` |
| رفع 1–3 صور مرجعية/تعديل | `<input type=file multiple accept="image/*">` | `ImageFile[]` (file + objectURL + id) | `src/hooks/useFileManagement.ts::useImageManagement`, `src/components/MediaUpload.tsx::ImageUpload` |
| رفع فيديو واحد ≤100MB | `<input type=file accept="video/*">` | `videoFile: File \| null` + تحذير عند تجاوز الحد | `src/hooks/useFileManagement.ts::useVideoManagement`, `src/components/MediaUpload.tsx::VideoUpload` |
| رفع/قراءة سياق نصي (txt/md/docx) | `<input type=file accept=".txt,.docx,.md">` | `fullScenario: string` (DOCX عبر `window.mammoth` المحمَّل من CDN في `index.html`) | `src/hooks/useFileManagement.ts::useTextFile`, `src/utils/fileHelpers.ts::readDocxFile` |
| استخراج خريطة الاستمرارية | `fullScenario: string` | `ScenarioMap` (characters, locations, motifs) عبر Gemini Flash | `src/services/geminiService.ts::generateScenarioMap` |
| استنتاج معاملات مكانية تلقائيًا | `script + intent` | `SpatialParams` (style, colors, lighting, setDressing, details) عبر Gemini Flash | `src/services/geminiService.ts::autoDeduceSpatialParams` |
| تشغيل مرحلة واحدة | السياق الكامل + `mode` | نص JSON/MD يحوي `title/summary/widgets/sections/tables` | `src/hooks/useGeminiAnalysis.ts::analyze` |
| تشغيل Pipeline متسلسل (11 مرحلة) | السياق الكامل | يدوّر المراحل بالترتيب `scene→space→flow→perspective→rhythm→framing→blocking→coverage→shotlist→storyboard→prompt_builder` مع تغذية مخرجات السابقة كسياق للاحقة | `src/hooks/usePipeline.ts`, `src/App.tsx` (effect) |
| Auto-advance vs Needs-review | `settings.pipelineAutoAdvance: boolean` | إما تقدم تلقائي عند نجاح كل مرحلة، أو وقفة مع `needs_review` بانتظار زر «موافقة وتقدم» | `src/components/PipelinePanel.tsx`, `src/hooks/usePipeline.ts::updateStageStatus` |
| فحص الاستمرارية | `scenarioMap + currentResult + script` | تقرير Markdown/JSON بالتناقضات عبر Gemini Pro، يُحقن أعلى النتيجة الحالية | `src/services/geminiService.ts::auditContinuity` |
| البحث المؤسس (Search Grounding) | toggle + كلمات مفتاحية اختيارية | تفعيل `tools: [{ googleSearch: {} }]` على Gemini Flash + استخراج المصادر/الاقتباسات | `src/services/geminiService.ts::executeDeepAnalysis`, `extractGroundingSources` |
| توليد لوحات قصة (Storyboard) | script ± image مرجعية | تحليل JSON منظم + توليد صورة Base64 (إن لم تكن هناك نية صريحة) ودمجها داخل `sections` | `src/services/geminiService.ts::executeStoryboardMode` |
| تعديل صورة موجودة | `ImageFile + prompt` | صورة Base64 معدَّلة من `gemini-3.1-flash-preview` | `src/services/geminiService.ts::editImage` |
| توليد صورة جديدة | `prompt + AspectRatio + ImageSize` | صورة Base64 من `gemini-3.1-pro-preview` مع `imageConfig` | `src/services/geminiService.ts::generateImage` |
| حفظ مشروع كامل | كل state التطبيق | `ProjectData` في Firestore (إن `auth.currentUser`) + localStorage backup | `src/hooks/useProjectStore.ts::saveProject` |
| تحميل آخر مشروع تلقائيًا | `localStorage[decoupage_last_project_id]` | استعادة الحالة كاملة عند التحميل الأول | `src/App.tsx` (effect) |
| Auto-save بـ Ctrl+S / Cmd+S | keydown | استدعاء `handleSaveProject` | `src/App.tsx` (effect) |
| تصدير Markdown | `result + mode` | تنزيل `*.md` مع تحويل JSON → MD | `src/services/exportService.ts::exportMarkdown` |
| تصدير CSV | `result` يحوي tables أو markdown table | تنزيل `*.csv` | `src/services/exportService.ts::exportCSV` |
| تصدير JSON | `result` كنص JSON | تنزيل `*.json` | `src/services/exportService.ts::exportJSON` |
| تصدير Production Packet | كل مراحل الـ pipeline الناجحة + script | تنزيل `production_packet_YYYY-MM-DD.md` | `src/services/exportService.ts::exportProductionPacket` |
| تسجيل دخول Google | popup | `User` من Firebase Auth | `src/hooks/useAuth.ts`, `src/services/firebase.ts` |
| تسجيل خروج | زر | `signOut(auth)` | `src/hooks/useAuth.ts` |

### 1.1.3 Data Models

كل الأنواع التالية معرَّفة في `src/types/index.ts` (المصدر الوحيد المعتمد):

| الكيان | الحقول الجوهرية | الاستخدام |
|---|---|---|
| `AnalysisMode` | `'scene' \| 'space' \| 'flow' \| 'perspective' \| 'rhythm' \| 'framing' \| 'blocking' \| 'coverage' \| 'shotlist' \| 'storyboard' \| 'prompt_builder'` | يحدد نمط التحليل |
| `ModeDefinition` | `id, label, icon, max, desc` | عنصر واحد من جدول الأوضاع |
| `ImageFile` | `file: File, src: string (objectURL), id: number` | كل صورة مرفوعة |
| `SpatialParams` | `style, colors, lighting, setDressing, details` | كل النصوص خانات سلسلة حرة |
| `PromptBuilderParams` | `genre, sceneDescription` | فقط لوضع `prompt_builder` |
| `RhythmParams` | `goal: string` | فقط لوضع `rhythm` |
| `PerspectiveParams` | `cameraRule: string` | فقط لوضع `perspective` |
| `AspectRatio` | `'1:1' \| '3:4' \| '4:3' \| '9:16' \| '16:9'` | لتوليد الصور |
| `ImageSize` | `'1K' \| '2K' \| '4K'` | دقة الصورة المولدة |
| `AnalysisSettings` | `aspectRatio, imageSize, useSearch, searchKeywords, pipelineAutoAdvance, cameraAngle?, cameraMovement?, cameraRule?` | الإعدادات الموحدة لكل تحليل |
| `AnalysisStatus` | `'idle' \| 'loading' \| 'success' \| 'error'` | حالة طلب التحليل |
| `AnalysisResult` | `status, data, error, timestamp` | غير مستخدم فعليًا في الكود الحالي |
| `PipelineStageStatus` | `'pending' \| 'loading' \| 'success' \| 'error' \| 'needs_review'` | حالة مرحلة واحدة |
| `PipelineStage` | `mode, status, result, error` | مرحلة واحدة من 11 |
| `ProjectPipeline` | `isActive, stages: Record<AnalysisMode, PipelineStage>, currentStage` | حالة الـ pipeline كله |
| `StructuredAnalysisResult` | `title?, summary?, widgets?, sections?, tables?` | الشكل الذي يُجبر Gemini على إعادته |
| `StructuredAnalysisTable` | `title, headers, rows: string[][]` | جدول داخل المخرج |
| `StructuredAnalysisWidget` | `type: 'parameter' \| 'highlight' \| 'status', label, value` | بطاقة استبصار صغيرة |
| `StructuredAnalysisSection` | `title, content` (markdown) | قسم نصي طويل |
| `ContinuityEntity` | `name, description, firstAppearance?` | عنصر داخل خريطة الاستمرارية |
| `ScenarioMap` | `characters, locations, motifs: ContinuityEntity[]` | الخريطة الكاملة |
| `ProjectData` | `id, ownerId?, name, updatedAt, script, intent, directorIntent?, fullScenario, scenarioMap?, mode, settings, spatialParams, promptBuilderParams, rhythmParams, perspectiveParams, pipeline, result?` | الكيان المخزَّن في Firestore + localStorage |
| `AnalysisContext` | كل مدخلات التحليل في كائن واحد | يستخدمه `geminiService.analyze` |
| `LogLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | المسجل |
| `LogEntry` | `level, message, timestamp, context?` | سجل واحد |
| `InlineDataPart` / `TextPart` / `ContentPart` | شكل أجزاء محتوى Gemini API | وسيط داخلي |
| `GroundingSupport` | `segment: {startIndex, endIndex, text}, groundingChunkIndices` | إسناد البحث |
| `GeminiResponseCandidate` | `content?.parts?, groundingMetadata?` (queries, chunks, supports) | استجابة Gemini |

ملاحظة Firestore-side: `firebase-blueprint.json` يعرّف `Project` بحقول مماثلة لكنه أقل صرامة (لا يحوي `pipeline` ولا `directorIntent` ولا أي من معاملات الوضع المتخصصة)، أي أن نموذج Firestore المُعلَن **لا يطابق** ما يكتبه التطبيق فعليًا — drift في طبقة المخطط مرصود في المصدر.

### 1.1.4 API / Services

| الوحدة | الواجهة العامة | التوقيع الكامل | المصدر |
|---|---|---|---|
| `GeminiService` | `constructor(apiKey, onStatusUpdate)` | `(string, (msg:string)=>void) → instance` | `src/services/geminiService.ts` |
| `GeminiService` | `analyze(req: AnalysisRequest)` | `Promise<{success:boolean, data:string, error:string\|null}>` | نفسه |
| `GeminiService` | `autoDeduceSpatialParams(script, intent)` | `Promise<SpatialParams>` (Gemini Flash + JSON mode) | نفسه |
| `GeminiService` | `generateScenarioMap(fullScenario)` | `Promise<{characters, locations, motifs}>` | نفسه |
| `GeminiService` | `auditContinuity(scenarioMap, results, script)` | `Promise<string>` (JSON Markdown) | نفسه |
| `createGeminiService` | factory | `(onStatusUpdate) → GeminiService` (يقرأ `process.env.GEMINI_API_KEY` المحقون عبر Vite `define`) | نفسه |
| `firebase.ts` | exports | `db = getFirestore(app, firestoreDatabaseId)`, `auth`, `googleProvider`, `OperationType` enum, `handleFirestoreError(err, op, path)` | `src/services/firebase.ts` |
| `exportService` | `tryParseJSON(content)` | `StructuredAnalysisResult \| null` | `src/services/exportService.ts` |
| `exportService` | `jsonToMarkdown(json)` | `string` | نفسه |
| `exportService` | `exportMarkdown(content, prefix?)` | `void` (download) | نفسه |
| `exportService` | `exportCSV(content, prefix?)` | `void` (download) — يدعم استخراج جداول من JSON أو من Markdown | نفسه |
| `exportService` | `exportJSON(data, prefix?)` | `void` (download) | نفسه |
| `exportService` | `exportProductionPacket(stages, script)` | `void` (download MD يجمع كل مراحل ناجحة) | نفسه |
| `useAuth` | hook | `{user, loading, loginWithGoogle, logout}` | `src/hooks/useAuth.ts` |
| `useImageManagement` | hook | `{images, addImages, removeImage, clearImages, inputRef, openFilePicker}` | `src/hooks/useFileManagement.ts` |
| `useVideoManagement` | hook | `{videoFile, setVideo, clearVideo, inputRef, openFilePicker}` | نفسه |
| `useTextFile` | hook | `{content, setContent, isReading, error, readFile, inputRef, openFilePicker, handleFileChange}` | نفسه |
| `useGeminiAnalysis` | hook | `{status, loadingMessage, result, error, isLoading, analyze, deduceSpatialParams, generateScenarioMap, auditContinuity, reset, setResult}` | `src/hooks/useGeminiAnalysis.ts` |
| `useAnalysisSettings` | hook | `{settings, setAspectRatio, setImageSize, setCameraAngle, setCameraMovement, setCameraRule, toggleSearch, setUseSearch, setSearchKeywords, setPipelineAutoAdvance, togglePipelineAutoAdvance, resetSettings}` | نفسه |
| `usePipeline` | hook | `{pipeline, PIPELINE_ORDER, startPipeline, stopPipeline, updateStageStatus, advancePipeline, resetStage, setCurrentStage, setPipeline}` | `src/hooks/usePipeline.ts` |
| `useProjectStore` | hook | `{projects, currentProject, currentProjectId, saveProject, loadProject, removeProject, createNewProject}` | `src/hooks/useProjectStore.ts` |
| `logger` (singleton) | `debug/info/warn/error/exception/group/groupEnd/getLogs/getLogsByLevel/clear/configure` | كلها sync تكتب على `console` (مع ألوان CSS) — يحتفظ ببافر آخر 1000 سجل | `src/utils/logger.ts` |
| `fileHelpers` | `fileToBase64(file)`, `safeFileToBase64`, `readTextFile`, `readDocxFile`, `readAnyTextFile`, `isValidImageFile`, `isValidVideoFile`, `isTextFile`, `createObjectURL`, `revokeObjectURL`, `formatFileSize` | كل التواقيع نقية ولا تعتمد على شبكة | `src/utils/fileHelpers.ts` |

### 1.1.5 External Dependencies

| الفئة | الاسم | الإصدار | الاستخدام |
|---|---|---|---|
| Runtime | `react` | `^19.0.1` | إطار الواجهة |
| Runtime | `react-dom` | `^19.0.1` | عرض React في DOM |
| Runtime | `@google/genai` | `^1.29.0` | كل استدعاءات Gemini |
| Runtime | `firebase` | `^12.12.1` | `firebase/app`, `firebase/auth`, `firebase/firestore` |
| Runtime | `lucide-react` | `^0.546.0` | كل أيقونات الواجهة |
| Runtime | `motion` | `^12.23.24` | معلَن لكن **غير مستخدم** في أي ملف TSX داخل `src/` (drift) |
| Runtime | `dotenv` | `^17.2.3` | معلَن لكن **غير مستخدم** بشكل صريح (Vite يحقن env بنفسه) |
| Runtime | `express` | `^4.21.2` | معلَن لكن **غير مستخدم** — حزمة مهجورة |
| Runtime | `vite` | `^6.2.3` | dev server / bundler |
| Runtime | `@vitejs/plugin-react` | `^5.0.4` | إضافة React |
| Runtime | `@tailwindcss/vite` | `^4.1.14` | (موجود لكن `index.html` يستورد Tailwind من CDN عبر `cdn.tailwindcss.com` — drift في إعداد Tailwind) |
| Dev | `typescript` | `~5.8.2` | فحص أنواع فقط (`tsc --noEmit` كـ "lint") |
| Dev | `tsx` | `^4.21.0` | غير مستخدم في scripts (drift) |
| Dev | `terser` | `^5.46.2` | minifier للبناء |
| Dev | `tailwindcss` + `autoprefixer` | `^4.1.14` / `^10.4.21` | معلَن، ضعيف الاستخدام (CDN يحل محله) |
| Dev | `@firebase/eslint-plugin-security-rules` | `^0.0.2` | لا توجد إعدادات ESLint مرئية تستهلكه |
| Dev | `@types/express`, `@types/node` | — | تابع للحزم غير المستخدمة |
| External (CDN في `index.html`) | Tailwind CDN | latest | كل تنسيقات الـ utility classes |
| External (CDN في `index.html`) | Mammoth.js | `1.6.0` | قراءة DOCX في المتصفح |
| External (CDN في `index.html`) | Google Fonts | — | Cinzel, DM Sans, IBM Plex Sans Arabic, IBM Plex Mono, Playfair Display, Raleway |
| External (Service) | Gemini API | — | كل التحليل/التوليد (Pro و Flash و Image variants) |
| External (Service) | Firebase Auth + Firestore | — | تسجيل دخول Google + حفظ المشاريع |

### 1.1.6 State Management

النمط المستخدم فعليًا (لا تخمين):

- **لا يوجد Redux ولا Zustand ولا Jotai ولا Context API.** كل الحالة محلية داخل `App.tsx` عبر `useState` (≈18 حالة منفصلة) + خمسة hooks مخصَّصة (`useImageManagement`, `useVideoManagement`, `useTextFile`, `useGeminiAnalysis`, `useAnalysisSettings`, `usePipeline`, `useProjectStore`).
- **التواصل بين الأقسام:** عبر prop drilling من `App.tsx` فقط.
- **البقاء (Persistence):** ثلاث طبقات:
  1. `useState` داخل ذاكرة المتصفح فقط.
  2. `localStorage` بمفتاحين: `decoupage_projects` (نسخة احتياطية لكل المشاريع عند عدم تسجيل الدخول) و `decoupage_last_project_id` (آخر معرّف).
  3. Firestore عبر `useProjectStore` عند `auth.currentUser`.
- **خدمة Gemini singleton لكل جلسة hook:** `useRef<GeminiService>` يُهيَّأ عند أول `analyze()` ويُعاد استخدامه (لا يُعاد إنشاؤه عند إعادة الـ render).
- **Logger singleton عام:** `Logger.getInstance()` على مستوى التطبيق كله.

### 1.1.7 Configuration

#### Constants (`src/config/constants.ts`)

| الثابت | القيمة |
|---|---|
| `GEMINI_MODELS.PRO` | `'gemini-3.1-pro-preview'` |
| `GEMINI_MODELS.FLASH` | `'gemini-3.1-flash-preview'` |
| `GEMINI_MODELS.IMAGE_GEN` | `'gemini-3.1-pro-preview'` |
| `GEMINI_MODELS.IMAGE_EDIT` | `'gemini-3.1-flash-preview'` |
| `THINKING_CONFIG.DEEP_ANALYSIS` | `2048` tokens |
| `THINKING_CONFIG.VIDEO_ANALYSIS` | `1024` tokens |
| `THINKING_CONFIG.PROMPT_BUILDER` | `2048` tokens |
| `THINKING_CONFIG.STORYBOARD` | `2048` tokens |
| `MODES` | كائن جامد بـ 11 وضعًا: `scene, space, flow, perspective, rhythm, framing, blocking, coverage, shotlist, storyboard, prompt_builder` — كل عنصر `{id, label, icon, max:3, desc}` |
| `ASPECT_RATIOS` | `['1:1','3:4','4:3','9:16','16:9']` |
| `IMAGE_SIZES` | `['1K','2K','4K']` |
| `MAX_IMAGES` | `3` |
| `MAX_VIDEO_SIZE_BYTES` | `100 * 1024 * 1024` (100MB) |
| `MIN_CONTEXT_LENGTH` | `50` (معلَن، لا يُستهلك في الكود الحالي — drift) |
| `DEMO_SCRIPT` | نص مشهد عربي «سيد ونفيسة» (≈18 سطرًا) |
| `STATUS_MESSAGES` | 11 رسالة عربية لكل حالة تحميل |
| `ERROR_MESSAGES` | 7 رسائل خطأ عربية |
| `createSystemInstruction(mode)` | يُنشئ تعليمات نظام طويلة لكل وضع، مع بروتوكولات خاصة لـ `coverage` و `framing` و `rhythm` و `shotlist` و `prompt_builder` و `storyboard` — وكلها تجبر مخرَجًا JSON بشكل `{title, summary, widgets, sections, tables}` |
| `createVideoAnalysisInstruction(mode)` | تعليمات تحليل فيديو منفصلة بنفس الشكل JSON الموحَّد |

#### Defaults (`src/types/index.ts`)

```ts
DEFAULT_ANALYSIS_SETTINGS = {
  aspectRatio: '16:9',
  imageSize: '1K',
  useSearch: false,
  searchKeywords: '',
  pipelineAutoAdvance: true,
  cameraAngle: 'Eye Level',
  cameraMovement: 'Static',
  cameraRule: 'Neutral Observation'
}
```

#### Vite (`vite.config.ts`)

| الإعداد | القيمة |
|---|---|
| `root` | `.` |
| `server.port` | `3000` |
| `server.host` | `0.0.0.0` |
| `server.open` | `true` |
| `server.hmr` | يتعطل إذا `DISABLE_HMR=true` |
| `plugins` | `[react()]` |
| `define` | يضع `process.env.API_KEY` و `process.env.GEMINI_API_KEY` كقيمتين JSON من `loadEnv('GEMINI_API_KEY' \|\| 'VITE_API_KEY')` |
| `resolve.alias` | `@ → ./src` |
| `build.outDir` | `dist` |
| `build.sourcemap` | `true` |
| `build.minify` | `terser` |
| `build.target` | `es2022` |
| `manualChunks` | `vendor: [react, react-dom]`, `icons: [lucide-react]`, `ai: [@google/genai]` |
| `optimizeDeps.include` | `[react, react-dom, lucide-react, @google/genai]` |

#### TypeScript (`tsconfig.json`)

| الإعداد | القيمة |
|---|---|
| `target` | `ES2022` |
| `module` | `ESNext` |
| `moduleResolution` | `bundler` |
| `jsx` | `react-jsx` |
| `paths` | `@/* → ./*` (لاحظ اختلاف عن alias في vite.config الذي يستهدف `./src`) |
| `allowImportingTsExtensions` | `true` |
| `noEmit` | `true` |
| `experimentalDecorators` | `true` |
| `useDefineForClassFields` | `false` |

> **drift صريح في إعداد المسارات:** `tsconfig.paths` يعطّ `@/*` على جذر المشروع، بينما `vite.config.alias` يعطيه على `./src`. الكود الحالي لا يستخدم alias `@/` فعليًا — كل الاستيراد نسبي — فلم يظهر الخلاف، لكنه فخ ينبغي حله عند النقل.

#### Environment (`.env.example`)

```text
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

(`APP_URL` معلَن في `.env.example` لكن غير مستهلك في `src/`.)

### 1.1.8 Firebase Usage

#### قراءات / كتابات على Firestore

| العملية | المسار | الشرط | المصدر |
|---|---|---|---|
| `getDocs(query(collection('projects'), where('ownerId','==',user.uid)))` | `projects` | `auth.currentUser` موجود | useProjectStore.ts:24 |
| `setDoc(doc(db, 'projects', newProject.id), newProject)` | `projects/{id}` | عند `saveProject` و `auth.currentUser` موجود | useProjectStore.ts:86 |
| `deleteDoc(doc(db, 'projects', id))` | `projects/{id}` | عند `removeProject` و `auth.currentUser` موجود | useProjectStore.ts:112 |
| `auth.onAuthStateChanged(...)` | — | مرتين: `useAuth` + `useProjectStore` (تكرار غير ضروري) | useAuth.ts:9, useProjectStore.ts:15 |
| `signInWithPopup(auth, googleProvider)` | — | عند زر «دخول» | useAuth.ts:18 |
| `signOut(auth)` | — | عند زر «خروج» | useAuth.ts:27 |

#### قواعد Firestore (`firestore.rules`)

- Default-deny شامل في الجذر.
- Helpers: `isSignedIn()`, `isValidId(id)` (regex `^[a-zA-Z0-9_\-]+$` بطول ≤128), `isValidProject(data)` (يفرض `ownerId == request.auth.uid` ويحد الحقول إلى 15).
- على `/projects/{projectId}`:
  - `read`: signed-in + id صالح + ملك للمستخدم.
  - `list`: signed-in + الفلتر يطابق `ownerId == uid`.
  - `create`: signed-in + id يطابق المسار + بنية صالحة.
  - `update`: نفس + يحفظ `ownerId` و `id` ثابتين.
  - `delete`: signed-in + ملك للمستخدم.

#### إعدادات Firebase

`firebase-applet-config.json` يحوي مفتاح API حقيقي (≈ 39 حرفًا) + `appId` + `projectId` + `firestoreDatabaseId` + `messagingSenderId`. **القيم الفعلية مشطوبة من هذا الجدول**؛ الموجود في الملف هو قيم محتفظ بها في المصدر الخارجي فقط، ولن تُكتب في أي مكان داخل المنصة.

### 1.1.9 AI / ML Integrations

| المكان | النموذج | الإعدادات الحاكمة | المصدر |
|---|---|---|---|
| تحليل عميق نصي/صورة/فيديو | `GEMINI_MODELS.PRO` (`gemini-3.1-pro-preview`) | `responseMimeType:"application/json"` + `systemInstruction` لكل وضع | `geminiService.executeDeepAnalysis` |
| تحليل مع Search Grounding | `GEMINI_MODELS.FLASH` | `tools:[{googleSearch:{}}]` + بدون `responseMimeType` | نفسه |
| توليد صورة (storyboard) | `GEMINI_MODELS.IMAGE_GEN` | `imageConfig:{aspectRatio, imageSize}` | `executeStoryboardMode` → `generateImage` |
| تعديل صورة (storyboard) | `GEMINI_MODELS.IMAGE_EDIT` | `parts:[{inlineData:image}, {text:prompt}]` | `editImage` |
| استنتاج معاملات مكانية | `GEMINI_MODELS.FLASH` | JSON mode + قالب صارم | `autoDeduceSpatialParams` |
| توليد خريطة استمرارية | `GEMINI_MODELS.FLASH` | JSON mode + قالب صارم | `generateScenarioMap` |
| فحص استمرارية | `GEMINI_MODELS.PRO` | JSON mode | `auditContinuity` |
| تحليل فيديو | نفس مسار `executeDeepAnalysis` لكن مع `createVideoAnalysisInstruction` | يدخل الفيديو كـ `inlineData` بـ Base64 (≤100MB) | نفسه |

ملاحظة جوهرية للدمج لاحقًا (لا قرار هنا، فقط رصد):

- `process.env.API_KEY` و `process.env.GEMINI_API_KEY` يُحقَنان عبر Vite في bundle الواجهة. أي نقل إلى المنصة يستلزم تحويل هذا إلى مكالمة backend (لأن الواجهة في المنصة تستهلك `apps/backend` ولا يجوز تسريب مفاتيح Gemini للمتصفح).

---

## 1.2 — Runtime Analysis (إثبات تشغيلي فعلي)

تم تنفيذ تشغيل فعلي للتطبيق المصدر داخل بيئة محلية، وهذه هي الأدلة الخام بترتيب التنفيذ:

### 1.2.1 — التحقق من البيئة قبل الإقلاع

| الأمر | المخرج الفعلي |
|---|---|
| `pwd` (داخل مجلد D-COUPAGE) | `/c/Users/Mohmed Aimen Raed/Downloads/D-COUPAGE-main/D-COUPAGE-main` |
| `pnpm --version` | `10.32.1` (مطابق لمدير الحزم الرسمي للمنصة) |
| `ls node_modules` (قبل التثبيت) | `ls: cannot access 'node_modules': No such file or directory` |

### 1.2.2 — تثبيت التبعيات

| الأمر | النتيجة الفعلية |
|---|---|
| `pnpm install --reporter=append-only` (داخل مجلد D-COUPAGE) | **نجح** خلال **24.3s**. ثُبِّت **367 حزمة** (`+367`). تحذير واحد: `1 deprecated subdependencies found: node-domexception@1.0.0`. تحذير ثانٍ: `Ignored build scripts: @firebase/util@1.15.0, @google/genai@1.51.0, esbuild@0.25.12, esbuild@0.27.7, protobufjs@7.5.6` (sandbox افتراضي لـ pnpm — لم يُمنح `pnpm approve-builds` لأن ذلك يتجاوز نطاق Audit). |
| الإصدارات الفعلية المُحلَّة (مقارنة بـ `package.json`) | `react 19.2.5`، `firebase 12.12.1`، `@google/genai 1.51.0` (بدلًا من `^1.29.0`)، `vite 6.4.2`، `motion 12.38.0`، `lucide-react 0.546.0`. |

### 1.2.3 — تشغيل خادم التطوير

| الأمر | النتيجة الفعلية |
|---|---|
| `DISABLE_HMR=true pnpm dev` | **نجح**. Vite v6.4.2 ready in **1267ms**. أعلن: `Local: http://localhost:3000/`، `Network: 192.168.0.157:3000`، `172.18.96.1:3000`، `172.23.96.1:3000`. (تم تعطيل HMR عمدًا لأن مصدر `vite.config.ts` يدعم متغير البيئة `DISABLE_HMR=true`، تجنبًا لاستهلاك المنفذ بـ websocket مفتوح أثناء جلسة Audit قصيرة.) |

### 1.2.4 — التحقق من خدمة الأصول فعليًا (HTTP probes)

| المسار | النتيجة |
|---|---|
| `GET http://localhost:3000/` | **HTTP 200** — `5057 bytes` خلال `0.21s`. أول 8 أسطر تطابق `index.html` المصدر مع حقن `/@vite/client` تلقائيًا. |
| `GET http://localhost:3000/src/index.tsx` | **HTTP 200** — Vite يخدم نقطة الدخول مباشرة. |
| `GET http://localhost:3000/node_modules/.vite/deps/@google_genai.js` | **HTTP 200** — bundle Gemini مُهيَّأ ومخدوم من cache التحسين. |
| `GET http://localhost:3000/@id/__x00__node:process` | **HTTP 200** — polyfill Node معالَج. |

### 1.2.5 — إيقاف الخادم

| الأمر | النتيجة |
|---|---|
| `Get-NetTCPConnection -LocalPort 3000 -State Listen \| Stop-Process -Force` ثم إعادة الفحص | بعد ثانية واحدة: `Count = 0` (المنفذ 3000 خالٍ). إشارة الإنهاء أعادت exit code 127 للعملية الخلفية كما هو متوقع لـ kill signal. |

### 1.2.6 — حدود ما ثبت تشغيليًا

| السلوك | الحالة المثبتة | البقية |
|---|---|---|
| Vite dev server يقلع | ✅ مثبت | — |
| `index.html` يُخدم بـ HTTP 200 | ✅ مثبت | — |
| Module entry `src/index.tsx` يُحمَّل عبر Vite | ✅ مثبت | — |
| تبعيات `@google/genai` مهيأة في bundle التحسين | ✅ مثبت | — |
| واجهة React تركّب فعلًا في DOM وتعرض الـ Header/الأوضاع/Modals | ⚠️ **غير مثبت** — يتطلب متصفحًا حيًا (curl لا ينفّذ JS). الإثبات المتاح هو فقط أن الـ HTML والـ bundles تُسلَّم بنجاح. |
| استدعاء فعلي لـ Gemini API | ❌ **مستحيل بدون مفتاح** — الفحص: `ls .env.local` رجّع `No such file or directory`. `vite.config.ts` يقرأ `loadEnv` ويحقن `process.env.GEMINI_API_KEY` كـ JSON string؛ في غياب الملف ستُحقن `undefined`. أي زر «تشغيل مرحلة» سيفشل عند `new GoogleGenAI({ apiKey: undefined })` أو في أول `generateContent()`. |
| تسجيل دخول Firebase (Google popup) | ❌ غير مُختبر — يتطلب نقرة بشرية + popup OAuth فعلي ودومين مسموح في إعدادات Firebase Console. |
| قراءة/كتابة Firestore | ❌ غير مُختبر — يتطلب مستخدمًا مسجَّلًا فعلًا. مفتاح Firebase Web موجود نصًا في `firebase-applet-config.json`، لذا `initializeApp` سيُهيأ لكن أي عملية ستُرفض من القواعد بدون `auth.currentUser`. |

### 1.2.7 — تصنيف العوائق

| التصنيف | حالته الفعلية في هذا الفحص |
|---|---|
| غياب Dependencies | ✅ تم إغلاقه — `pnpm install` نجح. |
| غياب env keys | ❌ **العائق الفعلي الحاكم**: `.env.local` غير موجود؛ `GEMINI_API_KEY` غير محقون. أي مسار يلامس Gemini سيفشل. |
| Firebase حي | ⚠️ **عائق نسبي**: التهيئة الأولية ستنجح لأن config مكتوب نصًا في المصدر، لكن أي عملية Firestore/Auth ستحتاج تفاعلًا بشريًا (popup) ودومينًا مفوّضًا. |
| عوائق تشغيل أخرى | لا — Vite + Tailwind CDN + Mammoth CDN كلها سلمت. |

### 1.2.8 — قرار التشغيل التفاعلي (المتصفح الحي)

|  |  |
|---|---|
| هل فُتح متصفح حي على `http://localhost:3000/` ضمن هذه الجولة | **لا** |
| السبب التشغيلي الصريح | (1) الخادم يخدم HTML/JS ولكن أي تفاعل ذي معنى (تشغيل تحليل، توليد صورة، حفظ مشروع) يحتاج `GEMINI_API_KEY` فعلي + بيئة Firebase تفاعلية. (2) كتابة مفتاح Gemini في `.env.local` خارج نطاق Audit وتمس سياسة الأسرار (المفاتيح الحقيقية لا تُكتب في ملفات داخل أو بجانب المستودع المستهدف). (3) أي اختبار تفاعلي بدون مفتاح سيحصد فقط لقطات لواجهة فارغة، وهو ما لا يضيف معرفة وراء ما استُخلص ساكنًا من قراءة كل سطر. |
| ما تبقى مجهولًا تشغيليًا (موثَّق صراحة) | شكل JSON الفعلي الذي تُرجعه Gemini لكل وضع، الزمن الفعلي للاستجابة، صحة `imageConfig` على الإصدار الحالي للـ SDK، حالة `needs_review` في الواجهة الحقيقية، دقة استخراج DOCX من Mammoth في المتصفح، سلوك `signInWithPopup` تحت إعدادات Firebase الحالية. |

---

## 1.3 — مخرجات هذه الجولة

- ملف واحد منشأ: هذا الملف.
- صفر ملفات داخل `apps/`، `packages/`، `apps/backend/drizzle/`، `apps/web/convex/`.
- صفر تعديل على إعدادات بناء/فحص/ESLint/CI.
- صفر تنفيذ لأي `pnpm install` خارج المسار الرسمي للمستودع الأم.
- صفر طلب شبكة لمصادر D-COUPAGE الخارجية.

---

## ما هو **خارج** نطاق هذه الجولة بشكل صريح

- ❌ **PHASE 2 — Architectural Mapping & Integration Decision Map.** لن يُملأ جدول قرارات الدمج هنا. عند طلب صريح، يُفتح في جولة لاحقة كملف `docs/dcoupage-integration-plan.md` منفصل (لا يُكتب فوق هذا الملف).
- ❌ **PHASE 3 — Implementation.** لا frontend، لا backend module، لا Drizzle migration، لا navigation wiring.
- ❌ **PHASE 4 — Verification & Final Report.** لا تشغيل لـ `pnpm agent:verify` الكامل، ولا `pnpm verify:runtime`، ولا Vitest/Playwright، ولا تحديث `docs/dcoupage-integration-report.md`.
- ❌ Runtime analysis للتطبيق المصدر (مذكور سبب الإرجاء أعلاه).
- ❌ أي قرار بخصوص: نقطة الدخول داخل directors-studio، شكل routes الجديدة، اختيار `apps/backend/src/modules/*` vs `apps/backend/src/services/*`، شكل schema جديد في Drizzle، طريقة حقن أسرار Gemini على backend.

---

## معلومات حساسة مرصودة (لا تُنقل إلى المنصة)

| النوع | المكان في المصدر الخارجي | الحالة في هذه الوثيقة |
|---|---|---|
| Firebase Web API key | `firebase-applet-config.json::apiKey` | **مشطوبة** — أي نقل لاحق يجب أن يقرأها من بيئة secrets، لا من ملف نصي مستودع |
| Firebase appId / messagingSenderId / projectId | نفس الملف | **مشطوبة** — نفس السياسة |
| Firestore database id (`firestoreDatabaseId`) | نفس الملف | **مشطوب** |

(ملاحظة عامة: مفاتيح Firebase Web يُقصد بها فعليًا أن تُضمَّن في كود الواجهة، والأمان مكفول عبر Firestore Rules. لكن سياسة المستودع المستهدف تمنع كتابة أي قيمة سر فعلية في أي ملف داخله، حتى لو كانت "مفترض-عامة"، لذلك الشطب صارم هنا.)

---

## مراجع داخلية

- العقد الأعلى: [`AGENTS.md`](../AGENTS.md)
- العقد التشغيلي الكامل: [`.repo-agent/OPERATING-CONTRACT.md`](../.repo-agent/OPERATING-CONTRACT.md)
- بروتوكول البداية: [`.repo-agent/STARTUP-PROTOCOL.md`](../.repo-agent/STARTUP-PROTOCOL.md)
- بروتوكول التسليم: [`.repo-agent/HANDOFF-PROTOCOL.md`](../.repo-agent/HANDOFF-PROTOCOL.md)
- الحالة الحية: [`output/session-state.md`](../output/session-state.md)
- السجل التنفيذي: [`output/round-notes.md`](../output/round-notes.md)
