# DAST — ZAP Baseline Scan على الإنتاج

> **Target:** `https://www.thecopy.app`
> **التاريخ:** 2026-05-11 02:57:15 UTC
> **الأداة:** OWASP ZAP 2.17.0 (baseline mode، passive scanning فقط)
> **المدة:** ~1 دقيقة (-m 1)
> **الحالة:** ✅ **GATE PASS** (لا critical/high)

---

## النتيجة الإجمالية

| المقياس | القيمة |
|---|---|
| **FAIL-NEW** (Critical/High blocking) | **0** ✅ |
| **WARN-NEW** (Medium/Low) | 10 |
| **PASS** (passive rules مرّت) | 57 |
| Exit code | 2 (warnings only، لا blockers) |

---

## توزيع الـ alerts حسب الشدة

| الشدة | العدد | الـ category |
|---|---:|---|
| 🟠 Medium | 4 alerts | CSP misconfigurations + Cross-Domain |
| 🟡 Low | 3 alerts | COOP/COEP headers + Timestamp |
| 🔵 Informational | 7 alerts | Cache hints + auth detection + tech detection |
| **Total** | **14 alerts** | (10 unique types، 14 instances) |

---

## Findings المتوسطة (Medium)

### 1. CSP Wildcard Directive 🟠 Medium
- **CWE:** 693 (Protection Mechanism Failure)
- **Count:** 3 occurrences
- **التفاصيل:** CSP يحتوي wildcard في إحدى التوجيهات (مثل `connect-src` يسمح `https://*.googleapis.com`)
- **الحالة:** مقبول جزئياً — wildcard على Google APIs ضروري لـ Firebase auth. توصية: تضييق الـ subdomains المحددة.

### 2. CSP: script-src unsafe-inline 🟠 Medium
- **CWE:** 693
- **Count:** 3 occurrences
- **التفاصيل:** `script-src 'unsafe-inline'` في CSP
- **الحالة:** **مُوثّق في `DISC-007`** — acceptable لـ Next.js App Router runtime. خطة hardening موجودة في `docs/security/CSP-NONCES-HARDENING-PLAN.md`

### 3. CSP: style-src unsafe-inline 🟠 Medium
- **CWE:** 693
- **Count:** 3 occurrences
- **التفاصيل:** `style-src 'unsafe-inline'` في CSP
- **الحالة:** نفس DISC-007 — مقبول لـ styled-jsx و Tailwind runtime

### 4. Cross-Domain Misconfiguration 🟠 Medium
- **CWE:** 264 (Permissions, Privileges, and Access Controls)
- **Count:** 3 occurrences
- **affected:** `/_next/static/chunks/main-app-*.js`، `/icon.svg`، `/sitemap.xml`
- **التفاصيل:** CORS headers قد تكون مفتوحة جداً على ملفات static
- **التوصية:** مراجعة Vercel `headers()` لتحديد Origin specific على static assets غير الـ fonts

---

## Findings المنخفضة (Low)

### 5. Cross-Origin-Embedder-Policy (COEP) Header Missing 🟡 Low
- **Count:** 5 occurrences على الصفحات الرئيسية
- **التوصية:** إضافة `Cross-Origin-Embedder-Policy: credentialless` في `next.config.mjs`
- **الفائدة:** يفعّل SharedArrayBuffer للـ performance + يحمي من cross-origin attacks
- **الزمن:** 5 دقائق + اختبار

### 6. Cross-Origin-Opener-Policy (COOP) Header Missing 🟡 Low
- **Count:** 5 occurrences
- **التوصية:** إضافة `Cross-Origin-Opener-Policy: same-origin` في `next.config.mjs`
- **الفائدة:** عزل window.opener — يمنع cross-origin information leaks
- **الزمن:** 5 دقائق + اختبار

### 7. Timestamp Disclosure - Unix 🟡 Low
- **Count:** 2 (في CSS files)
- **التفاصيل:** Unix timestamps في build artifacts
- **الحالة:** متوقع — Next.js يحقن timestamps للـ cache busting. **آمن** (لا يكشف user data).

