# نموذج تهديدات الكود وفق منهجية OWASP Threat Modeling

> تطبيق إطار **OWASP Threat Modeling** (الأسئلة الأربعة + Threat Modeling Manifesto) مع ربط النتائج بمصفوفات OWASP المرجعية: **Top 10 (2021)**، **API Security Top 10 (2023)**، **LLM Top 10 (2025)**، **ASVS v4.0.3 / v5.0**، **Proactive Controls**، **Cheat Sheets**.

| البند | القيمة |
|---|---|
| تاريخ الإصدار | 2026-05-03 |
| الفرع | `claude/create-threat-model-K8fXB` |
| النطاق | مستودع `the-copy / yarab-we-elnby`: `apps/backend`, `apps/web`, `packages/*`, طبقة الذاكرة الدائمة، طبقة RAG، خط CI |
| المنهج | OWASP Threat Modeling — Four-Question Framework |
| طبيعة الوثيقة | إضافية فقط، لا تعدّل/تُضعف أي ملف فحص أو تحقق أو اختبار قائم |
| الوثائق الموازية | `docs/security/THREAT-MODEL.md` (STRIDE) و `docs/security/THREAT-MODEL-PASTA.md` (PASTA) |
| العقد الحاكم | `AGENTS.md` + `.repo-agent/OPERATING-CONTRACT.md` + `.repo-agent/RAG-OPERATING-CONTRACT.md` |

---

## 0. التزام بـ Threat Modeling Manifesto

| المبدأ | التطبيق هنا |
|---|---|
| Value over ceremony | نتائج مرتبطة بملفات حقيقية (controllers, middleware, services). |
| People over process | اقتراحات لأصحاب الكود: backend, RAG, editor, OCR, DX/CI. |
| Knowledge over compliance | ربط مزدوج: OWASP Top10 + API Top10 + LLM Top10 + ASVS. |
| Doing over talking | اقتراحات اختبارات سلبية إضافية، دون إضعاف الفحوصات القائمة. |
| Continuous refinement | سجل مراجعة في النهاية + مراجعة دورية مع `output/round-notes.md`. |
| Diverse perspectives | تغطية الويب، الـ API، الـ LLM، الـ RAG، الـ OCR، سلسلة الإمداد، الذاكرة الدائمة. |

---

## السؤال 1 — على ماذا نعمل؟ (What are we working on?)

### 1.1 وصف المنظومة

منصة عربية متكاملة لتأليف وإخراج درامي تعتمد ذكاءً اصطناعيًا متعدد المزودين، مع طبقة ذاكرة دائمة للوكلاء وفهرسة كود حية. مكوّناتها:

- **`apps/web`** (Next.js — port 5000): واجهة المستخدم + المحرر + RAG محلي خفيف.
- **`apps/backend`** (Express + Node — port 3001): API، Workers (BullMQ)، طبقة الذاكرة، RAG، runtime المحرر، OCR.
- **حزم مشتركة**: `@the-copy/{ai-orchestration,api-client,breakapp,copyproj-schema,core-memory,error-boundary,export,persistence,prompt-engineering,security-middleware,validation,tsconfig}`.
- **مخازن**: PostgreSQL (Neon)، Redis + Sentinel، Weaviate، Qdrant، LanceDB محلي.
- **مزوّدو AI**: Gemini (رئيسي)، OpenRouter، Anthropic، OpenAI، DeepSeek، Mistral، Groq، Moonshot.
- **حوكمة**: عقد الوكلاء (`AGENTS.md`/`.repo-agent/*`)، حالة تشغيلية في `output/session-state.md`، أدوات أمن CI (`gitleaks`, `trivy`, `semgrep`, `husky`).

### 1.2 مخطط البنية وحدود الثقة (مكافئ Level-1 DFD)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ⓘ المتصفح (Untrusted)                                                     │
└─────────────┬────────────────────────────────────────────────────────────┘
              │  (TB-1) HTTPS / TLS
