# Charter — طبقة الذاكرة الدائمة و RAG

> **استكشف الذاكرة الدائمة (Postgres + Qdrant + Weaviate + Redis) و RAG retrieval للتحقق من أن البيانات تُحفَظ، تُسترجَع، تُعزَل بين المستخدمين، ولا تتسرّب أسرار.**

## النطاق

- `pnpm agent:persistent-memory:*` (CLI)
- `apps/backend/src/memory/*` (API + retrieval)
- `apps/web/src/lib/ai/rag/*` (Frontend RAG utilities)
- `scripts/agent/lib/persistent-memory/*`

## أفكار للاستكشاف

### Write path
- اكتب ذاكرة قصيرة (10 حروف)
- اكتب ذاكرة طويلة (100K حرف) — هل تُقطَّع صحيحاً (chunking)؟
- اكتب ذاكرة بـ duplicate content — هل تُحذَف الـ duplicates أو تتراكم؟
- اكتب من جلستين متزامنتين — هل تتعارض writes؟

### Read path
- ابحث بـ query عربي
- ابحث بـ query إنجليزي
- ابحث بـ query لا يطابق شيئاً
- ابحث بـ query يحوي SQL/NoSQL injection
- ابحث بـ query بـ embeddings خام
- قارن نتائج Qdrant و Weaviate لنفس الـ query — هل متسقة؟

### Isolation
- اكتب ذاكرة من user A ثم ابحث من user B — يجب ألا ترى user B بيانات A
- اكتب ذاكرة في session 1، ابحث في session 2 لنفس المستخدم — السلوك المتوقع؟

### Secret leakage
- اكتب ذاكرة تحوي API key وهمي (`sk-test-VERIFY-NOT-LEAKED-12345`)
- شغّل `pnpm agent:persistent-memory:secrets:scan`
- يجب أن يكتشفه ويرفع تحذيراً
- ابحث عنه — يجب ألا يظهر في النتائج

### Drift / consistency
- شغّل `pnpm agent:persistent-memory:status` — هل العدّ في Postgres = Qdrant = Weaviate؟
- إذا تباين، شغّل `pnpm agent:persistent-memory:turn:repair` — هل يُحلّ؟

### Performance
- ابحث في مجموعة 1K vs 100K — كيف يتغير latency؟

## Stop conditions

- اكتشاف تسرّب بيانات بين المستخدمين
- اكتشاف فقد بيانات (write success ثم read failure)
- اكتشاف تسرّب أسرار في النتائج
- انتهى الزمن (60 دقيقة)
