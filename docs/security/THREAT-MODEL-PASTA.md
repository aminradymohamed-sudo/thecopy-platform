# نموذج تهديدات الكود وفق منهجية PASTA

> Process for Attack Simulation and Threat Analysis — تطبيق المراحل السبع على مستودع `the-copy / yarab-we-elnby`.

| البند | القيمة |
|---|---|
| تاريخ الإصدار | 2026-05-03 |
| الفرع | `claude/create-threat-model-K8fXB` |
| النطاق | المستودع الكامل: `apps/backend`, `apps/web`, `packages/*`, طبقة الذاكرة الدائمة، طبقة RAG، خط CI |
| المنهج | PASTA — 7 مراحل |
| طبيعة الوثيقة | إضافية فقط، لا تعدّل أو تُضعف أي ملف فحص أو تحقق أو اختبار قائم |
| المرجع المكمّل | `docs/security/THREAT-MODEL.md` (تحليل STRIDE الموازي) |
| العقد الحاكم | `AGENTS.md` + `.repo-agent/OPERATING-CONTRACT.md` + `.repo-agent/RAG-OPERATING-CONTRACT.md` |

---

## المرحلة 1 — تعريف الأهداف (Stage 1: Define Objectives)

### 1.1 أهداف العمل

- منصة تأليف وإخراج درامي عربي تعتمد ذكاءً اصطناعيًا متعدد المزودين لتحليل النصوص، توليد البريك‑داون، إدارة المشاهد والشخصيات واللقطات، والعصف الذهني، مع طبقة ذاكرة دائمة للوكلاء.
- المحافظة على ملكية المستخدم لمشاريعه الإبداعية (أصول إبداعية حساسة) ومنع تسريبها لأي طرف ثالث دون موافقة.
- ضمان استمرارية خدمة محرر الويب وخط OCR العربي وخدمات RAG ضمن أهداف SLO معرّفة في `slo-metrics.middleware.ts`.

### 1.2 الأهداف الأمنية

| الهدف | الوصف | المؤشر القابل للقياس |
|---|---|---|
| السرية | حماية المشاريع الإبداعية، الذاكرة الدائمة، أسرار المزودين، PII المستخدم | عدم وجود تسريب أسرار في `.agent-code-memory/` و logs بعد `agent:persistent-memory:secrets:scan` |
| السلامة | منع التلاعب بالنصوص والذاكرة والمسارات الإدارية | كل تغيير حالة يمر بـ `csrfProtection` + `authMiddleware` + WAF |
| التوفر | استقرار الخدمات الخلفية والطوابير | `health/ready` و `health/live` + Sentry SLO |
| المساءلة | أثر تدقيق على الإجراءات الحساسة | مرور كل عملية إدارية عبر `security-logger.middleware.ts` |
| الامتثال | منع إضعاف الفحوصات | `AGENTS.md` + `.repo-agent/TOOL-GUARD-CONTRACT.json` + خطافات `husky` |

### 1.3 المتطلبات التنظيمية والداخلية

- منع كامل لاستخدام `npm`/`yarn` بدلًا من `pnpm` داخل المسار الرسمي.
- منع إضعاف أي فحص أو اختبار أو خطّاف وفق `CLAUDE.md` و `AGENTS.md`.
- منع إنشاء/إبقاء محاكاة محلية لمكونات `Aceternity UI` لها مقابل رسمي.
- المصدر الوحيد للحالة التشغيلية هو `output/session-state.md` و `output/round-notes.md`.

### 1.4 معايير قبول هذا النموذج

- تغطية الطبقات: API، AuthN/AuthZ، RAG/Memory، Editor، File pipeline، CI/Supply chain، Observability.
- ربط كل تهديد بـ ملف/مسار حقيقي موجود في المستودع.
- اقتراحات معالجة دون تنفيذ، حتى لا يتعارض مع قاعدة منع إضعاف الفحوصات.

---

## المرحلة 2 — تعريف النطاق التقني (Stage 2: Define Technical Scope)

### 2.1 المكوّنات داخل النطاق