┌─────────────▼────────────────────────────────────────────────────────────┐
│ apps/web · Next.js · 5000                                                 │
│  Hero, Editor, RAG محلي (Qdrant codebase-index)                            │
└─────────────┬────────────────────────────────────────────────────────────┘
              │  (TB-2) XHR + CSRF + CORS allowlist
┌─────────────▼────────────────────────────────────────────────────────────┐
│ apps/backend · Express · 3001                                             │
│ helmet · CSP · CORS · CSRF · WAF · rate-limit · auth · log-sanitization    │
│ controllers · services · queues · memory · editor/runtime · ocr-pipeline   │
└──┬────────────┬──────────────┬────────────────┬────────────────────┬─────┘
   │TB-3        │TB-4          │TB-5            │TB-6                │TB-7
   ▼            ▼              ▼                ▼                    ▼
┌───────┐  ┌────────┐  ┌────────────────┐  ┌──────────────┐  ┌────────────┐
│Postgres│  │Redis + │  │Weaviate /Qdrant│  │External LLMs │  │Editor      │
│ Neon   │  │BullMQ  │  │/LanceDB        │  │Gemini, …     │  │Runtime     │
└───────┘  └────────┘  └────────────────┘  └──────────────┘  └────────────┘
```

### 1.3 الأصول والمالكون

| الأصل | المالك | الحساسية | الموقع |
|---|---|---|---|
| المشاريع الإبداعية (مشاهد، شخصيات، لقطات، عصف) | المستخدم | عالية | Postgres + Weaviate |
| PII المستخدم | المستخدم | عالية | `auth.service.ts`, `mfa.service.ts`, `zkAuth.controller.ts` |
| الذاكرة الدائمة للوكلاء | المنصة | عالية | Postgres + Weaviate primary + Qdrant shadow + Redis |
| embeddings الكود | المنصة | متوسطة | `.agent-code-memory/`, `WORKSPACE-EMBEDDING-INDEX.json` |
| المستندات المشفّرة | المستخدم | عالية | `encryptedDocs.controller.ts` |
| `JWT_SECRET` | المنصة | حرجة | `env` |
| مفاتيح مزودي AI | المنصة | حرجة | `env` |
| اعتمادات DB/Redis/Vector | المنصة | حرجة | `env` |
| سجلات وقياسات | المنصة | متوسطة-عالية | `logger`, `Sentry`, `/metrics`, `bull-board` |
| ملفات OCR المرفوعة | المستخدم | متوسطة | `ocr-arabic-pdf-to-txt-pipeline` |
| سياسات الفحص والحوكمة | المنصة | حرجة | `AGENTS.md`, `.repo-agent/*`, `.husky/`, `.gitleaks.toml`, `.trivyignore` |

### 1.4 الممثّلون والامتيازات

| الممثل | المسارات الافتراضية |
|---|---|
| ضيف | `/api/health`, `/health/*` |
| مستخدم مصادَق | controllers الإبداعية، RAG، editor runtime |
| مدير | `/api/queue/*`, `/api/waf/*`, `bull-board`, متغيرات WAF |
| داخلي/CI | أوامر `pnpm agent:*`, scripts |
| مزوّد LLM خارجي | يُستهلك عبر `services/{gemini,actorai,cineai,...}.service.ts` |

### 1.5 نقاط الدخول

- HTTP route registrars (`server/route-registrars.ts` + `route-registrars/*`).
- WebSocket/SSE (`websocket.service.ts`, `sse.service.ts`, `realtime.controller.ts`).
- Editor runtime (`registerEditorRuntimeRoutes`).
- Queue consumers (`apps/backend/src/queues`).
- CLI (`pnpm agent:*` كما في `output/session-state.md`).

---

## السؤال 2 — ما الذي يمكن أن يخطئ؟ (What can go wrong?)

> سنستخدم STRIDE كمخزون فئات، ثم نربط كل تهديد بمصفوفات OWASP المعتمدة.

### 2.1 جدول التهديدات (T-XX)

| المعرّف | التهديد | الموقع | STRIDE | OWASP Top10 (2021) | API Top10 (2023) | LLM Top10 (2025) | ASVS |
|---|---|---|---|---|---|---|---|
| O-01 | تجاوز التحكم في الوصول الكائني (BOLA): قراءة/تعديل مشروع مستخدم آخر عبر تخمين معرّف | `controllers/{projects,scenes,characters,shots,brainstorm-sessions}.controller.ts` | E | A01 | API1 | — | V4.1 |
| O-02 | تجاوز التحكم على مستوى الوظيفة (BFLA): مسار إداري بدون auth | `server/route-registrars.ts` (أي route جديد) | E | A01 | API5 | — | V4.2 |
| O-03 | كسر المصادقة: `JWT_SECRET` ضعيف/افتراضي | `config/env`, `auth.middleware.ts` | S | A07, A02 | API2 | — | V2.10, V6 |
| O-04 | إعادة استخدام nonce في zkLogin | `zkAuth.controller.ts` | S | A07 | API2 | — | V2.5 |
| O-05 | تجاوز CSRF على route state-changing لا يستدعي `csrfProtection` | `server/route-registrars.ts` | T | A05 | API8 | — | V4.2.2 |
| O-06 | XSS عبر عرض إخراج LLM في المحرر | `apps/web/.../editor` | T | A03 | — | LLM05 | V5.3 |
| O-07 | حقن أوامر/SQL في طبقات تحقّق ضعيفة | `services/*`, `db/*` | T | A03 | API10 | — | V5 |
| O-08 | حقن Prompt مباشر/غير مباشر عبر مستندات RAG | `services/rag/*`, `weaviate-retrieval.service.ts` | T,I | A03 | — | LLM01 | — |
| O-09 | كشف معلومات حساسة عبر استجابات LLM (PII، أسرار) | `services/{gemini,llm-guardrails}.service.ts` | I | A02 | — | LLM02 | V8 |
| O-10 | تخريب البيانات والنماذج (Data/Model Poisoning) عبر ingest خبيث | `persistent-memory:ingest`, `memory/*` | T | A08 | — | LLM04 | V14 |
| O-11 | تسرّب system prompt | `prompt-engineering`, `services/agents/*` | I | A04 | — | LLM07 | — |
| O-12 | ضعف فهرس متجهي وتسرّب بين المستأجرين (Vector & Embedding Weaknesses) | `weaviate-retrieval.service.ts`, `apps/web/.../editor/src/rag/query.ts` | I | A01 | API1, API3 | LLM08 | V4 |
| O-13 | معلومات مضلِّلة من النموذج (Misinformation) في المخرجات الموجَّهة للمستخدم | `services/{actorai,cineai,critique,styleist}.service.ts` | T | A04 | — | LLM09 | — |
| O-14 | استهلاك غير محدود (Unbounded Consumption) — تكلفة AI/طوابير | `/api/ai/*`, `BullMQ`, `gemini-cost-tracker.service.ts` | D | A04 | API4 | LLM10 | V11.1 |
| O-15 | Excessive Agency: أدوات الوكلاء تنفّذ آثارًا جانبية واسعة | `packages/ai-orchestration`, `services/agents/*` | E,T | A04 | — | LLM06 | V1, V14 |
| O-16 | تكوين أمني خاطئ: helmet/CSP/CORS/Origin null/CSRF cookie | `middleware/index.ts`, `csp.middleware.ts`, `csrf-origin-validator.ts` | T,I | A05 | API8 | — | V14.4 |
| O-17 | تبعيات مصابة أو قديمة | `pnpm-lock.yaml`, `package.json`, `.trivyignore` | T,E | A06 | API10 | LLM03 | V14.2 |
| O-18 | فشل تكامل البرمجيات والبيانات: تجاوز خطافات husky/التوقيع | `.husky/`, خطّاف pre-commit | T | A08 | — | — | V14.1 |
| O-19 | سجل/مراقبة غير كافية لمسارات إدارية حساسة | `security-logger.middleware.ts` | R | A09 | API9 | — | V7 |
| O-20 | SSRF عبر إدخال URL في خط OCR/التصدير | `editor/runtime`, `ocr-arabic-pdf-to-txt-pipeline`, `export` | T,I | A10 | API7 | — | V12 |
| O-21 | تسريب أسرار إلى السجلات أو embeddings الكود | `log-sanitization.middleware.ts`, `WORKSPACE-EMBEDDING-INDEX.json` | I | A02, A09 | — | LLM02 | V7 |
| O-22 | Race conditions في ingest/compact للذاكرة الدائمة | `persistent-memory:session:*` | T | A04 | — | — | V11 |
| O-23 | كشف Bull-Board و `/metrics` و `/health/detailed` | `bull-board.middleware.ts`, `metrics.middleware.ts`, `health.controller.ts` | I | A05 | API9 | — | V14.4 |
| O-24 | ضعف عزل أصول `apps/web`: تسرب env إلى bundle المتصفح | بناء Next.js | I | A05 | — | LLM02 | V14 |
| O-25 | تجاوز الحارس الآلي للأدوات (`npm`/`yarn` بدلًا من `pnpm`) | `.repo-agent/TOOL-GUARD-CONTRACT.json` | E,T | A06 | — | LLM03 | V14.1 |
| O-26 | معالجة إخراج غير سليمة لمستندات HTML/Markdown مولّدة | `apps/web/.../editor` | T | A03 | — | LLM05 | V5.3 |

### 2.2 ربط بـ OWASP Top 10 (2021) — تغطية الفئات

| OWASP | التهديدات المرتبطة |
|---|---|
| A01 Broken Access Control | O-01, O-02, O-12 |
| A02 Cryptographic Failures | O-03, O-09, O-21 |
| A03 Injection | O-06, O-07, O-08, O-26 |
| A04 Insecure Design | O-11, O-13, O-14, O-15, O-22 |
| A05 Security Misconfiguration | O-05, O-16, O-23, O-24 |
| A06 Vulnerable & Outdated Components | O-17, O-25 |
| A07 Identification & Authentication Failures | O-03, O-04 |
| A08 Software & Data Integrity Failures | O-10, O-18 |
| A09 Security Logging & Monitoring Failures | O-19, O-21, O-23 |
| A10 SSRF | O-20 |

### 2.3 ربط بـ OWASP API Security Top 10 (2023)

| API | التهديدات |
|---|---|
| API1 BOLA | O-01, O-12 |
| API2 Broken Authentication | O-03, O-04 |
| API3 BOPLA | O-12 |
| API4 Unrestricted Resource Consumption | O-14 |
| API5 BFLA | O-02 |
| API6 Unrestricted Business Flows | O-14 |
| API7 SSRF | O-20 |
| API8 Security Misconfiguration | O-05, O-16 |
| API9 Improper Inventory Management | O-19, O-23 |
| API10 Unsafe Consumption of APIs | O-07, O-17 |

### 2.4 ربط بـ OWASP Top 10 for LLM Applications (2025)

| LLM | التهديدات |
|---|---|
| LLM01 Prompt Injection | O-08 |
| LLM02 Sensitive Information Disclosure | O-09, O-21, O-24 |
| LLM03 Supply Chain | O-17, O-25 |
| LLM04 Data and Model Poisoning | O-10 |
| LLM05 Improper Output Handling | O-06, O-26 |
| LLM06 Excessive Agency | O-15 |
| LLM07 System Prompt Leakage | O-11 |
| LLM08 Vector and Embedding Weaknesses | O-12 |
| LLM09 Misinformation | O-13 |
| LLM10 Unbounded Consumption | O-14 |

### 2.5 تقييم المخاطر — DREAD مبسَّط

سلم 1-5 لكل بُعد، النتيجة = المعدّل لأقرب 0.5.

| المعرّف | Damage | Reproducibility | Exploitability | Affected Users | Discoverability | المعدّل | الأولوية |
|---|---|---|---|---|---|---|---|
| O-01 | 5 | 4 | 4 | 4 | 4 | 4.2 | حرجة |
| O-02 | 5 | 5 | 4 | 4 | 4 | 4.4 | حرجة |
| O-03 | 5 | 4 | 4 | 5 | 3 | 4.2 | حرجة |
| O-04 | 4 | 3 | 3 | 4 | 3 | 3.4 | عالية |
| O-05 | 4 | 4 | 4 | 4 | 4 | 4.0 | عالية |
| O-06 | 4 | 4 | 4 | 4 | 3 | 3.8 | عالية |
| O-07 | 5 | 3 | 3 | 4 | 3 | 3.6 | عالية |
| O-08 | 5 | 4 | 4 | 4 | 4 | 4.2 | حرجة |
| O-09 | 5 | 3 | 3 | 5 | 3 | 3.8 | عالية |
| O-10 | 5 | 3 | 3 | 5 | 3 | 3.8 | عالية |
| O-11 | 3 | 4 | 3 | 4 | 3 | 3.4 | متوسطة |
| O-12 | 5 | 4 | 4 | 5 | 4 | 4.4 | حرجة |
| O-13 | 3 | 4 | 4 | 4 | 4 | 3.8 | عالية |
| O-14 | 4 | 5 | 4 | 4 | 5 | 4.4 | حرجة |
| O-15 | 4 | 3 | 3 | 4 | 3 | 3.4 | عالية |
| O-16 | 4 | 4 | 4 | 4 | 4 | 4.0 | عالية |
| O-17 | 5 | 3 | 3 | 5 | 4 | 4.0 | عالية |
| O-18 | 5 | 2 | 3 | 5 | 3 | 3.6 | عالية |
| O-19 | 3 | 3 | 3 | 3 | 3 | 3.0 | متوسطة |
| O-20 | 5 | 3 | 3 | 4 | 3 | 3.6 | عالية |
| O-21 | 5 | 3 | 3 | 5 | 3 | 3.8 | عالية |
| O-22 | 3 | 3 | 3 | 3 | 3 | 3.0 | متوسطة |
| O-23 | 4 | 4 | 4 | 3 | 5 | 4.0 | عالية |
| O-24 | 5 | 4 | 4 | 5 | 4 | 4.4 | حرجة |
| O-25 | 5 | 3 | 3 | 5 | 3 | 3.8 | عالية |
| O-26 | 4 | 4 | 4 | 4 | 3 | 3.8 | عالية |

> **الحرجة (≥ 4.2)**: O-01, O-02, O-03, O-08, O-12, O-14, O-24.

---

## السؤال 3 — ماذا سنفعل حياله؟ (What are we going to do about it?)

> هذه مقترحات معالجة. أيّ ملف فحص قائم لا يُعدَّل أو يُضعف. الإجراءات إما اختبارات إضافية، أو ضوابط جديدة، أو تشديد عتبات.

### 3.1 ربط الضوابط بمصفوفة **OWASP Proactive Controls (PC)**

| Proactive Control | المقترح للتنفيذ | التهديدات المغطّاة |
|---|---|---|
| PC1 Define Security Requirements | تأكيد متطلبات `JWT_SECRET`، عزل المستأجر، rate-limits لكل endpoint AI | O-03, O-12, O-14 |
| PC2 Leverage Frameworks/Libraries | الاعتماد على `helmet`, `cors`, `csurf` بديل، `express-rate-limit`, Drizzle parametrized | O-05, O-07, O-16 |
| PC3 Secure Database Access | استخدام Drizzle prepared statements + minimal grants على Neon | O-07 |
| PC4 Encode and Escape Data | sanitizer إلزامي على إخراج LLM في المحرر | O-06, O-26 |
| PC5 Validate All Inputs | توسيع مخططات `validation.middleware.ts` لكل route وكل rich input | O-07, O-20 |
| PC6 Implement Digital Identity | تشديد zkLogin/MFA: nonce single-use، lockout بعد فشل، MFA إلزامي للأدمن | O-03, O-04 |
| PC7 Enforce Access Controls | matrix test للـ routes ومخططات منع تجاوز BFLA/BOLA | O-01, O-02, O-12 |
| PC8 Protect Data Everywhere | تشفير الراحة لـ recovery artifact + سرية الذاكرة الدائمة | O-09, O-10, O-21 |
| PC9 Implement Security Logging | إثراء `security-logger.middleware.ts` بأحداث Queue/WAF/Memory + تنبيهات SIEM | O-19, O-23 |
| PC10 Handle All Errors and Exceptions | تأكيد عدم تسرّب stack traces خارج الإنتاج | O-09, O-19 |

### 3.2 إجراءات معالجة محدّدة لكل تهديد

| المعرف | الإجراء المقترح (إضافي وغير مُضعِف) |
|---|---|
| O-01 | اختبار access-control matrix على كل controller إبداعي يضمن `req.user.id == resource.ownerId` قبل أي قراءة/تعديل. |
| O-02 | sweep test يقرأ ملف `route-registrars.ts` ويُلزم وجود `authMiddleware` (و `csrfProtection`) لكل non-public verb. |
| O-03 | اختبار bootstrap يفشل في `NODE_ENV=production` عند: قيمة افتراضية، طول < 32، أو احتواء `dev-secret`/`CHANGE-THIS`. |
| O-04 | اختبار سلبي يكرّر nonce ضمن نافذة الصلاحية ويتأكد من رفضه؛ تخزين nonce-set مع TTL في Redis. |
| O-05 | matrix test يضمن أن كل verb non-GET على route خلف auth يستدعي `csrfProtection`، مع استثناء صريح ومستند للـ webhooks الموقَّعة. |
| O-06 | sanitizer مركزي لإخراج LLM (allowlist HTML)، اختبار يحقن `<img onerror>` في رد وهمي ويتأكد من عدم التنفيذ. |
| O-07 | تأكيد Drizzle parametrization، مخطط Zod لكل DTO من المستخدم، `eslint-plugin-security` ضمن `.eslint*` (تشديد لا تخفيف). |
| O-08 | تطبيق `llm-guardrails.detection.ts` على **مدخلات السياق المسترجَع** قبل التركيب، وليس على prompt المباشر فقط؛ golden tests بـ payloads معروفة. |
| O-09 | مرور كل output LLM عبر `llm-guardrails.pii.ts` قبل إرساله للعميل، وإيقاف عند تطابق نمط حرج. |
| O-10 | content scanner قبل ingest في الذاكرة الدائمة يكشف أنماط حقن/PII/أسرار ويحجب الإدخال. |
| O-11 | منع تضمين system prompts كمحتوى context قابل للاسترجاع، ووضع قاعدة في `prompt-engineering` تمنع echo للنظام. |
| O-12 | فلترة هوية صارمة (`tenant_id`/`user_id`) في كل استعلام Weaviate/Qdrant + اختبار يرفض الاستعلام بدون مفتاح هوية. |
| O-13 | إضافة "تنبيه احتمالية الخطأ" لكل مخرجات LLM موجَّهة لقرار صناعي، وتسجيل provenance. |
| O-14 | rate-limit موزّع على Redis (وفق التعليق في `middleware/index.ts`)، حدود لكل token/مستخدم/مشروع، وتفعيل WAF rule لكسر الحلقات. |
| O-15 | تقييد أدوات الوكلاء بـ allowlist + تأكيد بشري للأفعال ذات الأثر الجانبي. |
| O-16 | اختبار حالات `Origin: null`، فارغ، خفي؛ مراجعة `buildEffectiveWhitelist` لمنع `*` في الإنتاج. |
| O-17 | بوابة CI: `pnpm audit --prod`، `trivy fs`، رفض زيادة استثناءات `.trivyignore`. |
| O-18 | تشغيل `pnpm agent:guard:verify` ضمن CI كبوابة، ومنع `--no-verify` في PR. |
| O-19 | سجلات تدقيق مهيكَلة لـ WAF/Queue/Memory admin مع correlation IDs و Sentry breadcrumbs. |
| O-20 | allowlist صارم للنطاقات المسموح للخادم جلبها، رفض IP خاص/metadata، DNS rebinding protection. |
| O-21 | إضافة أنماط أسرار جديدة لـ `log-sanitization.middleware.ts` و `gitleaks.toml`، وتشغيل `agent:persistent-memory:secrets:scan` على فهارس embeddings كبوابة CI. |
| O-22 | اختبارات تنافس على `session:append`/`compact`، lock في Redis لكل session id. |
| O-23 | تقييد `bull-board`, `/metrics`, `/health/detailed` بـ allowlist شبكي + MFA إنتاجي. |
| O-24 | فحص بعد البناء أن `apps/web/.next` لا يحتوي قيم env المحظورة (مفاتيح API، QDRANT_API_KEY، …). |
| O-25 | فحص CI يرفض وجود `package-lock.json`/`yarn.lock` ويُلزم `pnpm` فقط. |
| O-26 | اختبار يحقن HTML/markdown ضارّ في عرض المخرجات ويتحقق من sanitization متّسقة. |

### 3.3 ربط بـ **OWASP ASVS** كمعيار قبول

> هدفنا توافق الأنظمة الحساسة مع **L2** كحد أدنى، و**L3** للمسارات التي تمس الذاكرة الدائمة وأدوات الوكلاء.

| فصل ASVS | البنود ذات الصلة | التهديدات المغطّاة |
|---|---|---|
| V1 Architecture | 1.1, 1.2, 1.4, 1.14 | O-15 |
| V2 Authentication | 2.1, 2.5, 2.10 | O-03, O-04 |
| V3 Session Management | 3.2, 3.3 | O-03, O-04 |
| V4 Access Control | 4.1, 4.2, 4.3 | O-01, O-02, O-12 |
| V5 Validation/Sanitization/Encoding | 5.1, 5.2, 5.3 | O-06, O-07, O-26 |
| V7 Logging | 7.1, 7.2 | O-19, O-21 |
| V8 Data Protection | 8.1, 8.2 | O-09, O-21 |
| V11 BL/Race | 11.1, 11.5 | O-14, O-22 |
| V12 Files/Resources | 12.4, 12.6 | O-20 |
| V14 Configuration | 14.1, 14.2, 14.4, 14.5 | O-16, O-17, O-18, O-23, O-24, O-25 |

---

## السؤال 4 — هل أحسنّا أداءنا؟ (Did we do a good enough job?)

### 4.1 معايير القبول للتحقق

- **Coverage**: تغطية كل route في `route-registrars` بـ unit + integration + sweep auth/csrf.
- **Negative tests**: golden cases للحقن (Prompt + XSS + SSRF + nonce reuse + JWT_SECRET افتراضي + Origin: null).
- **Static**: ESLint + semgrep + stylelint + markdownlint بدون تخفيف.
- **Secrets**: `gitleaks` + `agent:persistent-memory:secrets:scan` بوابة CI، صفر تسرب على فهارس embeddings.
- **Deps**: `pnpm audit` + `trivy fs` بدون زيادة استثناءات.
- **Runtime**: WAF blocks > 0/يوم في الإنتاج، rate-limit hits مرصودة، Sentry بدون أنماط حساسة.
- **Governance**: `pnpm agent:guard:verify` ضمن CI، رفض `package-lock.json`/`yarn.lock`، خطافات `husky` غير قابلة للتجاوز.

### 4.2 مقاييس النجاح (KPIs)

| المؤشر | الهدف |
|---|---|
| % مسارات state-changing وراء CSRF + Auth | 100% |
| % استعلامات RAG بفلتر هوية | 100% |
| متوسط زمن الكشف عن سرّ مسرّب في CI | ≤ 1 دقيقة |
| تكلفة Gemini غير المتوقَّعة لكل مستخدم/يوم | ≤ سقف معرَّف |
| عدد PR التي تُخفّض عتبات الفحص | 0 |
| تغطية الاختبارات لـ middleware الأمني | لا تنخفض عن المستوى الحالي |

### 4.3 خطة التحقق المستمر

- مراجعة دورية لـ `output/round-notes.md` و `output/session-state.md` للكشف عن drift.
- تشغيل دوري لـ `pnpm agent:persistent-memory:secrets:verify` و `pnpm agent:memory:verify`.
- إعادة تقييم النموذج بعد كل تغيير في `route-registrars` أو `services/rag/*` أو `prompt-engineering` أو إضافة مزود AI.
- مزامنة هذا المستند مع `docs/security/THREAT-MODEL.md` و `docs/security/THREAT-MODEL-PASTA.md` عند أي تغيير في الأصول أو الحدود.

---

## ملحق A — أوراق غش OWASP المرجعية

- Authentication Cheat Sheet → O-03, O-04.
- Authorization Cheat Sheet → O-01, O-02, O-12.
- Cross-Site Request Forgery Prevention Cheat Sheet → O-05, O-16.
- Cross Site Scripting Prevention + Output Encoding → O-06, O-26.
- HTTP Security Headers / Helmet → O-16.
- Input Validation Cheat Sheet → O-07, O-20.
- Secure Coding for AI / LLM01-10 → O-08..O-15.
- Secrets Management Cheat Sheet → O-21, O-24.
- SSRF Prevention Cheat Sheet → O-20.
- Logging Cheat Sheet → O-19, O-21, O-23.
- REST Security / API Security Cheat Sheet → O-01..O-05, O-23.
- Vulnerable Dependency Management → O-17, O-25.

---

## ملحق B — مراجع داخل المستودع

- `apps/backend/src/server/route-registrars.ts` و `apps/backend/src/server/route-registrars/*`.
- `apps/backend/src/middleware/*` (waf, csrf, csp, auth, rate-limit, log-sanitization, security-logger, sentry, validation).
- `apps/backend/src/services/llm-guardrails.{service,detection,patterns,pii}.ts`.
- `apps/backend/src/services/{gemini,gemini-cost-tracker,actorai,cineai,critique,styleist,ai}.{service,controller}.ts`.
- `apps/backend/src/services/rag/*`, `apps/backend/src/memory/*`.
- `apps/backend/src/controllers/{auth,zkAuth,projects,scenes,characters,shots,brainstorm-sessions,breakdown,encryptedDocs,health,metrics,queue,workflow}.controller.ts`.
- `apps/backend/src/queues`, `apps/backend/src/editor/runtime`, `apps/backend/src/ocr-arabic-pdf-to-txt-pipeline`.
- `apps/web/src/app/(main)/editor/src/rag/{config,query}.ts`, `apps/web/src/lib/ai/rag/*`, `apps/web/src/lib/drama-analyst/*`.
- `packages/security-middleware/*`, `packages/validation/*`, `packages/persistence/*`, `packages/core-memory/*`.
- `scripts/agent/lib/persistent-memory/*` و `scripts/generate-workspace-embeddings.js`.
- `.gitleaks.toml`, `.gitsecrets`, `.trivyignore`, `.semgrep/`, `.husky/`, `.repo-agent/TOOL-GUARD-CONTRACT.json`.

---

## سجل المراجعة

| التاريخ | المؤلف | الوصف |
|---|---|---|
| 2026-05-03 | claude/create-threat-model-K8fXB | الإصدار الأول لنموذج OWASP Threat Modeling مع الربط الكامل بـ Top10/API/LLM/ASVS/Proactive Controls/Cheat Sheets |
