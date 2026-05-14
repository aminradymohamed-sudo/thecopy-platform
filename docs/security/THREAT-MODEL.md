# نموذج تهديدات الكود — the-copy / yarab-we-elnby

| البند | القيمة |
|---|---|
| تاريخ الإصدار | 2026-05-03 |
| الفرع | `claude/create-threat-model-K8fXB` |
| النطاق | المستودع الكامل (apps/backend, apps/web, packages/*, طبقة الذاكرة الدائمة، طبقة RAG، خط CI) |
| المنهج | STRIDE + قائمة الأصول + حدود الثقة + الضوابط الحالية + الفجوات |
| طبيعة الوثيقة | إضافية لا تعدّل أي ملف فحص أو تحقق أو اختبار قائم |
| العقد الحاكم | `AGENTS.md` + `.repo-agent/OPERATING-CONTRACT.md` + `.repo-agent/RAG-OPERATING-CONTRACT.md` |

---

## 1. الأصول (Assets)

### 1.1 أصول البيانات

- **مشاريع التأليف الدرامي**: السيناريوهات، المشاهد، الشخصيات، اللقطات، جلسات العصف، التحليلات. مخزّنة في `PostgreSQL` وتمر عبر `apps/backend/src/controllers/{projects,scenes,characters,shots,brainstorm-sessions,breakdown,analysis}.controller.ts`.
- **الذاكرة الدائمة للوكلاء** (`Persistent Agent Memory`): `PostgreSQL:persistent_agent_memory` + `Weaviate:persistent-agent-memory-primary` + `Qdrant:persistent-agent-memory-shadow` + طوابير `Redis:bullmq-persistent-memory-jobs`.
- **embeddings الكود الحية** (`Workspace Code Embeddings`): `LanceDB` محليًا + `WORKSPACE-EMBEDDING-INDEX.json` + `.embedding-hash-cache.json`.
- **الذاكرة الخلفية** (`Backend Memory Retrieval` / `Backend Enhanced RAG`): فئات `Weaviate` (AdHocChunks, Architecture, CodeChunks, Decisions, Documentation).
- **المستندات المشفّرة**: مسار `encryptedDocs.controller.ts`.
- **بيانات المستخدم وحساباته**: zkLogin artifacts، MFA secrets، JWT sessions.
- **سجلات وقياسات حساسة**: Sentry breadcrumbs، Prometheus metrics، Bull-Board، السجلات قبل التعقيم.
- **ملفات المستخدم المرفوعة**: مسار OCR العربي (`ocr-arabic-pdf-to-txt-pipeline`)، `file-extract`، `text-extract`.

### 1.2 أصول الأسرار والاعتمادات

- `JWT_SECRET` (≥ 32 حرفًا في الإنتاج).
- مفاتيح مزودي الذكاء الاصطناعي: `GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `MOONSHOT_*`.
- مفاتيح المخازن المتجهية: `QDRANT_API_KEY`, `QDRANT_URL`, اعتمادات `Weaviate`.
- اعتمادات قاعدة البيانات والوسطاء: `DATABASE_URL`, `REDIS_PASSWORD`, `REDIS_SENTINEL_PASSWORD`.
- مفاتيح zkLogin / MFA secrets / cookie signing keys.

### 1.3 أصول التشغيل والسلامة

- خطافات `husky` + سياسات `eslint`/`stylelint`/`semgrep`/`gitleaks`/`trivy`.
- `.repo-agent/TOOL-GUARD-CONTRACT.json` (الحارس الآلي) و `.repo-agent/OPERATING-CONTRACT.md`.
- `output/session-state.md` و `output/round-notes.md` كمصدر وحيد للحالة التشغيلية.
- ملف `.gitleaks.toml`، `.gitsecrets`، `.trivyignore`، `.semgrep/`، `.eslint-capture/`.

---

## 2. حدود الثقة (Trust Boundaries)

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ المستخدم النهائي / المتصفح                                                  │
└───────────────┬───────────────────────────────────────────────────────────┘
                │  HTTPS  (TB-1)
┌───────────────▼───────────────────────────────────────────────────────────┐
│ apps/web  (Next.js, port 5000)                                             │
│  - editor + RAG محلي (Qdrant)                                              │
│  - الواجهة الرئيسية + hero                                                 │
└───────────────┬───────────────────────────────────────────────────────────┘
                │  XHR/Fetch + CORS + CSRF  (TB-2)
┌───────────────▼───────────────────────────────────────────────────────────┐
│ apps/backend  (Express, port 3001)                                         │
│  helmet + WAF + rate-limit + CSRF + auth + log-sanitization                │
│  controllers / services / queues / memory / editor runtime                 │
└──┬──────────────┬──────────────────┬───────────────────┬──────────────────┘
   │ TB-3          │ TB-4              │ TB-5               │ TB-6
   ▼               ▼                  ▼                   ▼
┌─────────┐    ┌──────────┐     ┌───────────────┐   ┌────────────────────┐
│Postgres │    │Redis +   │     │Weaviate /     │   │External AI APIs:   │
│(Neon)   │    │BullMQ    │     │Qdrant /       │   │Gemini, OpenRouter, │
│         │    │          │     │LanceDB        │   │Anthropic, OpenAI,  │
└─────────┘    └──────────┘     └───────────────┘   │Mistral, Groq, ...  │
                                                    └────────────────────┘
```

| الحد | الجوانب | الضوابط الحالية |
|---|---|---|
| TB-1 | متصفح ↔ الواجهة | TLS، CSP (`csp.middleware.ts`)، COOKIE flags |
| TB-2 | الواجهة ↔ الواجهة الخلفية | CORS whitelist (`CORS_ORIGIN`), CSRF (`csrf.middleware.ts`)، CSRF origin validator (`server/csrf-origin-validator.ts`)، WAF (`waf.middleware.ts` + `waf-rules.ts`)، rate-limit، helmet، auth middleware، zkLogin، MFA |
| TB-3 | الخلفية ↔ Postgres | `sslmode=require` للإنتاج، اعتمادات من `env`، طبقة `db/` + Drizzle |
| TB-4 | الخلفية ↔ Redis/BullMQ | `REDIS_PASSWORD`، `Redis Sentinel` اختياري، عزل الطوابير، `bull-board.middleware.ts` خلف auth |
| TB-5 | الخلفية ↔ Vector stores | `QDRANT_API_KEY`، عزل الفئات في Weaviate، `LanceDB` محلي |
| TB-6 | الخلفية ↔ مزودو LLM | مفاتيح من `env` فقط، `gemini-cost-tracker`، `llm-guardrails` |

---

## 3. مخططات تدفق البيانات الحرجة (DFD)

### 3.1 تدفق التحليل الدرامي / RAG

`web/editor` ← (HTTPS+CSRF) → `backend/controllers/analysis` → `services/rag/enhancedRAG.service.ts` → `embeddings.service.ts` (Gemini) → `Weaviate AdHocChunks` → `context-assembly.service.ts` → `gemini.service.ts` → الرد.

### 3.2 تدفق الذاكرة الدائمة

`scripts/agent/lib/persistent-memory/*` ← المتغيّرات في `output/` و `AGENTS.md` → `apps/backend/src/db/persistent-agent-memory.schema.ts` (Postgres) → BullMQ Workers → embeddings (BAAI/bge-m3 محلي) → Weaviate primary + Qdrant shadow.

### 3.3 تدفق المصادقة zkLogin

المتصفح → `zkLoginInit` → IdP خارجي → `zkLoginVerify` → JWT في cookie + بصمة جلسة → middleware للحماية على المسارات الحساسة.

### 3.4 تدفق ملفات المستخدم (OCR/Extract)

`web` → `/api/file-extract` و `/api/files/extract` → `editor/runtime` → خط `ocr-arabic-pdf-to-txt-pipeline` → استدعاء `Mistral` أو `Groq` خارجيًا → نص مُستخرج يعود للواجهة.

---

## 4. تحليل التهديدات حسب STRIDE

> الأرقام بصيغة `T-XX`، الخطورة: حرجة / عالية / متوسطة / منخفضة. القيم تُقاس بافتراض الإعداد الافتراضي وفق `.env.example` و `route-registrars.ts` الحاليين.

### 4.1 الواجهة الخلفية العامة (Express API)

| المعرف | الفئة | التهديد | المتجه | الخطورة | الضوابط الحالية | الفجوات / الإجراءات |
|---|---|---|---|---|---|---|
| T-01 | Spoofing | تزوير JWT بسبب `JWT_SECRET` ضعيف أو افتراضي | استبدال غير مكتمل لقيمة `change-me-...` في الإنتاج | حرجة | فحص الطول (`>=32`) في `config/env`، رفض القيم التي تحوي `dev-secret` أو `CHANGE-THIS` | مطلوب اختبار تكامل يفشل البناء عند استخدام أي قيمة افتراضية، وتدوير دوري للمفتاح موثّق |
| T-02 | Tampering | CSRF عبر طلبات state-changing | استدعاء `POST/PUT/DELETE` من مصدر مخادع | عالية | `csrf.middleware.ts` + `csrf-origin-validator.ts` + CORS allowlist | تحقق أن جميع المسارات التي تغيّر الحالة موضوعة خلف `csrfProtection`، خاصة المسارات الجديدة في `route-registrars/*` |
| T-03 | Repudiation | إنكار العمليات الإدارية | غياب أثر تدقيق على الإجراءات الحساسة (waf, queue, memory purge) | متوسطة | `security-logger.middleware.ts` + Sentry + log-sanitization | إضافة سجل تدقيق غير قابل للتعديل (append-only) لعمليات WAF / Queue admin / persistent-memory:purge |
| T-04 | Information Disclosure | تسريب أسرار في السجلات | إعادة عرض headers أو bodies غير منقّاة | عالية | `log-sanitization.middleware.ts` + `safe-logging.middleware.ts` + `gitleaks.toml` + `agent:persistent-memory:secrets:scan` | اختبار سلوكي يحقن قيمة بنمط مفتاح ويتحقق من اختفائها في كل مخرجات السجل |
| T-05 | DoS | استنزاف بـ requests كثيرة | نقص rate-limit موزّع | متوسطة | `express-rate-limit` بمتجر in-memory + WAF rules | الانتقال لمتجر Redis (`rate-limit-redis`) لتعميم الحد عبر النسخ، حسب التعليق الموجود فعلًا في `middleware/index.ts` |
| T-06 | Elevation of Privilege | تجاوز auth على مسارات إدارية | مسار جديد يُسجّل دون `authMiddleware` | حرجة | لائحة `route-registrars/*` مركزية + اختبارات التحكم بالدخول | اختبار قائمة كاملة (matrix test) يضمن أن كل مسار `/api/admin/*`, `/api/queue/*`, `/api/waf/*`, `/metrics` المخصّصة وراء auth + RBAC |
| T-07 | Tampering | SSRF عبر استدعاءات مزود AI أو OCR | استقبال URL من المستخدم وإعادة الجلب من الخادم | عالية | تحقّق من المخططات في `validation.middleware.ts` + WAF | تأكيد أن لا منفذ يقبل URL خارجي للجلب الخادم بدون allowlist صارم خاصة في مسار OCR وروابط التصدير |

### 4.2 طبقة المصادقة (zkLogin + MFA + JWT)

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-08 | Spoofing | إعادة تشغيل nonce في zkLogin | عالية | `zkAuth.controller.ts` + recovery artifact | اختبار سلبي يتحقق من رفض إعادة استخدام nonce |
| T-09 | Tampering | تجاوز MFA | حرجة | `mfa.service.ts` + اختباراته | تحقّق من القفل بعد عدد محاولات فاشلة، ووجود قناة استرداد لا تُضعف العامل الثاني |
| T-10 | Information Disclosure | تسرب recovery artifact | عالية | `manageRecoveryArtifact` | تأكيد التشفير في الراحة وحدود الوصول للقراءة |

### 4.3 طبقات RAG والذاكرة

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-11 | Tampering | Prompt injection عبر مستندات RAG | عالية | `llm-guardrails.service.ts` + `llm-guardrails.detection.ts` + `llm-guardrails.patterns.ts` + `llm-guardrails.pii.ts` | اختبار golden للحقن المتكرر، وتأكيد تطبيق الحارس على كل مسار يستهلك السياق المسترجع وليس فقط prompts المباشرة |
| T-12 | Information Disclosure | تسريب محتوى مستخدم آخر عبر RAG (cross-tenant) | حرجة | فلترة `tenant_id`/`user_id` في استعلامات Weaviate/Qdrant | تأكيد فلترة صارمة في `weaviate-retrieval.service.ts` و `enhancedRAG.service.ts` لكل استعلام، ومنع استعلام بدون مفتاح هوية |
| T-13 | Tampering | تسميم الفهرس (Index Poisoning) | عالية | `agent:persistent-memory:secrets:scan` + التحقق من المصدر | إضافة فحص محتوى قبل الفهرسة لمنع حقن أنماط ضارة في المخزن المتجهي |
| T-14 | Information Disclosure | تسرب مفاتيح API داخل embeddings الكود | حرجة | `agent:persistent-memory:secrets:scan` + `agent:persistent-memory:secrets:purge` + `gitleaks` | تشغيل دوري لـ `secrets:scan` على `.agent-code-memory/` و `WORKSPACE-EMBEDDING-INDEX.json` كجزء من CI |
| T-15 | DoS | إغراق Workers بطلبات تضمين | متوسطة | `BullMQ` + `resource-monitor.service.ts` | حدود طول مدخلات واضحة + backpressure |
| T-16 | Repudiation | تعديل صامت لذاكرة الجلسة | متوسطة | `persistent-memory:session:*` (start/append/compact/close/repair) | hash chain أو signed log لـ session events |

### 4.4 محرر الواجهة (apps/web Editor) و RAG المحلي

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-17 | Information Disclosure | إرسال شيفرة المستخدم لمزود سحابي بلا علم | عالية | متغيرات `editor-code-rag` + `temporary-independent` policy | علم ظاهر للمستخدم + خيار وضع محلي بحت |
| T-18 | Tampering | XSS في مكونات المحرر | عالية | CSP + sanitization + Next.js | فحص dynamic HTML insertion في المحرر، خاصة عند عرض مخرجات LLM |
| T-19 | Spoofing | تزوير مفاتيح المخزن المتجهي عبر المتصفح | حرجة | المفاتيح يجب أن تبقى خادمية فقط | تأكيد عدم تسريب `QDRANT_API_KEY` إلى bundles عبر فحص `apps/web/.next` بحثًا عن قيم env المحظورة |

### 4.5 ملفات المستخدم وخط OCR

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-20 | Tampering | رفع ملف خبيث يستغل المعالج | عالية | تحقق MIME + helpers في `editor/runtime` | sandboxing لخطوة الاستخراج ومنع تنفيذ ماكروهات في PDF/DOC |
| T-21 | DoS | ملفات ضخمة تستهلك الذاكرة/المعالج | متوسطة | حدود حجم في الواجهة | تأكيد الحد الخادمي صارم أيضًا (`express` body limits + multipart limits) |
| T-22 | Information Disclosure | إرسال PDF مستخدم لـ Mistral/Groq دون موافقة | عالية | متغيرات المزود اختيارية في `.env.example` | علم وموافقة صريحة + سياسة احتفاظ موثقة |

### 4.6 البنية التحتية والإمداد (Supply Chain / CI)

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-23 | Tampering | تبعية مصابة في `pnpm-lock.yaml` | عالية | `pnpm` (فقط)، `trivy` + `.trivyignore` | تشغيل audit دوري + توقيع الالتزام بـ commit signing |
| T-24 | Information Disclosure | كشف أسرار في git | حرجة | `gitleaks.toml`, `.gitsecrets`, `husky` pre-commit | تأكيد تفعيل خطاف `pre-commit` في كل بيئة CI، وتشغيل `gitleaks` كبوابة إلزامية في PR |
| T-25 | Elevation of Privilege | تجاوز الحارس الآلي للأدوات | حرجة | `.repo-agent/TOOL-GUARD-CONTRACT.json` + `agent:guard:*` | تحقّق دوري عبر `agent:guard:verify` ضمن CI لمنع المسار غير الرسمي |
| T-26 | Tampering | إضعاف فحص أو تخطّي خطاف | حرجة | قاعدة `AGENTS.md` + `CLAUDE.md` المنع الصريح + `.husky` | لوحة تتبع تغييرات ملفات الفحص في CI، ورفض PR التي تخفض العتبات |
| T-27 | Spoofing | استخدام `npm`/`yarn` بدلًا من `pnpm` | متوسطة | `.npmrc` + الحارس + `pnpm-workspace.yaml` | فحص بسيط في CI يمنع وجود `package-lock.json` أو `yarn.lock` |

### 4.7 السرية في الراحة والمراقبة

| المعرف | الفئة | التهديد | الخطورة | الضوابط الحالية | الفجوات |
|---|---|---|---|---|---|
| T-28 | Information Disclosure | كشف Bull-Board لطوابير المهام | عالية | `getAuthenticatedBullBoardRouter` خلف auth | تأكيد إلزام MFA لمسار البول-بورد في الإنتاج |
| T-29 | Information Disclosure | `/metrics` و `/health/detailed` تفيض ببيانات | متوسطة | `metricsEndpoint` + `health.controller.ts` | تقييد بحسب IP/شبكة داخلية للإنتاج، وإخفاء التفاصيل خارج العتبة الموثوقة |
| T-30 | Repudiation | اختفاء سجل أمني في Sentry | متوسطة | `sentry.middleware.ts` + `sentryErrorHandler` | تكوين retention مناسب + scrubbing مطابق للـ log-sanitization |

---

## 5. ملخص الضوابط القائمة (Inventory)

- **Helmet + CSP**: `csp.middleware.ts` ضمن `apps/backend/src/middleware`.
- **CORS allowlist**: من `env.CORS_ORIGIN` مع dev whitelist في `middleware/index.ts`.
- **CSRF**: `csrf.middleware.ts` + `server/csrf-origin-validator.ts`.
- **WAF**: مجموعة كاملة `waf.middleware.ts`, `waf-rules.ts`, `waf-state.ts`, `waf-helpers.ts`, `waf-management.ts`, `waf-types.ts` مع اختبارات.
- **Rate limit**: `express-rate-limit` + `perUserAiLimiter`.
- **Auth**: `auth.middleware.ts`, `zkAuth.controller.ts`, `mfa.service.ts`.
- **LLM Guardrails**: `llm-guardrails.service.ts` + detection + patterns + pii.
- **Log Sanitization**: `log-sanitization.middleware.ts` + `safe-logging.middleware.ts`.
- **Security Logger**: `security-logger.middleware.ts` + `SecurityEventType`.
- **Cost Tracking**: `gemini-cost-tracker.service.ts` (يحدّ التكلفة كحدّ علوي ضد إساءة الاستخدام).
- **Secret scanning**: `.gitleaks.toml`, `.gitsecrets`, `agent:persistent-memory:secrets:scan|verify|purge`.
- **Static & policy checks**: `.semgrep/`, `.eslint*`, `.stylelintrc.cjs`, `.markdownlint.json`, `.trivyignore`.
- **Tool Guard**: `.repo-agent/TOOL-GUARD-CONTRACT.json` + `pnpm agent:guard:*`.

---

## 6. الفجوات ذات الأولوية والإجراءات المقترحة

> هذه الفقرة مقترحات لا تنفّذ حتى يطلب المستخدم تنفيذًا. لا تعدّل أي ملف فحص قائم.

1. **T-01 / T-06**: إضافة اختبار تكامل في `apps/backend/src/__tests__` يفشل البناء عند:
   - قيمة `JWT_SECRET` تحوي أنماطًا افتراضية في `NODE_ENV=production`.
   - أي مسار جديد يُسجّل في `route-registrars` بدون `authMiddleware` على قائمة محظورة.
2. **T-04 / T-14 / T-24**: تشغيل `pnpm agent:persistent-memory:secrets:scan` و `gitleaks` كبوابة CI إلزامية، وتشغيل ضد `.agent-code-memory/` و `WORKSPACE-EMBEDDING-INDEX.json`.
3. **T-05**: إضافة `rate-limit-redis` لربط الحدود عبر النسخ كما تنصّ التعليقات داخل `middleware/index.ts`.
4. **T-11 / T-12**: اختبار سلبي يضمن أن `weaviate-retrieval.service.ts` و `enhancedRAG.service.ts` يرفضان أي استعلام بدون مفتاح هوية مالك المحتوى.
5. **T-19**: فحص `apps/web/.next` بعد البناء ضد قائمة قيم env المحظورة على المتصفح.
6. **T-25 / T-27**: تشغيل `pnpm agent:guard:verify` في CI ورفض PR التي تُدخل `package-lock.json` أو `yarn.lock`.
7. **T-28 / T-29**: تقييد `/metrics`, `bull-board`, `/health/detailed` بـ allowlist شبكي/MFA في الإنتاج.

---

## 7. الفرضيات والاستثناءات

- يفترض هذا النموذج أن الإعداد الافتراضي في `.env.example` لا يُنشر للإنتاج وأن `JWT_SECRET` و `CORS_ORIGIN` و مفاتيح المزودين تُحقن من خارج الكود.
- يفترض أن `pnpm` هو مدير الحزم الوحيد المعتمد وفق `output/session-state.md`.
- لا يتناول هذا النموذج التهديدات على البنية التحتية للسحابة المضيفة (Neon, مزود التخزين، CDN) بشكل مفصّل، ويُحال ذلك لنموذج تشغيل منفصل.
- لا يقترح هذا النموذج أي تخفيف لقواعد الفحص أو الاختبارات أو خطافات الأمن الحالية، وفق العقد الأعلى في `AGENTS.md`.

---

## 8. مصفوفة الخطورة المختصرة

| الخطورة | عدد البنود |
|---|---|
| حرجة | T-01, T-06, T-09, T-12, T-14, T-19, T-24, T-25, T-26 → **9** |
| عالية | T-02, T-04, T-07, T-08, T-10, T-11, T-13, T-17, T-18, T-20, T-22, T-23, T-28 → **13** |
| متوسطة | T-03, T-05, T-15, T-16, T-21, T-27, T-29, T-30 → **8** |
| منخفضة | — |

---

## 9. مراجع داخل المستودع

- `AGENTS.md`, `CLAUDE.md`, `.repo-agent/OPERATING-CONTRACT.md`, `.repo-agent/RAG-OPERATING-CONTRACT.md`, `.repo-agent/STARTUP-PROTOCOL.md`, `.repo-agent/HANDOFF-PROTOCOL.md`, `.repo-agent/TOOL-GUARD-CONTRACT.json`.
- `apps/backend/src/server/route-registrars.ts` و `apps/backend/src/server/route-registrars/*`.
- `apps/backend/src/middleware/*` (waf, csrf, csp, auth, rate-limit, log-sanitization, security-logger, sentry).
- `apps/backend/src/services/llm-guardrails.*`, `gemini-cost-tracker.service.ts`, `mfa.service.ts`, `auth.service.ts`.
- `apps/backend/src/controllers/zkAuth.controller.ts`, `encryptedDocs.controller.ts`.
- `apps/backend/src/memory/*` و `apps/backend/src/services/rag/*`.
- `apps/web/src/app/(main)/editor/src/rag/*`.
- `packages/security-middleware/*`, `packages/validation/*`, `packages/persistence/*`.
- `scripts/agent/lib/persistent-memory/*` و `scripts/generate-workspace-embeddings.js`.
- `.gitleaks.toml`, `.gitsecrets`, `.trivyignore`, `.semgrep/`, `.husky/`.

---

## 10. سجل المراجعة

| التاريخ | المؤلف | الوصف |
|---|---|---|
| 2026-05-03 | claude/create-threat-model-K8fXB | الإصدار الأول، نموذج STRIDE كامل بناءً على البنية الحالية للمستودع |
