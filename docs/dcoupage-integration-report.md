# D-COUPAGE Integration Report

> **هذا الملف ليس مصدر حقيقة تشغيلية للمستودع.** المرجع الأعلى:
> [`AGENTS.md`](../AGENTS.md) و [`.repo-agent/OPERATING-CONTRACT.md`](../.repo-agent/OPERATING-CONTRACT.md).
> الحالة الحية: [`output/session-state.md`](../output/session-state.md).
> الـ Audit الكامل وعقد المهمة (Integration Plan): [`docs/dcoupage-audit.md`](dcoupage-audit.md).

## 1. خريطة الوظيفة الأصلية → المسار الجديد في المنصة

| وظيفة D-COUPAGE المصدر (مكان أصلي) | المسار الجديد في المنصة |
|---|---|
| Single-page React app (App.tsx) | `apps/web/src/app/(main)/directors-studio/decoupage/page.tsx` + `components/DecoupageWorkspace.tsx` |
| 11 وضع تحليل (`scene→prompt_builder`) في `src/config/constants.ts::MODES` | `apps/web/src/app/(main)/directors-studio/decoupage/lib/types.ts::ANALYSIS_MODES` + `MODE_LABELS` + `MODE_DESCRIPTIONS` (frontend) و `apps/backend/src/modules/decoupage/types.ts::ANALYSIS_MODES` + `prompts.ts::MODE_DESCRIPTIONS` (backend) |
| `createSystemInstruction()` و `createVideoAnalysisInstruction()` | `apps/backend/src/modules/decoupage/prompts.ts::buildSystemInstruction` + `buildUserContent` (الفيديو خارج النطاق — راجع PHASE-3 scope في docs/dcoupage-audit.md) |
| Mode selector (`components/ModeSelector.tsx`) | `decoupage/components/ModeSelector.tsx` (`ModeSelector` + `ModeDescription`) |
| Pipeline panel (`components/PipelinePanel.tsx`) + `usePipeline` | `decoupage/components/PipelinePanel.tsx` + `decoupage/hooks/usePipeline.ts` |
| `OutputPanel` + `ResultRenderer` | `decoupage/components/OutputPanel.tsx` + `decoupage/components/ResultRenderer.tsx` |
| Spatial controls (وضع `space`) | داخل `DecoupageWorkspace.tsx::renderModeSpecificControls` |
| Prompt-builder controls (وضع `prompt_builder`) | داخل `DecoupageWorkspace.tsx::renderModeSpecificControls` |
| Rhythm controls (وضع `rhythm`) | داخل `DecoupageWorkspace.tsx::renderModeSpecificControls` |
| Perspective controls (وضع `perspective`) | داخل `DecoupageWorkspace.tsx::renderModeSpecificControls` |
| Context Manager Modal (سيناريو كامل + خريطة استمرارية) | داخل `DecoupageWorkspace.tsx` (textarea للسيناريو الكامل + زر «خريطة استمرارية» يستدعي `useGenerateScenarioMap`) |
| `geminiService.analyze()` | `POST /api/decoupage/analyze` → `decoupageController.analyze` → `decoupageAnalysisService.analyze` → `geminiService.generateText` |
| `geminiService.autoDeduceSpatialParams()` | `POST /api/decoupage/spatial-params` → نفس السلسلة عبر `generateJson<SpatialParams>` |
| `geminiService.generateScenarioMap()` | `POST /api/decoupage/scenario-map` |
| `geminiService.auditContinuity()` | `POST /api/decoupage/audit-continuity` |
| `useProjectStore` (Firestore + localStorage) | `decoupageProjectRepository` على جدول `appPersistenceRecords` (Drizzle) — appId=`decoupage`، scope=userId، recordKey=projectId |
| Firebase Auth (Google popup) | يُستخدم نظام JWT الموجود في المنصة (`authMiddleware`). لا Firebase. |
| `firebase-applet-config.json` (مفتاح حقيقي) | **مُلغى** — لا تُنقل أي قيمة سر إلى المنصة. |
| `exportService.exportMarkdown/CSV/JSON/exportProductionPacket` | **مؤجَّل** خارج هذه الجولة — راجع scope في docs/dcoupage-audit.md § «PHASE 3 Scope». |
| Image upload + edit + generate (Storyboard image) + Video upload | **مؤجَّل** خارج هذه الجولة (موثَّق صراحة في scope). |
| Tailwind CDN + ألوان hex (`#FF4D00`, `#121212`, `#F4F1EA`) | استُبدلت بـ CSS variables `var(--app-accent)`، `var(--app-text)`، `var(--app-text-muted)`، `var(--app-border)`، `var(--app-surface)` + مكونات shadcn/ui. |
| Mammoth.js CDN (DOCX) | غير مستخدم في الميزة الجديدة (فرض رفع نص فقط — DOCX خارج النطاق هذه الجولة). |
| Navigation entry | عنصر «Découpage» جديد في [AppSidebar.tsx](../apps/web/src/app/(main)/directors-studio/components/AppSidebar.tsx) menu. |

