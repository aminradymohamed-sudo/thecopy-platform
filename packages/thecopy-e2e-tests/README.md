# thecopy-e2e-tests

نظام فحص شامل لمنصة `thecopy` مبني على Selenium WebDriver وSelenium Grid 4 وMocha. الهدف لم يعد smoke/system فقط؛ الحزمة الآن تقسم الفحص إلى طبقات قابلة للتشغيل والتقرير:

- Smoke testing
- Functional testing
- Integration tests
- Performance testing
- Regression testing
- Test-driven development
- Behavior-driven development
- System tests

المرجعية الرسمية المستخدمة في التصميم:

- Selenium Grid: https://www.selenium.dev/documentation/grid/
- Selenium testing types: https://www.selenium.dev/documentation/test_practices/testing_types/
- Selenium Page Object Models: https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/
- Selenium DSL guidance: https://www.selenium.dev/documentation/test_practices/encouraged/domain_specific_language/

## التصميم

الحزمة تتبع مبدأ Selenium Grid في تشغيل WebDriver على متصفحات بعيدة عبر Hub واحد، مع قابلية تشغيل Chromium وFirefox وEdge من نفس الاختبار. كل اختبار browser-level يبدأ WebDriver مستقلًا للحفاظ على حالة نظيفة لكل اختبار أو suite.

طبقة Page Objects موجودة في:

```text
src/pages/
```

وطبقة DSL المقروءة في:

```text
src/flows/TheCopyExperience.ts
```

والتصنيف الرسمي لكل أنواع الاختبار في:

```text
src/testing/TestTaxonomy.ts
```

اختبارات TDD تحرس هذا التصنيف حتى لا تتحول الحزمة مرة أخرى إلى نظام سطحي بلا suites حقيقية.

## خريطة الطبقات

| الطبقة | المسار | الأمر | الهدف |
|---|---|---|---|
| Smoke | `tests/smoke/` | `pnpm --filter @thecopy/e2e-tests smoke` | جاهزية سريعة للواجهة والخلفية والاستوديوهات |
| Functional | `tests/functional/` | `pnpm --filter @thecopy/e2e-tests functional` | تحقق ميزة/واجهة من منظور المستخدم |
| Integration | `tests/integration/` | `pnpm --filter @thecopy/e2e-tests integration` | تفاعل الواجهة والخلفية وواجهات auth |
| Performance | `tests/performance/` | `pnpm --filter @thecopy/e2e-tests performance` | ميزانيات latency وNavigation Timing |
| Regression | `tests/regression/` | `pnpm --filter @thecopy/e2e-tests regression` | عقود ثابتة بعد التغييرات |
| TDD | `tests/tdd/` | `pnpm --filter @thecopy/e2e-tests tdd` | عقود تصميم قابلة للتشغيل قبل التوسع |
| BDD | `tests/bdd/` + `features/` | `pnpm --filter @thecopy/e2e-tests bdd` | سيناريوهات Gherkin قابلة للتنفيذ |
| System | `tests/system/` | `pnpm --filter @thecopy/e2e-tests system` | رحلات كاملة end-to-end |

لإعادة تشغيل حزمة regression أوسع بعد تغيير كبير:

```text
pnpm --filter @thecopy/e2e-tests regression:full
```

لتشغيل كل شيء:

```text
pnpm --filter @thecopy/e2e-tests test:all
```

## Selenium Grid

تشغيل الشبكة محليًا عبر Podman:

```text
pnpm --filter @thecopy/e2e-tests grid:up
pnpm --filter @thecopy/e2e-tests grid:status
```

القيم الافتراضية:

```text
SELENIUM_HUB_URL=http://localhost:4444
E2E_BROWSERS=chromium,firefox,edge
```

إيقاف الشبكة:

```text
pnpm --filter @thecopy/e2e-tests grid:down
```

## البيئات

```text
TEST_ENV=staging | production | local
```

الافتراضي هو `staging`.

روابط Staging الافتراضية:

```text
Frontend: https://www.thecopy.app
Backend : https://backend-thecopy-staging.up.railway.app
```

متغيرات مهمة:

```text
VERCEL_AUTOMATION_BYPASS_SECRET
LOG_LEVEL=trace | debug | info | warn | error
E2E_API_HEALTH_P95_MS
E2E_API_HEALTH_MAX_MS
E2E_FRONTEND_HOME_LOAD_MS
E2E_FRONTEND_STUDIO_LOAD_MS
E2E_FRONTEND_DOM_CONTENT_LOADED_MS
E2E_PERF_API_SAMPLES
```

## BDD

ملفات المواصفة:

```text
features/*.feature
```

التنفيذ:

```text
tests/bdd/*.bdd.test.ts
src/bdd/
```

الـ feature files تستخدم subset واضح من Gherkin: `Feature`, `Scenario`, `Given`, `When`, `Then`, `And`. كل خطوة يجب أن يكون لها step definition صريح في `src/bdd/platformSteps.ts`.

## Performance

اختبارات الأداء هنا ليست بديلًا عن أدوات load/stress المتخصصة مثل JMeter، لكنها تطبق قياسات مفيدة داخل نفس Selenium/Grid pipeline:

- API latency samples للـ backend health.
- Browser Navigation Timing للصفحة الرئيسية واستوديو ممثل.
- ميزانيات قابلة للضبط من البيئة.

## التقارير

التقارير الخام:

```text
reports/mochawesome/.jsons
reports/junit
```

دمج تقرير HTML:

```text
pnpm --filter @thecopy/e2e-tests report:merge
```

المخرجات:

```text
reports/mochawesome/merged.json
reports/mochawesome/html/index.html
screenshots/<runStamp>/<browser>/*.png
```

## CI/CD

ملف workflow داخل الحزمة:

```text
packages/thecopy-e2e-tests/.github/workflows/e2e-staging.yml
```

المصفوفة الحالية تشغّل:

```text
smoke
functional
integration
system
performance
regression
bdd
tdd
```

## مؤشرات النجاح

- كل discipline مطلوب له script ومسار واختبار حارس في TDD.
- Functional وBDD وSystem تعمل عبر Selenium Grid ومتصفحات متعددة.
- Integration يغطي تفاعل API وbrowser fetch.
- Performance يفشل عند تجاوز الميزانيات بدل الاكتفاء بالتسجيل.
- Regression يعيد فحص عقود route/content الثابتة بعد أي تغيير.
