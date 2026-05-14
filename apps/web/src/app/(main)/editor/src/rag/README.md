# توثيق محلي لمسار استرجاع كود المحرر

هذا الملف توثيق تنفيذي محلي وليس مصدر حقيقة تشغيلية.

الحقيقة المرجعية لطبقة المعرفة موجودة فقط في:

```text
AGENTS.md
output/session-state.md
.repo-agent/RAG-OPERATING-CONTRACT.md
```

## الوضع الحالي

مسار Editor RAG لم يعد يملك مخزنًا متجهيًا أو مفاتيح نماذج داخل تطبيق الويب.
الأوامر المتوافقة في `@the-copy/web` تمرر التنفيذ إلى باك إند `@the-copy/backend`.

## التنفيذ الفعلي

- التخزين والاسترجاع: `Weaviate` داخل طبقة الذاكرة الخلفية.
- embeddings: `gemini-embedding-2`.
- توليد الإجابات: `gemini-2.5-flash`.
- نقطة التنفيذ: `apps/backend/src/modules/editor-rag`.

## الأوامر

```text
pnpm --filter @the-copy/backend editor-rag:index
pnpm --filter @the-copy/backend editor-rag:ask "<question>"
pnpm --filter @the-copy/backend editor-rag:stats
pnpm --filter @the-copy/backend editor-rag:smoke
```

تبقى أوامر `pnpm --filter @the-copy/web editor:rag:*` موجودة كغلاف توافق فقط.