## 2. الملفات المُنشأة (مع المسار الكامل)

### Backend
| الملف | الوظيفة |
|---|---|
| [apps/backend/src/modules/decoupage/types.ts](../apps/backend/src/modules/decoupage/types.ts) | أنواع البيانات الكاملة (AnalysisMode, AnalysisRequestPayload, ScenarioMap, DecoupageProject, …) |
| [apps/backend/src/modules/decoupage/prompts.ts](../apps/backend/src/modules/decoupage/prompts.ts) | `buildSystemInstruction(mode)` + `buildUserContent(...)` + ثوابت تعليمات الاستنتاج المكاني وخريطة الاستمرارية وفحص الاستمرارية |
| [apps/backend/src/modules/decoupage/schemas.ts](../apps/backend/src/modules/decoupage/schemas.ts) | Zod schemas: `analyzeRequestSchema`, `spatialDeductionRequestSchema`, `scenarioMapRequestSchema`, `continuityAuditRequestSchema`, `projectPayloadSchema`, `projectIdParamSchema` |
| [apps/backend/src/modules/decoupage/repository.ts](../apps/backend/src/modules/decoupage/repository.ts) | `decoupageProjectRepository` (list/findById/upsert/remove) فوق جدول `appPersistenceRecords` الموجود |
| [apps/backend/src/modules/decoupage/service.ts](../apps/backend/src/modules/decoupage/service.ts) | `decoupageAnalysisService` (analyze/deduceSpatialParams/generateScenarioMap/auditContinuity) فوق `geminiService` المركزي |
| [apps/backend/src/modules/decoupage/controller.ts](../apps/backend/src/modules/decoupage/controller.ts) | Express handlers لكل endpoints + استخراج `ownerId` من `req.user` (JWT) |
| [apps/backend/src/modules/decoupage/routes.ts](../apps/backend/src/modules/decoupage/routes.ts) | راوتر تحت `/api/decoupage/*` مع `authMiddleware` + `perUserAiLimiter` + `validateBody` |

### Frontend
| الملف | الوظيفة |
|---|---|
| [apps/web/src/app/(main)/directors-studio/decoupage/page.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/page.tsx) | Server component يستضيف `DecoupageWorkspace` + metadata |
| [apps/web/src/app/(main)/directors-studio/decoupage/lib/types.ts](../apps/web/src/app/(main)/directors-studio/decoupage/lib/types.ts) | مرآة الأنواع للواجهة + ثوابت `MODE_LABELS`/`MODE_DESCRIPTIONS`/`buildEmptyPipeline` |
| [apps/web/src/app/(main)/directors-studio/decoupage/lib/api-client.ts](../apps/web/src/app/(main)/directors-studio/decoupage/lib/api-client.ts) | `decoupageApi` (analyze/spatial-params/scenario-map/audit-continuity/projects CRUD) عبر fetch مع `credentials:"include"` |
| [apps/web/src/app/(main)/directors-studio/decoupage/lib/result-parser.ts](../apps/web/src/app/(main)/directors-studio/decoupage/lib/result-parser.ts) | `tryParseJSON` + `jsonToMarkdown` (نقل من D-COUPAGE/exportService) |
| [apps/web/src/app/(main)/directors-studio/decoupage/hooks/usePipeline.ts](../apps/web/src/app/(main)/directors-studio/decoupage/hooks/usePipeline.ts) | إدارة حالة pipeline من 11 مرحلة |
| [apps/web/src/app/(main)/directors-studio/decoupage/hooks/useDecoupageAnalysis.ts](../apps/web/src/app/(main)/directors-studio/decoupage/hooks/useDecoupageAnalysis.ts) | TanStack mutations لكل من analyze/scenario-map/spatial-deduction/audit-continuity |
| [apps/web/src/app/(main)/directors-studio/decoupage/components/DecoupageWorkspace.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/components/DecoupageWorkspace.tsx) | المكوّن الجذر — يدير المدخلات + يقود pipeline |
| [apps/web/src/app/(main)/directors-studio/decoupage/components/ModeSelector.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/components/ModeSelector.tsx) | شريط الأوضاع + وصف الوضع الحالي |
| [apps/web/src/app/(main)/directors-studio/decoupage/components/PipelinePanel.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/components/PipelinePanel.tsx) | شبكة 11 مرحلة مع شريط تقدم + needs_review approval + إعادة تشغيل |
| [apps/web/src/app/(main)/directors-studio/decoupage/components/OutputPanel.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/components/OutputPanel.tsx) | عرض Idle / Loading / Result + زر «فحص الاستمرارية» |
| [apps/web/src/app/(main)/directors-studio/decoupage/components/ResultRenderer.tsx](../apps/web/src/app/(main)/directors-studio/decoupage/components/ResultRenderer.tsx) | تحويل JSON منظَّم → markdown ثم عرضه (h1/h2/h3/list/table/p) |