- **الواجهة الخلفية**: `apps/backend` (Express + Node.js)، المنفذ `3001`.
- **الواجهة الأمامية**: `apps/web` (Next.js)، المنفذ `5000`، يضم `editor` و RAG محلي.
- **الحزم المشتركة**: `packages/{ai-orchestration,api-client,breakapp,copyproj-schema,core-memory,error-boundary,export,persistence,prompt-engineering,security-middleware,validation}`.
- **طبقة الذاكرة الدائمة**: `scripts/agent/lib/persistent-memory/*`، `apps/backend/src/db/persistent-agent-memory.schema.ts`، `apps/backend/src/memory/*`.
- **طبقة RAG**: `apps/backend/src/services/rag/*`، `apps/web/src/app/(main)/editor/src/rag/*`، `apps/web/src/lib/ai/rag/*`، `apps/web/src/lib/drama-analyst/*`.
- **خط OCR**: `apps/backend/src/ocr-arabic-pdf-to-txt-pipeline`.
- **البنية التحتية المحلية**: `docker-compose.yml`, `docker-compose.infra.yml`, `docker-compose.hub.yml`, `podman-compose.infra.yml`.

### 2.2 الاعتماديات الخارجية

| الاعتماد | الاستخدام | السر |
|---|---|---|
| `PostgreSQL` (Neon) | المخزن الرئيسي للأعمال + persistent_agent_memory | `DATABASE_URL` |
| `Redis` (+ Sentinel اختياري) | كاش، طوابير BullMQ | `REDIS_URL`, `REDIS_PASSWORD`, `REDIS_SENTINEL_PASSWORD` |
| `Weaviate` | RAG + ذاكرة دائمة (primary) | اعتمادات الخادم |
| `Qdrant` | فهرس editor RAG + ذاكرة دائمة (shadow) | `QDRANT_URL`, `QDRANT_API_KEY` |
| `LanceDB` (محلي) | embeddings الكود | لا يوجد |
| `Google Gemini` | LLM رئيسي + embeddings | `GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY` |
| `OpenRouter`, `Anthropic`, `OpenAI`, `DeepSeek`, `Mistral`, `Groq`, `Moonshot` | مزودون اختياريون | مفاتيح خاصة بكل مزود |
| `BAAI/bge-m3` | embeddings محلية للذاكرة الدائمة | لا يوجد (محلي) |
| `Sentry` | رصد الأخطاء | DSN |
| `Prometheus` | قياسات | عبر `/metrics` |

### 2.3 الأدوات الأمنية المُفعَّلة في المستودع

- **Helmet + CSP** (`csp.middleware.ts`).
- **CORS allowlist** (`middleware/index.ts` + `CORS_ORIGIN`).
- **CSRF** (`csrf.middleware.ts` + `server/csrf-origin-validator.ts`).
- **WAF** (مجلد `middleware/waf/` + `waf.middleware.ts` + قواعد + اختبارات).
- **Rate limit** (`express-rate-limit` + `perUserAiLimiter`).
- **Auth + zkLogin + MFA** (`auth.middleware.ts`, `zkAuth.controller.ts`, `mfa.service.ts`).
- **LLM Guardrails** (`llm-guardrails.{service,detection,patterns,pii}.ts`).
- **Log sanitization** (`log-sanitization.middleware.ts`, `safe-logging.middleware.ts`).
- **Security event logging** (`security-logger.middleware.ts`).
- **Cost tracker** (`gemini-cost-tracker.service.ts`).
- **Static & secrets scanning**: `.gitleaks.toml`, `.gitsecrets`, `.semgrep/`, `.eslint*`, `.stylelintrc.cjs`, `.markdownlint.json`, `.trivyignore`, `.husky/`.
- **Tool guard**: `.repo-agent/TOOL-GUARD-CONTRACT.json` + `pnpm agent:guard:*`.
- **Persistent memory secret hygiene**: `pnpm agent:persistent-memory:secrets:{scan,verify,purge}`.

### 2.4 خارج النطاق

- البنية التحتية للسحابة المضيفة لـ Neon/Redis/Vector stores (تخضع لنموذج تشغيل منفصل).
- أمان أجهزة المطورين النهائية.
- سياسات IdP الخارجية المستخدمة في zkLogin.

---

## المرحلة 3 — تفكيك التطبيق (Stage 3: Application Decomposition)

### 3.1 المكوّنات وأدوارها

