# tests/integrated-suite

حزمة الاختبارات المتكاملة لمستودع `the copy` — كل اختبار قبل الإصدار في مكان واحد.

## ابدأ من هنا

| إذا كنت | اقرأ |
|---|---|
| تريد فهم الحزمة بسرعة | [INDEX.md](./INDEX.md) |
| أنت الوكيل المنفِّذ | [EXECUTOR-RUNBOOK.md](./EXECUTOR-RUNBOOK.md) |
| تريد التفاصيل التشغيلية | [HANDOFF.md](./HANDOFF.md) |
| تريد الواجهة الآلية | [manifest.json](./manifest.json) |

## التشغيل السريع

```powershell
pwsh tests/integrated-suite/run-suite.ps1 -All
```

## المحتوى

```text
tests/integrated-suite/
├── INDEX.md                          خريطة الحزمة
├── HANDOFF.md                        brief للوكيل المنفِّذ
├── EXECUTOR-RUNBOOK.md               runbook قصير
├── README.md                         هذا الملف
├── manifest.json                     الواجهة الآلية
├── run-suite.ps1                     الـ orchestrator
│
├── 01-security/                      اختبارات الأمان (SAST/DAST/Deps/PenTest)
├── 02-performance/                   اختبارات الأداء (Load/Stress/Soak/Spike/Scalability)
├── 03-compatibility/                 اختبارات التوافق (Browser/Device/OS)
├── 04-regression/                    اختبار الانحدار النهائي
├── 05-exploratory/                   اختبار الاستكشاف (charters)
└── 06-pre-deployment/                اختبارات ما قبل النشر (smoke/system/UAT/RC/staging)
```

## القاعدة الحاكمة

هذه الحزمة لا تعدّل ولا تُضعف أي فحص قائم في المستودع. اقرأ [AGENTS.md](../../AGENTS.md) لقاعدة منع إضعاف الفحوصات.