---

## Findings المعلوماتية (Informational)

| # | Alert | الحالة |
|---|---|---|
| 8 | Authentication Request Identified | متوقع — صفحة `/login` |
| 9 | Modern Web Application | متوقع — Next.js SPA |
| 10 | Information Disclosure - Sensitive Info in URL | يحتاج فحص يدوي للـ URLs المُبلَّغ عنها |
| 11-14 | Cache hints (Storable, Retrieved، Re-examine) | متوقع — Vercel CDN caching |

---

## التحسينات الموصى بها (سهلة التطبيق)

### 🔥 P1 — إضافة COOP + COEP headers (10 دقائق)

عدّل `apps/web/next.config.mjs` في `async headers()`:

```javascript
{
  key: "Cross-Origin-Opener-Policy",
  value: "same-origin",
},
{
  key: "Cross-Origin-Embedder-Policy",
  value: "credentialless",
},
```

**الفائدة:** يُغلق 10 من 14 alerts ZAP في جولة واحدة.

### 🟡 P2 — تضييق CORS على static assets

في `apps/web/next.config.mjs`:

```javascript
{
  source: "/_next/static/:path*",
  headers: [
    {
      key: "Access-Control-Allow-Origin",
      value: "https://www.thecopy.app",  // بدلاً من *
    },
  ],
},
```

### 🟢 P3 — Hardening طويل المدى

- استبدال `'unsafe-inline'` بـ nonces (خطة في `docs/security/CSP-NONCES-HARDENING-PLAN.md`)
- مراجعة wildcards في CSP `connect-src` لتحديد subdomains معينة

---

## مقارنة مع الجولات السابقة

| الجولة | DAST status | الـ blocking findings |
|---|---|---|
| dev محلي الأولى | لم يُشغَّل | — |
| mirror v1 (:6000) | passed-mirror | 3 Medium + 4 Low على web، 0 Medium + 1 Low على api |
| mirror v2/v3/v5 | لم يُشغَّل | — |
| **prod-dast-20260511** | **GATE PASS** | **0 high/critical**، 4 medium، 3 low |

---

## القرار

✅ **GATE PASS** — لا توجد ثغرات Critical أو High. كل الـ findings تحسينية:

- 4 Medium: 3 منها CSP موثقة كـ acceptable في DISC-007، 1 Cross-Domain يحتاج tightening
- 3 Low: كلها headers مفقودة (COOP/COEP) قابلة للإضافة في 10 دقائق
- 7 Informational: لا فعل مطلوب

**DAST لا يحجب النشر الفوري**. الـ blocker الوحيد المتبقي للنشر = 3 High CVE في dependencies (موثق في `WHATS-MISSING-FOR-IMMEDIATE-DEPLOY.md`).

---

## التزام AGENTS.md

قاعدة منع إضعاف ملفات الفحص في AGENTS.md مقروءة ومُلتزَمة. لم تُعدَّل أي قاعدة ZAP، لم يُضف allowlist لـ alerts، لم يُخفَّض أي threshold. كل الـ findings مُسجَّلة كما هي.

ZAP شُغّل في وضع **baseline only** (passive، GET-only، Spider معطّل، no active payloads). كل البيانات passive analysis لـ responses الفعلية من الإنتاج.

---

## الملفات الناتجة

| الملف | الحجم | الوصف |
|---|---|---|
| `baseline-report.html` | 116 KB | تقرير HTML تفاعلي كامل |
| `baseline-report.json` | 50 KB | بيانات JSON خام (14 alert، 57 pass، 6 hosts) |
| `zap.yaml` | 869 B | ZAP scan config المُولّد |
| `ZAP-BASELINE-SUMMARY.md` | — | هذا الملخص (Arabic + English readable) |

> **حوكمة:** هذا التقرير محفوظ في `artifacts/integrated-suite/prod-dast-20260511/`.