| المكوّن | الدور | الواجهات | الثقة |
|---|---|---|---|
| `apps/web` | تقديم واجهة، editor، RAG محلي خفيف | المتصفح، الخلفية | غير موثوق (مدخلات مستخدم) |
| `apps/backend` | API، Workers، Memory، RAG | الواجهة، DB، Redis، Vector، AI APIs | موثوق نسبيًا داخل حد TB |
| `packages/security-middleware` | helpers أمنية مشتركة | يستخدمها backend وأدوات | موثوق |
| `packages/validation` | مخططات Zod المشتركة | يستخدمها backend وغيره | موثوق |
| `packages/persistence` | طبقة ORM/Drizzle | backend | موثوق |
| `packages/core-memory` | chunking دلالي | backend + scripts | موثوق |
| `packages/ai-orchestration` | تنسيق سلاسل الوكلاء | backend | موثوق |
| `scripts/agent/lib/persistent-memory/*` | الذاكرة الدائمة | الجلسة + DB + Vector + Redis | موثوق |
| `scripts/generate-workspace-embeddings.js` | فهرسة embeddings الكود | LanceDB/Qdrant | موثوق |

### 3.2 الممثّلون (Actors)

| الممثل | الموقع | الامتيازات |
|---|---|---|
| ضيف | إنترنت | `/health/*`, `/api/health` |
| مستخدم مصادَق | إنترنت + جلسة | مشاريعه فقط (يُفترض RLS منطقي عبر `user_id`) |
| مدير | جلسة + RBAC | `/api/queue/*`, `/api/waf/*`, `bull-board`, إعدادات WAF |
| نظام داخلي | داخل الشبكة | `/metrics`, مهام BullMQ، Workers |
| مزوّد LLM خارجي | إنترنت | يستلم prompts ومستندات وقد يردّ بمحتوى ضار محتمل |
| المطور (CI) | بيئة CI | تشغيل `pnpm`, fences الفحص، pre-commit hooks |

### 3.3 الأصول حسب المالك

- **بيانات إبداعية ←** المستخدم، يُديرها backend عبر controllers (`projects`, `scenes`, `characters`, `shots`, `brainstorm-sessions`, `breakdown`).
- **PII ←** المستخدم، تظهر في `auth.service.ts`, `mfa.service.ts`, `zkAuth.controller.ts`.
- **أسرار التكامل ←** المنصة، في متغيرات البيئة فقط.
- **الذاكرة الدائمة للوكلاء ←** المنصة، تُستهلك من الوكلاء المعتمدين فقط.
- **embeddings الكود ←** المنصة، تخضع لـ `agent:persistent-memory:secrets:scan`.

### 3.4 تدفقات البيانات الحرجة

1. **تدفق المصادقة**: المتصفح → `/api/auth/zk/*` → IdP → `zkAuth.controller.ts` → cookie + JWT → `auth.middleware.ts` على المسارات اللاحقة.
2. **تدفق التحليل/RAG**: المتصفح → `analysis.controller.ts` → `enhancedRAG.service.ts` → `embeddings.service.ts` (Gemini) → `weaviate-retrieval.service.ts` → `context-assembly.service.ts` → `gemini.service.ts` → الرد.
3. **تدفق الذاكرة الدائمة**: `output/session-state.md` و `output/round-notes.md` → `persistent-memory:ingest` → Postgres + Weaviate primary + Qdrant shadow + Redis BullMQ.
4. **تدفق OCR**: المتصفح → `/api/file-extract` → `editor/runtime` → `ocr-arabic-pdf-to-txt-pipeline` → Mistral/Groq → نص.
5. **تدفق Editor RAG**: المتصفح ↔ `apps/web/src/app/(main)/editor` ↔ Qdrant (`codebase-index`).
6. **تدفق Bull-Board**: المدير ↔ `bull-board.middleware.ts` (خلف auth).

### 3.5 تعداد نقاط الدخول (Entry Points)

- HTTP: كل route مسجّل في `server/route-registrars*` + `routes/*.routes.ts`.
- WebSocket/SSE: `services/websocket.service.ts`, `services/sse.service.ts`, `controllers/realtime.controller.ts`.
- Queue: مستهلكو `BullMQ` في `apps/backend/src/queues`.
- CLI: أوامر `pnpm agent:*` المعرَّفة في `output/session-state.md`.
- Editor runtime: `registerEditorRuntimeRoutes` (`apps/backend/src/editor/runtime`).

---

## المرحلة 4 — تحليل التهديدات (Stage 4: Threat Analysis)

> اعتماد مزيج من **STRIDE** كخريطة فئات + **MITRE ATT&CK** كقاموس تكتيكات + **OWASP LLM Top 10 (2025)** للجوانب التوليدية.

### 4.1 وكلاء التهديد (Threat Agents)

