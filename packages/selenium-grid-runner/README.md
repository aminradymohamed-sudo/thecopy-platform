# selenium-grid-runner

شبكة سيلينيوم 4 موزّعة عبر بودمان مع منصة اختبار متعددة المتصفحات بـ:

TypeScript

## المعمارية

- Hub بودماني واحد على المنفذ:

4444

- ثلاث عقد متصفح معزولة:

Chromium

Firefox

Edge

- منافذ noVNC للتصحيح الحي:

7900 (Chromium)

7901 (Firefox)

7902 (Edge)

## الأوامر

تشغيل الشبكة من جذر المستودع:

```powershell
podman compose -f dev-tools/selenium-grid/podman-compose.selenium.yml up -d
```

فحص حالة الشبكة:

```powershell
pnpm --filter @thecopy/selenium-grid-runner grid:status
```

تشغيل اختبار الدخان المتوازي ضد:

https://www.thecopy.app/

```powershell
pnpm --filter @thecopy/selenium-grid-runner smoke
```

إيقاف الشبكة:

```powershell
podman compose -f dev-tools/selenium-grid/podman-compose.selenium.yml down
```

## المخرجات

اللقطات الكاملة في:

```text
artifacts/screenshots/<runStamp>/<browser>.png
```

التقارير الموحّدة في:

```text
artifacts/reports/smoke-<runStamp>.json
```
