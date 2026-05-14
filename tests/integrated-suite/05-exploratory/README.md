# 05 — اختبار الاستكشاف الآلي (Agentic Exploratory)

## التحديث

**الحزمة الآن آلية بالكامل** — يُنفِّذها وكيل تنفيذي computer-use. لا تحتاج مختبراً بشرياً.

النمط مأخوذ من ملفات field-test القائمة في المستودع:
- [artifacts/art-director/run-art-director-field-test.cjs](../../../artifacts/art-director/run-art-director-field-test.cjs)
- [artifacts/editor-e2e/run-editor-e2e-audit.mjs](../../../artifacts/editor-e2e/run-editor-e2e-audit.mjs)

## الأسلوب

كل charter صار:
1. **Markdown ملف** — يصف الأهداف والـ heuristics للوكيل (ما زال المرجع)
2. **Spec قابل للتنفيذ** — Playwright + agentic loops تنفّذ الـ heuristics آلياً
3. **Reporter يعمل بنمط field-test** — `addResult/screenshots/progress.json/report.md`

## الأدوات

- Playwright (للتحكم بالمتصفح + screenshots + console capture)
- نمط addResult/severity/evidence من art-director field-test
- progress JSON live (للملاحظة في الوقت الحقيقي من قبل الوكيل)
- final report.md عربي بنفس قالب التقارير الموجودة

## الـ Charters المُؤتمتة

| الـ Spec | المنطقة | الزمن المتوقع |
|---|---|---|
| [specs/editor-explore.spec.ts](./specs/editor-explore.spec.ts) | المحرر السينمائي | ~10 دقيقة CI |
| [specs/studios-explore.spec.ts](./specs/studios-explore.spec.ts) | الاستوديوهات | ~12 دقيقة CI |
| [specs/memory-explore.spec.ts](./specs/memory-explore.spec.ts) | الذاكرة الدائمة + RAG | ~8 دقائق CI |
| [specs/auth-explore.spec.ts](./specs/auth-explore.spec.ts) | المصادقة و session | ~6 دقائق CI |
| [specs/i18n-explore.spec.ts](./specs/i18n-explore.spec.ts) | RTL والتدويل | ~5 دقائق CI |

## الـ heuristics charters (مرجع للوكيل)

تبقى ملفات [charters/*.md](./charters/) كـ مرجع — الـ specs تنفّذ ما فيها آلياً.

## التشغيل

```powershell
pwsh tests/integrated-suite/05-exploratory/run.ps1 -ArtifactsDir <dir>

# spec واحد
pwsh tests/integrated-suite/05-exploratory/run.ps1 -Spec editor-explore
```

## المخرجات (نفس نمط field-test)

```text
artifacts/integrated-suite/<run-id>/05-exploratory/
├── editor-explore/
│   ├── run-results.json
│   ├── run-results-progress.json
│   ├── report.md
│   ├── screenshots/
│   │   ├── ux-01-load.png
│   │   ├── ux-02-edit.png
│   │   └── ...
│   └── traces/
├── studios-explore/
├── memory-explore/
├── auth-explore/
├── i18n-explore/
└── REPORT.md  (موحَّد لكل النتائج)
```

## القاعدة الحاكمة

- لا snapshots عمياء (snapshot diffs) — assertions سلوكية فقط
- screenshots للمرجعية والدليل، ليس للاختبار
- severity: حرجة | مرتفعة | متوسطة | منخفضة (بالعربي ليتسق مع التقارير الموجودة)
- status: ناجح | فاشل | محجوب | غير موجود