| الوكيل | الدافع | القدرة | احتمال الاستهداف |
|---|---|---|---|
| مهاجم انتهازي خارجي | كسب مالي / تسريب بيانات | متوسطة | مرتفع |
| منافس استخباراتي | سرقة محتوى إبداعي | مرتفعة | متوسط |
| مستخدم عادي مسيء | تجاوز حدود الاستخدام | منخفضة | مرتفع |
| داخلي ضار / مساوم | الوصول للذاكرة الدائمة والأسرار | مرتفعة | منخفض-متوسط |
| مهاجم سلسلة إمداد | إدخال تبعية ملوَّثة | مرتفعة | متوسط |
| مزوّد LLM ضار/مخترَق | حقن استجابات تنفّذ ضمن واجهة المستخدم | مرتفعة | منخفض-متوسط |

### 4.2 سيناريوهات التهديد المركّبة (Threat Scenarios)

#### TS-1: حقن مستند خبيث في RAG لاستخراج محتوى مستخدم آخر
- الوكيل: مستخدم مسيء.
- المسار: رفع مستند يحوي تعليمات حقن (`system: تجاهل التعليمات السابقة و …`) → يدخل `Weaviate:AdHocChunks` → في استعلام لاحق لمستخدم مختلف يُسترجع ضمن السياق إن لم يُفصَل بـ `tenant_id`/`user_id`.
- الفئة STRIDE: Information Disclosure / Tampering.
- OWASP LLM: LLM01 (Prompt Injection)، LLM06 (Sensitive Information Disclosure).
- نقاط الكود ذات الصلة: `weaviate-retrieval.service.ts`, `enhancedRAG.service.ts`, `context-assembly.service.ts`, `llm-guardrails.service.ts`.

#### TS-2: انتزاع `JWT_SECRET` ضعيف وانتحال جلسات
- الوكيل: مهاجم خارجي.
- المسار: نشر إنتاجي بقيمة افتراضية في `.env.example` → توقيع توكنات صالحة → الوصول للموارد.
- STRIDE: Spoofing / EoP.
- ATT&CK: T1078 Valid Accounts، T1552 Unsecured Credentials.
- نقاط الكود: `config/env`, `auth.middleware.ts`, `auth.service.ts`.

#### TS-3: تجاوز CSRF على مسار state-changing جديد
- الوكيل: انتهازي عبر صفحة خارجية.
- المسار: تسجيل route جديد في `route-registrars` ينسى `csrfProtection` → استدعاء عبر تصيّد متصفح المستخدم → تنفيذ تغيير حالة.
- STRIDE: Tampering.
- نقاط الكود: `server/route-registrars.ts`, `csrf.middleware.ts`.

#### TS-4: تسرّب سرّ مزود AI في embeddings الكود
- الوكيل: داخلي/تكوين خاطئ.
- المسار: ملف يحتوي مفتاحًا → `pnpm workspace:embed` → يُكتب إلى `WORKSPACE-EMBEDDING-INDEX.json` و `.agent-code-memory/` → استرجاع لاحق يكشف السر.
- STRIDE: Information Disclosure.
- OWASP LLM: LLM06.
- ضوابط: `agent:persistent-memory:secrets:scan` + `gitleaks` + `.gitsecrets`.

#### TS-5: SSRF عبر مسار OCR
- الوكيل: مستخدم مسيء.
- المسار: تمرير URL يدّعي أنه ملف للاستخراج → الخادم يجلب من شبكة داخلية (metadata service مثلًا).
- STRIDE: Tampering / Information Disclosure.
- ATT&CK: T1190.
- نقاط الكود: `editor/runtime`, `ocr-arabic-pdf-to-txt-pipeline`, `validation.middleware.ts`.

#### TS-6: استنزاف الذكاء الاصطناعي وتكلفته
- الوكيل: مستخدم انتهازي.
- المسار: حلقة استدعاء `/api/ai/*` → استهلاك ميزانية Gemini.
- STRIDE: DoS.
- OWASP LLM: LLM10 (Unbounded Consumption).
- ضوابط: `perUserAiLimiter`, `gemini-cost-tracker.service.ts`, WAF.

