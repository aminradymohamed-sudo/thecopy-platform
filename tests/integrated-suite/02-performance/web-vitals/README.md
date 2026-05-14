# 02-performance/web-vitals — Lighthouse CI / Core Web Vitals

## التعريف

k6 يقيس أداء الـ backend تحت الحمل، لكنه لا يقيس **perceived performance** (FCP, LCP, CLS, TBT, SI, TTI). هذه الحزمة الفرعية تستهلك [apps/web/lighthouserc.json](../../../../apps/web/lighthouserc.json) القائم بدون تعديله.

## ما يستخدمه

```text
apps/web/lighthouserc.json   ← الـ source of truth للعتبات (لا يُعدَّل)
pnpm --filter @the-copy/web lighthouse
```

## العتبات الموروثة من lighthouserc.json

| المقياس | العتبة |
|---|---|
| categories:performance | ≥ 0.90 |
| categories:accessibility | ≥ 0.95 |
| categories:best-practices | ≥ 0.95 |
| categories:seo | ≥ 0.95 |
| FCP | ≤ 1800ms |
| LCP | ≤ 2500ms |
| CLS | ≤ 0.1 |
| TBT | ≤ 200ms |
| Speed Index | ≤ 3400 |
| Time to Interactive | ≤ 3800ms |
| max-potential-fid | ≤ 100ms |
| server-response-time | ≤ 500ms |

> **أي تخفيض لهذه العتبات في `lighthouserc.json` محظور** بقاعدة AGENTS.md.

## التشغيل

```powershell
pwsh tests/integrated-suite/02-performance/web-vitals/run.ps1 -ArtifactsDir <dir>
```

## المسارات المُختبَرة (من lighthouserc.json)

- `/`
- `/directors-studio`
- `/about`
- `/services`
