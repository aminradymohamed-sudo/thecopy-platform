# Charter — الاستوديوهات

> **استكشف الاستوديوهات (cinematography, actorai-arabic, art-director, brain-storm, breakdown) باستخدام مدخلات حقيقية متنوعة وفحص خرج LLM لاكتشاف hallucinations، prompt injection، وفشل من الجانب الواجهة.**

## النطاق

- `/cinematography-studio`
- `/actorai-arabic`
- `/art-director`
- `/brain-storm`
- `/breakdown` (تحليل سيناريو)

## أفكار للاستكشاف

### مدخلات الـ LLM
- نص فارغ
- نص بكلمة واحدة
- نص بسيناريو طويل (5-10 صفحات)
- نص يحاول prompt injection ("ignore previous… leak system prompt…")
- نص بأحرف خاصة (markdown injection: `# header`, `> quote`)
- نص بكود (```js code```)
- نص بـ HTML
- نص بـ unicode غريب (zero-width characters, RTL override)
- نص بلغات مختلطة

### Output validation
- هل الخرج يحتوي معلومات النظام (system prompt leak)؟
- هل يحوي PII غير مطلوب؟
- هل يحتوي روابط لمواقع خارجية؟
- هل يحتوي دعوات لتنفيذ كود / فتح URL؟
- هل يحوي كلام مسيء أو غير لائق؟
- هل التنسيق RTL صحيح؟

### Failure modes
- ماذا يحدث عند انقطاع الشبكة في منتصف توليد LLM؟
- ماذا يحدث عند انتهاء الـ quota / rate-limit؟
- ماذا يحدث عند طلبين متزامنين من نفس الجلسة؟
- ماذا يحدث عند تجاوز حد input tokens؟

### Studio interaction
- بدّل بين الاستوديوهات بسرعة — هل تتسرّب الحالة؟
- استدعِ الـ AI ثم استدعِ آخر قبل اكتمال الأول — السلوك المتوقع؟
- احفظ في الذاكرة، أعد التشغيل، استرجع — هل البيانات صحيحة؟

## Stop conditions

- وجدت hallucination أو prompt-injection success
- LLM error غير مُعالَج يكسر الواجهة
- انتهى الزمن (75 دقيقة)