#### TS-7: تسميم سلسلة الإمداد عبر pnpm-lock
- الوكيل: مهاجم خارجي.
- المسار: PR يدخل تبعية ملوثة + يخفّض عتبة `trivy` عبر `.trivyignore` → بناء يحمل الحمولة.
- STRIDE: Tampering / EoP.
- ATT&CK: T1195.002.
- ضوابط: قاعدة `AGENTS.md` المنع الصريح لإضعاف الفحوصات + الحارس + مراجعة PR.

#### TS-8: كشف Bull-Board و `/metrics` بلا حماية كافية
- الوكيل: ماسح إنترنت.
- المسار: نشر بدون allowlist شبكي → كشف بنية الطوابير وقياسات داخلية.
- STRIDE: Information Disclosure.
- نقاط الكود: `getAuthenticatedBullBoardRouter`, `metricsEndpoint`.

#### TS-9: انتحال origin و bypass CORS عبر null/سلسلة فارغة
- الوكيل: انتهازي.
- المسار: مولّد طلب يلعب على `Origin: null` → عبور allowlist إن لم يُتعامل بصرامة.
- STRIDE: Spoofing / Tampering.
- نقاط الكود: `middleware/index.ts` (`buildEffectiveWhitelist`), `csrf-origin-validator.ts`.

#### TS-10: حقن XSS عبر إخراج LLM داخل المحرر
- الوكيل: مهاجم محتوى.
- المسار: محتوى مزود يحوي HTML/scripts → عرض dangerouslySetInnerHTML في المحرر → تنفيذ في جلسة الضحية.
- STRIDE: Tampering / EoP.
- OWASP LLM: LLM02 (Improper Output Handling).
- ضوابط: `csp.middleware.ts` + sanitizer واجبة في طبقة العرض.

#### TS-11: إعادة تشغيل nonce في zkLogin
- الوكيل: خارجي.
- المسار: التقاط nonce وإعادة استخدامه قبل انتهاء صلاحيته.
- STRIDE: Spoofing.
- نقاط الكود: `zkAuth.controller.ts`.

#### TS-12: تخريب الذاكرة الدائمة (Index Poisoning)
- الوكيل: داخلي/مسيء.
- المسار: ingest محتوى مصمَّم لتمرير أوامر إلى الوكلاء عبر استرجاع لاحق.
- STRIDE: Tampering.
- OWASP LLM: LLM03 (Training/Indirect Prompt Injection)، LLM04 (Data and Model Poisoning).
- نقاط الكود: `persistent-memory:ingest`, `persistent-memory:index`.

#### TS-13: تجاوز MFA باستخراج المفاتيح من الذاكرة الدائمة
- الوكيل: داخلي.
- المسار: قراءة سجلات تحتوي MFA secrets غير منقّاة.
- STRIDE: Spoofing / Information Disclosure.
- ضوابط: `log-sanitization.middleware.ts`, `mfa.service.ts`.

#### TS-14: ضعف عزل المستأجر في Editor RAG
- الوكيل: مستخدم.
- المسار: استعلام `Qdrant:codebase-index` بدون حد هوية → كشف كود مستخدم آخر.
- STRIDE: Information Disclosure.
- نقاط الكود: `apps/web/src/app/(main)/editor/src/rag/query.ts`, `rag/config.ts`.

#### TS-15: تخطي الحارس الآلي للأدوات
- الوكيل: داخلي/أداة غير معتمدة.
- المسار: استخدام `npm`/`yarn` بدلاً من `pnpm` أو تجاوز `agent:guard:start`.
- STRIDE: Tampering / EoP.
- ضوابط: `.repo-agent/TOOL-GUARD-CONTRACT.json`, خطافات `husky`.

---

## المرحلة 5 — تحليل الثغرات (Stage 5: Vulnerability Analysis)

### 5.1 ربط السيناريوهات بالضوابط الموجودة (control mapping)

