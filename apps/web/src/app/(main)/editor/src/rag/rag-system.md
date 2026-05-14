# البنية التنفيذية لمسار editor-code-rag

هذا الملف توثيق تنفيذي محلي وليس مصدر حقيقة تشغيلية.

الحقيقة المرجعية لطبقة المعرفة موجودة فقط في:

```text
AGENTS.md
output/session-state.md
.repo-agent/RAG-OPERATING-CONTRACT.md
```

## التصنيف المرجعي

- المعرّف:
  `editor-code-rag`
- النوع:
  `code-retrieval`
- السياسة:
  `unify-now`

## التدفق الحالي

1. أوامر الويب المتوافقة تستدعي CLI الخلفي.
2. `editor-rag:cli` يستدعي service الخلفي مباشرة.
3. service يستخدم فهرسة الذاكرة الخلفية في `Weaviate`.
4. الاسترجاع يتم من مجموعة `CodeChunks`.
5. الإجابة النهائية تولد في الباك إند عبر `gemini-2.5-flash`.

## الملفات المحورية

```text
apps/backend/src/modules/editor-rag/service.ts
apps/backend/src/modules/editor-rag/routes.ts
apps/backend/src/modules/editor-rag/cli.ts
apps/backend/src/memory/indexer/weaviate-indexing.service.ts
apps/backend/src/memory/retrieval/context-builder.ts
```

## ما لا يقرره هذا الملف

- لا يقرر هذا الملف حالة طبقة المعرفة العامة للمستودع.
- لا يقرر هذا الملف البصمة المرجعية.
- لا يقرر هذا الملف readiness النهائية.
- المرجع الوحيد لهذه الأحكام يوجد في:

```text
output/session-state.md
.repo-agent/state-fingerprint.json
output/code-map/rag-systems.md
output/mind-map/rag-topology.mmd
```
