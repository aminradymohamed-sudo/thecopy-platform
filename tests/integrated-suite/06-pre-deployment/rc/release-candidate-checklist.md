# Release Candidate Checklist

## التعريف

هذه القائمة تحدّد جاهزية الـ build النهائي للإعلان عنه. كل بند يجب أن يكون `✅` قبل توقيع `rc-decision.md`.

## معلومات الإصدار

- **الإصدار:** v_._._
- **الـ commit:** ___________________
- **الفرع:** main
- **التاريخ:** YYYY-MM-DD
- **المسؤول:** _____________________

## ✅ البنية و البناء

- [ ] `pnpm build:all` ينجح بدون warnings
- [ ] `pnpm type-check` ينجح
- [ ] `pnpm lint:strict` ينجح
- [ ] `pnpm format:check` ينجح
- [ ] `pnpm guard:budgets` ينجح
- [ ] `pnpm check:exports` ينجح
- [ ] `pnpm check:line-budget` ينجح
- [ ] حجم الـ bundle ضمن `apps/web/performance-budget.config.js`

## ✅ الفحوصات الآلية

- [ ] `pnpm validate:strict` ينجح كاملاً
- [ ] `pnpm security:all` ينجح
- [ ] `pnpm agent:verify` ينجح
- [ ] `pnpm agent:persistent-memory:turn:verify` ينجح
- [ ] CI workflow `ci.yml` آخر تشغيل: `success`
- [ ] CI workflow `codeql.yml` آخر تشغيل: `success`
- [ ] CI workflow `security-audit.yml` آخر تشغيل: `success`

## ✅ حزمة الاختبارات المتكاملة

- [ ] **01-security:** كل sub-categories `pass` — لا ثغرات `critical` أو `high` مفتوحة
- [ ] **02-performance:** كل thresholds في `thresholds.json` تُحترَم
- [ ] **03-compatibility:** كل critical browsers في `matrix.json` `pass`
- [ ] **04-regression:** كل critical-paths `pass`
- [ ] **05-exploratory:** ≥ 2 جلسات مكتملة، REPORT.md موقَّع
- [ ] **06-pre-deployment:** smoke + system + UAT-acceptance-criteria موقَّعة

## ✅ بيئة Staging

- [ ] Deployed to staging successfully
- [ ] smoke ينجح في staging
- [ ] system ينجح في staging
- [ ] UAT تمت في staging (لا في dev local)
- [ ] جميع integrations تعمل (DB, Qdrant, Weaviate, Redis, OpenRouter, Gemini)
- [ ] feature flags في الحالة المطلوبة

## ✅ التوثيق و Communication

- [ ] CHANGELOG.md محدّث
- [ ] release notes جاهزة
- [ ] `output/session-state.md` محدّث
- [ ] `output/round-notes.md` محدّث
- [ ] فريق support أُبلِغ بـ breaking changes (إن وُجدت)
- [ ] runbook للنشر جاهز

## ✅ خطة rollback

- [ ] خطة rollback موثَّقة في staging-runbook.md
- [ ] backup قاعدة البيانات قبل النشر
- [ ] feature flags قابلة للإيقاف بدون redeploy
- [ ] monitoring + alerts جاهزة

## ✅ الأمان

- [ ] secrets في الـ vault الصحيح، ليس في git
- [ ] `pnpm security:secrets:staged` ينجح
- [ ] env vars الإنتاج تختلف عن dev/staging
- [ ] لا توجد `console.log` تكشف PII

## ✅ الموافقات

- [ ] Product Owner — UAT acceptance-criteria موقَّعة
- [ ] Tech Lead — RC checklist مكتمل
- [ ] Security — no `critical`/`high` unresolved
- [ ] DevOps — staging stable + monitoring ready

## القرار

اقرأ [rc-decision-template.md](./rc-decision-template.md) ووقّع.