| السيناريو | الضوابط القائمة | النضج | الفجوة المرشَّحة |
|---|---|---|---|
| TS-1 | `llm-guardrails.*` + فلترة الفئات | متوسط | تأكيد إلزامي لفلترة `tenant_id`/`user_id` على كل استعلام Weaviate/Qdrant |
| TS-2 | فحص قيمة `JWT_SECRET` في `config/env` | متوسط | اختبار تكامل يفشل البناء عند قيم افتراضية في `production` |
| TS-3 | `csrf.middleware.ts` + اختبارات | عالي على المسارات الحالية | matrix test تلقائي على `route-registrars` |
| TS-4 | `gitleaks` + `secrets:scan` + `secrets:purge` | عالي | تشغيل `secrets:scan` على فهارس embeddings كبوابة CI |
| TS-5 | `validation.middleware.ts` + WAF | متوسط | allowlist صارم لأي fetch خادمي + رفض URL داخلي |
| TS-6 | rate-limit + cost tracker | عالٍ | متجر Redis للحدود حسب التعليق في `middleware/index.ts` |
| TS-7 | `trivy` + `.trivyignore` + قاعدة AGENTS | عالي | لوحة CI ترفض زيادة استثناءات `.trivyignore`/تخفيض عتبات |
| TS-8 | `bull-board` خلف auth | متوسط | تقييد شبكي + MFA |
| TS-9 | CORS allowlist | متوسط | اختبار حالات `Origin: null` و origin فارغ |
| TS-10 | CSP + Next.js | متوسط | فحص dynamic HTML insertion + sanitizer لمخرجات LLM |
| TS-11 | zkLogin + nonce | متوسط | اختبار سلبي لإعادة استخدام nonce |
| TS-12 | حُكم الذاكرة الدائمة | متوسط | فحص محتوى قبل الفهرسة (anti-injection patterns) |
| TS-13 | log sanitization | عالي | golden test لقيم تشبه أسرار MFA/JWT في كل قنوات السجل |
| TS-14 | متغيرات البيئة الخادمية فقط | منخفض-متوسط | فحص ما بعد البناء أن قيم env المحظورة ليست في `apps/web/.next` |
| TS-15 | TOOL-GUARD + AGENTS.md | عالٍ | `pnpm agent:guard:verify` كبوابة CI ورفض `package-lock.json`/`yarn.lock` |

### 5.2 افتراضات الفحص

- جميع الاختبارات الحالية تعمل وفق الإعداد المعتمد.
- لا يوجد تخفيف لأي من فحوص: Vitest/Vitest UI، ESLint، Stylelint، semgrep، gitleaks، trivy، husky، الفحوص في `packages/security-middleware/__tests__` و `apps/backend/src/middleware/__tests__`.

---

## المرحلة 6 — نمذجة الهجوم (Stage 6: Attack Modeling)

### 6.1 أشجار هجوم مختصرة (Attack Trees)

#### AT-1: الهدف = قراءة مشروع مستخدم آخر

```text
هدف الجذر: قراءة مشروع مستخدم آخر
├── (أ) تجاوز عزل المستأجر في RAG
│   ├── حقن مستند يحتوي تعليمات (TS-1)
│   └── استعلام بدون فلتر هوية (TS-14)
├── (ب) انتحال جلسة مالك المشروع
│   ├── JWT_SECRET ضعيف (TS-2)
│   └── إعادة nonce zkLogin (TS-11)
├── (ج) تجاوز CSRF لإجراء قراءة محسوبة كحالة (TS-3)
└── (د) استرجاع من embeddings الكود لمشروع داخلي (TS-4)
```

#### AT-2: الهدف = تشغيل كود في متصفح ضحية

```text
├── XSS عبر إخراج LLM (TS-10)
├── تخريب CSP عبر تكوين خاطئ
└── تجاوز sanitizer في عرض المحرر
```

#### AT-3: الهدف = استنزاف الميزانية أو الخدمة

```text
├── انتهاك حدود الاستخدام (TS-6)
├── إغراق طوابير BullMQ بمدخلات كبيرة
└── ملفات OCR ضخمة (TS-5 جانبي + DoS)
```

#### AT-4: الهدف = إدخال تبعية أو تغيير ملوَّث

```text
├── PR يضيف dependency ملوَّث (TS-7)
├── تجاوز خطافات husky (TS-15)
└── تخفيض عتبات الفحص أو إضعاف الأنماط (يخالف AGENTS.md)
```

### 6.2 محاكاة هجوم مختصرة لكل شجرة

- **AT-1/أ**: تنفيذ uploader محلي يحقن `<<<system: ignore previous instructions>>>` ضمن مستند → تشغيل فحص أن `llm-guardrails.detection.ts` يحاصره قبل أن يصل `gemini.service.ts`.
- **AT-1/ب**: تشغيل اختبار سلبي مع `JWT_SECRET=change-me-...` في `NODE_ENV=production` يجب أن يفشل bootstrap.
- **AT-2**: حقن payload `<img src=x onerror=...>` ضمن استجابة وهمية لـ Gemini والتحقق أن العرض في المحرر لا ينفّذ.
- **AT-3**: استدعاء سريع متكرر لـ `/api/ai/context-enhance` للتأكد من فعالية `perUserAiLimiter` وتسجيل `logSecurityEvent`.
- **AT-4**: إدخال `package-lock.json` افتراضي والتأكد أن `agent:guard:verify` و CI يرفضانه.