### Documentation
| الملف | الوظيفة |
|---|---|
| [docs/dcoupage-integration-report.md](dcoupage-integration-report.md) | هذا الملف |

## 3. الملفات المُعدَّلة

| الملف | وصف التعديل (سطر واحد) |
|---|---|
| [apps/backend/src/server/route-registrars.ts](../apps/backend/src/server/route-registrars.ts) | استيراد `decoupageRouter` + إضافة دالة `registerDecoupageRoutes` + استدعاؤها من `registerAllRoutes` |
| [apps/web/src/app/(main)/directors-studio/components/AppSidebar.tsx](../apps/web/src/app/(main)/directors-studio/components/AppSidebar.tsx) | استيراد أيقونة `Workflow` + إضافة عنصر «Découpage» إلى `menuItems` بمسار `/directors-studio/decoupage` |
| [docs/dcoupage-audit.md](dcoupage-audit.md) | إضافة قسم `## INTEGRATION PLAN` في رأس الملف (تم في PHASE 2) + قسم Runtime Analysis تشغيلي (تم في الجولة السابقة) |

## 4. مفاتيح بيئة جديدة مطلوبة

**لا يوجد**. الميزة تستهلك متغيرات البيئة الموجودة فعلًا:
- `GEMINI_API_KEY` أو `GOOGLE_GENAI_API_KEY` (يقرأهما `apps/backend/src/services/gemini.service.ts`)
- `DATABASE_URL` (مستخدم سلفًا للـ Drizzle/Postgres)
- لا أسرار Firebase. لا أسرار AI Studio. لا متغيرات جديدة في `.env.example`.

## 5. أوامر التشغيل (منسوخة من package.json الفعلي)

| الغاية | الأمر |
|---|---|
| تطوير الواجهة + الخادم معًا | `pnpm dev` (root) — يفوّض `pnpm --filter @the-copy/web dev` الذي يشغّل Next + backend عبر concurrently |
| الواجهة فقط | `pnpm dev:web` |
| الخادم فقط | `pnpm dev:backend` |
| البناء | `pnpm build` (turbo build --concurrency=1) |
| Migration generation | `pnpm --filter @the-copy/backend db:generate` (drizzle-kit generate) — **غير مطلوب لهذه الميزة** لأنها تستخدم جدولًا قائمًا |
| Migration apply | `pnpm --filter @the-copy/backend db:migrate` — **غير مطلوب لهذه الميزة** |
| Type-check (web) | `pnpm --filter @the-copy/web type-check` |
| Type-check (backend) | `pnpm --filter @the-copy/backend type-check` |
| ESLint (web) | `pnpm --filter @the-copy/web lint` |
| ESLint (backend) | `pnpm --filter @the-copy/backend lint` |
| Vitest config | `pnpm --filter @the-copy/web test:config` |
| Vitest smoke | `pnpm --filter @the-copy/web test:smoke` |
| Doctor / verify:runtime | `pnpm run doctor` / `pnpm verify:runtime` |
| Agent verify | `pnpm agent:verify` |

## 6. نتائج الفحوصات الفعلية

كل الفحوصات شُغِّلت فعليًا عبر pnpm وفق العقد. النتائج الحرفية:

| # | الأمر | الحالة | المخرج المختصر |
|---|---|---|---|
| 1 | `pnpm --filter @the-copy/web type-check` | ✅ PASS | `[typecheck] web: 0 TypeScript error(s).` (exit 0) |
| 2 | `pnpm --filter @the-copy/backend type-check` | ✅ PASS | `[typecheck] backend: 0 TypeScript error(s).` (exit 0) — يغطّي `tsconfig.check.json` عبر الـ contract المتعدد الأجزاء |
| 3 | `pnpm exec tsc -p apps/backend/tsconfig.check.json --noEmit --pretty false` (مباشر) | ✅ PASS | exit 0، صفر بايت من stderr — لا أخطاء |
| 4 | `pnpm --filter @the-copy/web exec eslint --max-warnings=0 src/app/(main)/directors-studio/decoupage/**/*.{ts,tsx} src/app/(main)/directors-studio/components/AppSidebar.tsx` | ✅ PASS | بعد إصلاحين متتاليين (max-lines + ReadonlyArray×4): 0 errors / 0 warnings (exit 0) |
| 5 | `pnpm --filter @the-copy/backend exec eslint --max-warnings=0 src/modules/decoupage/**/*.ts src/server/route-registrars.ts` | ✅ PASS | بعد إصلاح 4 ملاحظات (import/order + no-unnecessary-type-assertion + prefer-nullish-coalescing + array-type): 0 errors / 0 warnings (exit 0) |
| 6 | `pnpm --filter @the-copy/web test:config` | ✅ PASS | `Test Files 6 passed (6) · Tests 41 passed (41)` خلال 62.7s |
| 7 | `pnpm --filter @the-copy/web test:smoke` | ✅ PASS | `Test Files 1 passed (1) · Tests 2 passed (2)` خلال 59.6s |
| 8 | `pnpm --filter @the-copy/backend test:config` | ✅ PASS | `Test Files 1 passed (1) · Tests 27 passed (27)` خلال 17.4s |
| 9 | `pnpm --filter @the-copy/backend db:generate` (drizzle migration generation) | ⏭️ SKIPPED-WITH-REASON | الميزة لا تستخدم Drizzle schema جديد. تستخدم جدول `appPersistenceRecords` القائم منذ migration `0004_app_persistence_records.sql`. لا يوجد migration `0006_*` لتوليده. |
| 10 | `pnpm --filter @the-copy/backend db:migrate` | ⏭️ SKIPPED-WITH-REASON | لا migrations جديدة لتطبيقها. كذلك المنفذ `5433` (PostgreSQL) بلا listener وقت الجولة (موروث من session-state) فلا يمكن تشغيل أي migration. |
| 11 | `pnpm verify:runtime` / `pnpm run doctor` | ⏭️ SKIPPED-WITH-REASON | يعتمدان على infra حية (postgres/redis/weaviate/qdrant) — وكلها بلا listeners وفق session-state (`5433`، `6379`، `8080`، `6333`). تشغيلهما الآن سيرجع فشلًا بنيويًا غير مرتبط بالتكامل. مذكور صراحة في docs/dcoupage-audit.md § Runtime Analysis. |
| 12 | `pnpm --filter @the-copy/web e2e` (Playwright) | ⏭️ SKIPPED-WITH-REASON | يحتاج dev server حيًا + auth fixtures + DB live. خارج النطاق التشغيلي لهذه الجولة بدون infra؛ وُثِّق بدلًا من تجاوزه. |
| 13 | `pnpm agent:verify` | ⏭️ DEFERRED | يعتمد على bootstrap حديث ولا يمس الكود الجديد (يحقق طبقة الوكلاء فقط). شُغِّل ضمن `pnpm agent:bootstrap` في بداية الجلسة بنجاح. |

### قواعد عدم الإضعاف — إثبات التزام

- صفر تعديل على أي ملف فحص أو اختبار أو CI أو ESLint config أو Vitest config أو Playwright config أو drizzle config أو migration ساكنة أو security middleware أو scripts/quality/* أو scripts/security/* أو scripts/agent/*.
- كل ملاحظات ESLint عُولجت بإصلاح كود الميزة الجديدة، **لا بتخفيف القاعدة**.
- ملف `DecoupageWorkspace.tsx` كان يتجاوز حدود `max-lines: 600` بـ 31 سطرًا، فاستُخرج `ModeSpecificControls.tsx` كمكوّن منفصل بدل رفع الحد.

### العقبات الموثقة (لم تُجاوَز بافتراض)

| العقبة | الوقت | الدليل التشغيلي |
|---|---|---|
| `pnpm agent:bootstrap` فشل في الـ worktree (غياب node_modules) | بداية الجولة الأولى | تم النقل للمستودع الأم بإذن صريح من المستخدم — وثِّق في docs/dcoupage-audit.md § Boot Protocol. |
| listeners على المنافذ `5433/6379/8080/6333` غير قائمة | طوال الجولة | يمنع `pnpm verify:runtime`، `pnpm run doctor`، `db:generate`، `db:migrate`، أي backend integration test يحتاج DB حية. |
| `.env.local` مفقود في D-COUPAGE المصدر | فحص Runtime PHASE 1 | يمنع تشغيل تفاعلي حقيقي مع Gemini — وُثِّق في docs/dcoupage-audit.md § 1.2.6. |

