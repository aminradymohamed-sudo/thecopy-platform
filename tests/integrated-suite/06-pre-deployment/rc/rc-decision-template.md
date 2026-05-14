# RC Decision — Go / No-Go

## معلومات الإصدار

- **الإصدار:** v_._._
- **التاريخ:** YYYY-MM-DD
- **الـ commit:** _____________
- **الـ build artifact:** _____________

## نتائج الحزم

| الحزمة | الحالة | الـ artifact |
|---|---|---|
| 01-security | ☐ pass / ☐ fail | … |
| 02-performance | ☐ pass / ☐ fail | … |
| 03-compatibility | ☐ pass / ☐ fail | … |
| 04-regression | ☐ pass / ☐ fail | … |
| 05-exploratory | ☐ pass / ☐ fail | … |
| 06-pre-deployment.smoke | ☐ pass / ☐ fail | … |
| 06-pre-deployment.system | ☐ pass / ☐ fail | … |
| 06-pre-deployment.uat | ☐ pass / ☐ fail | … |

## القرار

- [ ] **GO** — كل البنود في [release-candidate-checklist.md](./release-candidate-checklist.md) مكتملة، ولا توجد ثغرات أمنية `critical`/`high` مفتوحة، ولا فشل في critical-paths.

- [ ] **NO-GO** — توجد بنود غير مكتملة. القرار: تأجيل النشر حتى تُغلَق.

- [ ] **CONDITIONAL GO** — كل البنود الإلزامية مكتملة، لكن توجد `medium` issues موثَّقة في الإصدار التالي. الموافقة بشروط:
  - شرط 1: …
  - شرط 2: …

## أسباب القرار

(لو NO-GO أو CONDITIONAL: اكتب الأسباب بدقة)

1. …
2. …

## التواقيع

| الدور | الاسم | التوقيع | التاريخ |
|---|---|---|---|
| Product Owner | | | |
| Tech Lead | | | |
| Security Officer | | | |
| DevOps | | | |

## post-deploy plan

- [ ] post-deploy smoke سيُشغَّل خلال 5 دقائق من النشر
- [ ] monitoring أول 24h
- [ ] rollback plan جاهز إذا حدث: ___________________

## ملاحظات

(أي ملاحظات إضافية)

---

> **حوكمة:** هذا الملف يُحفَظ في `artifacts/integrated-suite/<run-id>/06-pre-deployment/rc-decision.md` و يُرفع كـ artifact في GitHub Release.