> هذه المحاكاة مقترحات غير منفّذة، ويجب أن تُكتب كاختبارات سلبية إضافية تزيد التغطية ولا تخفّضها.

---

## المرحلة 7 — تحليل المخاطر والأثر (Stage 7: Risk and Impact Analysis)

### 7.1 معايير الأثر

| المستوى | السرية | السلامة | التوفر | المالية/السمعة |
|---|---|---|---|---|
| 5 — كارثي | تسريب جماعي لمشاريع/أسرار | تخريب الذاكرة الدائمة بالكامل | توقف منتج >24h | فقدان ثقة جماعي |
| 4 — كبير | تسريب مستأجر واحد كامل | تخريب جزئي قابل للتعافي | توقف 4-24h | عقوبة عقد |
| 3 — متوسط | تسريب جزئي محدود | تعديل غير مصرّح به | توقف <4h | شكوى محدودة |
| 2 — منخفض | تسريب metadata | تشويش بسيط | تباطؤ | داخلي |
| 1 — مهمل | لا أثر فعلي | لا أثر فعلي | لا أثر فعلي | لا |

### 7.2 درجات الاحتمال

5 = شائع، 4 = مرجَّح، 3 = ممكن، 2 = نادر، 1 = شبه مستحيل.

### 7.3 سجل المخاطر

| المعرّف | السيناريو | الاحتمال | الأثر | المخاطرة (L×I) | الأولوية | المالك المقترح |
|---|---|---|---|---|---|---|
| R-01 | TS-2 JWT افتراضي | 3 | 5 | 15 | حرجة | فريق الخلفية |
| R-02 | TS-1 حقن RAG عبر مستند | 4 | 4 | 16 | حرجة | فريق RAG |
| R-03 | TS-14 ضعف عزل Editor RAG | 3 | 5 | 15 | حرجة | فريق المحرر |
| R-04 | TS-4 تسرّب سر في embeddings | 3 | 5 | 15 | حرجة | فريق الذاكرة |
| R-05 | TS-7 سلسلة إمداد | 2 | 5 | 10 | عالية | فريق التشغيل |
| R-06 | TS-3 CSRF على route جديد | 3 | 4 | 12 | عالية | فريق الخلفية |
| R-07 | TS-10 XSS عبر LLM | 3 | 4 | 12 | عالية | فريق المحرر |
| R-08 | TS-5 SSRF في OCR | 2 | 5 | 10 | عالية | فريق OCR |
| R-09 | TS-6 استنزاف AI | 4 | 3 | 12 | عالية | فريق المنصة |
| R-10 | TS-9 Origin spoofing | 3 | 3 | 9 | متوسطة | فريق الخلفية |
| R-11 | TS-8 كشف Bull-Board/Metrics | 2 | 4 | 8 | متوسطة | فريق التشغيل |
| R-12 | TS-11 إعادة nonce | 2 | 4 | 8 | متوسطة | فريق المصادقة |
| R-13 | TS-12 تسميم الذاكرة | 2 | 4 | 8 | متوسطة | فريق الذاكرة |
| R-14 | TS-13 تسرّب MFA في السجل | 2 | 5 | 10 | عالية | فريق المراقبة |
| R-15 | TS-15 تخطي الحارس | 2 | 5 | 10 | عالية | فريق DX/CI |

### 7.4 إستراتيجية المعالجة المقترحة (دون تنفيذ)

> أي إجراء أدناه يلتزم بقاعدة منع إضعاف الفحوصات ويُضيف فحصًا جديدًا أو يشدّد فحصًا قائمًا فقط، ولا يعطّل أو يخفّض عتبة قائمة.

