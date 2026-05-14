# مرآة GitHub Copilot

هذا الملف مرآة خاصة بالأداة فقط.

هذا الملف ليس مصدر الحقيقة.

ابدأ دائمًا من:

```text
AGENTS.md
```

ثم اقرأ:

```text
output/session-state.md
```

ثم اقرأ سياق الذاكرة الدائمة المولد:

```text
.repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md
```

ثم اقرأ فقط ما يلزم من:

```text
output/code-map/*
output/mind-map/*
```

قبل أي تحليل أو تعديل أو تنفيذ:

1. اقرأ العقد الأعلى.
2. اقرأ الحالة الحية.
3. اقرأ سياق الذاكرة الدائمة المولد.
4. احفظ إثبات القراءة داخل الملفات المولدة، ولا تعرض brief أو قائمة أوامر للمستخدم إلا إذا طلب تقريرًا أو إثباتًا صراحة.
5. في الأسئلة العادية أجب مباشرة وباختصار بعد اكتمال الحقن الصامت.
6. لا تعرض route أو retrieval identifiers أو audit identifiers أو memory context في الرد العادي.
7. تقرير الإثبات لا يعرض إلا عند طلب صريح، ومن سجل جلسة محفوظ ومغلق.
8. ثم فقط ابدأ العمل.

ممنوع:

- اعتبار هذا الملف مصدر الحقيقة.
- الاعتماد على ذاكرة المحادثة أو واجهة الأداة كمصدر للحالة.
- وضع المنافذ الرسمية أو أوامر التشغيل أو قائمة الخدمات أو حالة الأعطال أو معلومات RAG المحلية هنا.

عند نهاية الجولة:

1. حدّث:

```text
output/round-notes.md
```

2. حدّث:

```text
output/session-state.md
```

إذا تغيّرت الحقيقة التشغيلية أو البنيوية.
3. أخرج handoff brief قصيرًا يذكر:
   - ما الذي تغيّر
   - ما الذي ثبت
   - ما الذي بقي مفتوحًا

المرجع الأعلى:

```text
AGENTS.md
.repo-agent/OPERATING-CONTRACT.md
.repo-agent/RAG-OPERATING-CONTRACT.md
.repo-agent/STARTUP-PROTOCOL.md
.repo-agent/HANDOFF-PROTOCOL.md
```
