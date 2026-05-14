# مهام تنفيذ الذاكرة الصامتة السريعة

تاريخ الإنشاء:

```text
2026-05-03
```

## المرحلة الأولى

- [x] T001 إنشاء اختبار يفشل عندما يطبع أمر سياق السؤال الذاكرة كاملة افتراضيًا في `scripts/agent/persistent-memory-turn.test.ts`.
- [x] T002 تعديل `scripts/agent/persistent-memory-turn.ts` لدعم خرج مختصر افتراضي.
- [x] T003 تعديل `scripts/agent/persistent-memory-turn.ts` لدعم `--quiet`.
- [x] T004 تعديل `scripts/agent/persistent-memory-turn.ts` لدعم `--print-context`.
- [x] T005 منع تنفيذ `main` عند استيراد ملف الأمر داخل الاختبارات.

## المرحلة الثانية

- [x] T006 تعديل `AGENTS.md` حتى لا يطلب عرض موجز القراءة في الأسئلة العادية.
- [x] T007 تعديل `.repo-agent/STARTUP-PROTOCOL.md` حتى يستخدم سياق السؤال الصامت.
- [x] T008 تعديل `.repo-agent/OPERATING-CONTRACT.md` حتى يعكس السلوك الصامت.
- [x] T009 تعديل `scripts/agent/lib/templates.ts` حتى يعاد توليد السياق بنفس القاعدة.

## المرحلة الثالثة

- [x] T010 تعديل `scripts/agent/plan-implementation-reviewer.ts` حتى يستخدم `--quiet`.
- [x] T011 تحديث `scripts/agent/plan-implementation-reviewer.test.ts` لمنع الرجوع إلى الاستدعاء الصاخب.
- [x] T012 تعديل `scripts/agent/verify-state.ts` حتى يفشل إذا غابت قاعدة الصمت من السياق المولد.

## المرحلة الرابعة

- [x] T013 إنشاء حزمة المواصفات في `docs/persistent-memory-silent-gate/SPEC-PACK.md`.
- [x] T014 إنشاء قائمة تحقق في `docs/persistent-memory-silent-gate/CHECKLIST.md`.
- [x] T015 إنشاء قائمة تنفيذ موحدة في `docs/persistent-memory-silent-gate/TASKS.md`.

## المرحلة الخامسة

- [ ] T016 تشغيل اختبارات أمر سياق السؤال.
- [ ] T017 تشغيل اختبارات مراجع تنفيذ الخطة.
- [ ] T018 تشغيل اختبارات سياق الذاكرة المركزة.
- [ ] T019 تشغيل فحص الأنواع.
- [ ] T020 تشغيل التمهيد الرسمي.
- [ ] T021 تشغيل تحقق الوكلاء الرسمي.
- [ ] T022 تشغيل قبول حي لسؤال عادي والتأكد من أن الخرج مختصر.
- [ ] T023 تثبيت التغييرات على الفرع الحالي إذا نجحت الفحوص.