1. **R-01**: اختبار تكامل (إضافي) في `apps/backend/src/__tests__` يضمن فشل bootstrap في `NODE_ENV=production` عند أي قيمة افتراضية لـ `JWT_SECRET` أو طول < 32.
2. **R-02 / R-03 / R-13**: golden tests للحقن غير المباشر تضمن مرور كل سياق RAG عبر `llm-guardrails.detection.ts` قبل التركيب، وفلترة هوية صارمة في `weaviate-retrieval.service.ts` و `apps/web/.../editor/src/rag/query.ts`.
3. **R-04**: تشغيل `pnpm agent:persistent-memory:secrets:scan` و `gitleaks` كبوابة CI إلزامية على `.agent-code-memory/` و `WORKSPACE-EMBEDDING-INDEX.json`.
4. **R-05 / R-15**: لوحة CI ترفض زيادة استثناءات `.trivyignore` أو وجود `package-lock.json`/`yarn.lock` أو غياب `pnpm agent:guard:verify`.
5. **R-06**: matrix test يُولَّد من قائمة `route-registrars/*` للتأكد من وجود `csrfProtection` و `authMiddleware` على المسارات state-changing.
6. **R-07**: اختبار يحقن HTML/script في استجابة وهمية لـ Gemini ويتحقق من sanitization في طبقة العرض + سياسة CSP صارمة.
7. **R-08**: allowlist صارم لأي fetch خادمي + رفض IP داخلي/metadata + اختبار سلبي.
8. **R-09**: إكمال متجر Redis لـ rate-limit وفق التعليق الموجود فعلًا في `middleware/index.ts`.
9. **R-10**: اختبار `Origin: null` وقيم فارغة وحرف خفي في `csrf-origin-validator.ts`.
10. **R-11**: تقييد `bull-board`, `/metrics`, `/health/detailed` بـ allowlist شبكي + MFA إنتاجي.
11. **R-12**: اختبار سلبي يضمن رفض إعادة استخدام nonce في `zkAuth.controller.ts`.
12. **R-14**: إدخال أنماط أسرار شائعة في كل قناة سجل والتحقق من إخفائها قبل المغادرة.

### 7.5 خطة المراقبة المستمرة

- ربط `security-logger.middleware.ts` بأحداث `SecurityEventType` مع تنبيه على عتبة.
- لوحة Sentry للأنماط الجديدة من `llm-guardrails.detection.ts`.
- لوحة Prometheus لكل من: rate-limit hits, WAF blocks, gemini cost burn, queue depth.
- مراجعة دورية لـ `output/round-notes.md` لرصد drift أمني.

---

## ملخص تنفيذي

- **النموذج**: PASTA كامل بسبع مراحل، مرتبط بـ STRIDE و OWASP LLM 2025 و MITRE ATT&CK.
- **15 سيناريو تهديد** و **15 خطر مسجَّل**، أعلاها 4 مخاطر حرجة: JWT افتراضي، حقن RAG، عزل Editor RAG، تسرّب أسرار في embeddings الكود.
- **12 إجراء معالجة** مقترحة، جميعها إضافية لا تضعف أي فحص قائم.
- **التوافق مع العقد**: ملتزم بـ `AGENTS.md`، `CLAUDE.md`، `.repo-agent/OPERATING-CONTRACT.md`، `.repo-agent/RAG-OPERATING-CONTRACT.md`.

---

## مراجع متشابكة

- `docs/security/THREAT-MODEL.md` (تحليل STRIDE الموازي).
- `apps/backend/src/server/route-registrars.ts` و `apps/backend/src/server/route-registrars/*`.
- `apps/backend/src/middleware/*` (waf, csrf, csp, auth, rate-limit, log-sanitization, security-logger, sentry).
- `apps/backend/src/services/llm-guardrails.*`, `gemini-cost-tracker.service.ts`, `mfa.service.ts`, `auth.service.ts`.
- `apps/backend/src/controllers/zkAuth.controller.ts`, `encryptedDocs.controller.ts`.
- `apps/backend/src/memory/*` و `apps/backend/src/services/rag/*`.
- `apps/web/src/app/(main)/editor/src/rag/*`, `apps/web/src/lib/ai/rag/*`, `apps/web/src/lib/drama-analyst/*`.
- `packages/security-middleware/*`, `packages/validation/*`, `packages/persistence/*`, `packages/core-memory/*`.
- `scripts/agent/lib/persistent-memory/*` و `scripts/generate-workspace-embeddings.js`.
- `.gitleaks.toml`, `.gitsecrets`, `.trivyignore`, `.semgrep/`, `.husky/`, `.repo-agent/TOOL-GUARD-CONTRACT.json`.

---

## سجل المراجعة

| التاريخ | المؤلف | الوصف |
|---|---|---|
| 2026-05-03 | claude/create-threat-model-K8fXB | الإصدار الأول لنموذج PASTA الكامل |
