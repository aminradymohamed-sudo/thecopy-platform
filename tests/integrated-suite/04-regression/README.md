# 04 — اختبار الانحدار النهائي (Final Regression)

## الهدف

التحقق أن ميزات الإصدارات السابقة لم تتكسر بسبب التغييرات الجديدة. هذا أكثر اختبار يُنسى قبل النشر — لذا الحزمة هذه تجعله صريحاً ومُلزِماً.

## النطاق

تركيز على **المسارات الحرجة (critical paths)** التي إذا تكسّرت = no-go للإصدار:

1. تسجيل الدخول والخروج
2. إنشاء مشروع جديد
3. تحليل سيناريو (breakdown)
4. توليد cinematography
5. تشغيل actorai/أدوات AI
6. حفظ واسترجاع من الذاكرة
7. تصدير المشروع

## نقاط الدمج مع البنية القائمة

| القائم | الاستخدام |
|---|---|
| `apps/web/tests/e2e/*.spec.ts` | تُستدعى من قِبل الـ runner مع filter يستهدف critical paths |
| `apps/web/tests/integration/*.test.ts` | vitest integration tests تُشغَّل كاملة |
| `apps/backend/tests/integration/*.test.ts` | تُشغَّل كاملة |

> **الحزمة هذه لا تنسخ ولا تكرر الاختبارات الموجودة. تستدعيها كما هي وتجمع تقاريرها.**

## التشغيل

```powershell
pwsh tests/integrated-suite/04-regression/run.ps1 -ArtifactsDir artifacts/integrated-suite/<run-id>/04-regression
```

## السلوك

1. تشغيل `pnpm --filter @the-copy/web test:integration` (vitest)
2. تشغيل `pnpm --filter @the-copy/backend test:integration` (vitest)
3. تشغيل Playwright على `apps/web/tests/e2e/` بـ filter للـ critical-path specs
4. تجميع التقارير في `ArtifactsDir`

## القرار

- أي فشل في critical path = **no-go**
- أي فشل في غير critical = **يحتاج قرار صاحب المنتج** قبل no-go
