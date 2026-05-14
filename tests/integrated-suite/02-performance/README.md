# 02 — اختبارات الأداء

## الهدف

قياس صمود التطبيق تحت أنماط حمل مختلفة. كل سيناريو يجيب عن سؤال محدد:

| السيناريو | السؤال | المخرج المتوقع |
|---|---|---|
| Load | هل يتحمّل العدد المتوقع من المستخدمين؟ | p95 latency ≤ threshold |
| Stress | متى ينهار التطبيق؟ | breaking point + graceful degradation |
| Soak (Endurance) | هل يبقى مستقراً تحت حمل ثابت لفترة طويلة؟ | لا memory leak، لا rate-drift |
| Spike | كيف يتصرف عند ارتفاع مفاجئ؟ | recovery time ≤ threshold |
| Scalability | هل يتوسع بكفاءة؟ | throughput-per-resource ≥ threshold |

## الأداة

[k6](https://k6.io) — مفتوح المصدر، سكربتات JavaScript، يدمج مع Grafana/Prometheus.

## التشغيل

```powershell
# تشغيل كل السيناريوهات
pwsh tests/integrated-suite/02-performance/run.ps1 -ArtifactsDir artifacts/integrated-suite/<run-id>/02-performance

# سيناريو واحد
pwsh tests/integrated-suite/02-performance/run.ps1 -Scenario load
pwsh tests/integrated-suite/02-performance/run.ps1 -Scenario stress
pwsh tests/integrated-suite/02-performance/run.ps1 -Scenario soak
pwsh tests/integrated-suite/02-performance/run.ps1 -Scenario spike
pwsh tests/integrated-suite/02-performance/run.ps1 -Scenario scalability
```

## المتطلبات

- `k6 version` يعمل (Windows: `winget install k6` / `choco install k6`)
- `pnpm dev:all` يعمل أو بيئة staging
- متغير `K6_TARGET_BASE_URL` (افتراضي: `http://localhost:3001`)
- متغير `K6_TEST_USER_TOKEN` للسيناريوهات المصادَقة (اختياري)

## العتبات

[thresholds.json](./thresholds.json) — أي تخفيض لقيمة عتبة محظور بقاعدة AGENTS.md. التشديد مسموح.

## السيناريوهات

| الملف | الوصف |
|---|---|
| [scenarios/load.k6.js](./scenarios/load.k6.js) | 50 VUs لـ 5 دقائق — workload متوقع |
| [scenarios/stress.k6.js](./scenarios/stress.k6.js) | تصاعد إلى 500 VUs لإيجاد breaking point |
| [scenarios/soak.k6.js](./scenarios/soak.k6.js) | 30 VUs ثابت لـ 2 ساعة |
| [scenarios/spike.k6.js](./scenarios/spike.k6.js) | 5 → 200 VUs في 30 ثانية |
| [scenarios/scalability.k6.js](./scenarios/scalability.k6.js) | تصاعد متدرج لقياس throughput-per-VU |

## المخرجات

```text
artifacts/integrated-suite/<run-id>/02-performance/
├── load.json
├── load.summary.html
├── stress.json
├── stress.summary.html
├── soak.json
├── soak.summary.html
├── spike.json
├── spike.summary.html
├── scalability.json
├── scalability.summary.html
└── summary.json
```
