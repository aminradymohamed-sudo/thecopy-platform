# ZAP Baseline Exemptions

## Rule 10010 — Cookie No HttpOnly Flag on XSRF-TOKEN

**Status:** Documented exemption — expected behavior, not a vulnerability.

**ZAP finding:** "Cookie No HttpOnly Flag" on `XSRF-TOKEN`.

**Reason:** The platform uses the **Double Submit Cookie** CSRF pattern
([OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)).
In this pattern the browser must be able to read the XSRF-TOKEN cookie value via
JavaScript and submit it as a request header (`X-XSRF-TOKEN`).  Setting
`httpOnly: true` on this cookie would silently break CSRF protection.

**Code reference:** [apps/backend/src/middleware/csrf.middleware.ts](../../apps/backend/src/middleware/csrf.middleware.ts):199
```ts
httpOnly: false   // intentional — Double Submit Cookie requires JS read access
```

**Scope:** This exemption applies ONLY to the `XSRF-TOKEN` cookie, rule 10010.
All other cookies (`accessToken`, `refreshToken`, session cookies) MUST retain
`httpOnly: true` and are NOT exempted.

**Verification:** Confirmed `httpOnly: true` on all non-CSRF cookies in
`apps/backend/src/controllers/auth.controller.ts` and
`apps/backend/src/controllers/zkAuth.controller.ts`.

**Last reviewed:** 2026-05-14

---

## Rule 10015 — Incomplete or No Cache-Control and Pragma Header — 404 Responses

**Status:** Remediated in `apps/backend/src/server/bootstrap.ts` — `Cache-Control: no-store` added to 404 handler.

**Previous finding:** ZAP flagged Railway-served 404 responses as lacking Cache-Control, which could allow caching of error pages with any embedded cookies.

**Fix applied 2026-05-14:** The 404 catch-all handler now sets:
- `Cache-Control: no-store, must-revalidate, max-age=0`
- `X-Robots-Tag: noindex, nofollow`

---

## Rule 10010 — Cookie No HttpOnly Flag on Railway 404 cookies (false positive)

**Status:** False positive — not from application code.

**ZAP finding:** "Cookie No HttpOnly Flag" on responses to 404 paths on Railway backend.

**Reason:** Railway's infrastructure layer sets tracking/session cookies on CDN-level 404
responses. These cookies are not set by our application code. Verified via:
- `grep -r "express-session" apps/backend/src/` — `express-session` is installed as a
  transitive dep but **not registered** in any middleware chain.
- All application-issued cookies (`accessToken`, `refreshToken`, `XSRF-TOKEN`) are only
  set on authenticated routes, never on 404 paths.

**Mitigation:** Adding `Cache-Control: no-store` to 404 responses (B1 fix) prevents
downstream caching of these responses including any Railway-injected cookies.

---

## Rule 10016 — Session Management — Weak Anti-CSRF Token on 404 (false positive)

**Status:** False positive — same cause as rule 10010 above.

**Reason:** ZAP detected a session token pattern on a 404 response. This is Railway
infrastructure behavior, not application code. Our CSRF protection uses the Double Submit
Cookie pattern via `csrf.middleware.ts` and only activates on API routes that accept
state-modifying methods (POST/PUT/DELETE/PATCH).

---

## CSP Wildcards — Accepted Exemptions

**Status:** Partially remediated. Remaining wildcards documented below.

### `*.sentry.io` in `script-src`

**Reason:** Sentry uses project-specific subdomains for its SDK delivery (e.g.,
`js.sentry-cdn.com`, `browser.sentry-cdn.com`). The exact subdomain is determined at
build time by the `@sentry/nextjs` SDK. Pinning to a specific subdomain would break
automatic Sentry SDK delivery and error reporting.

**Mitigation:** `strict-dynamic` in `script-src` means only scripts already trusted via
nonce or hash can trigger further script loads, limiting the blast radius of this wildcard.

### `*.pixabay.com` in `media-src`

**Reason:** Pixabay serves media from content-addressed subdomains (`cdn.pixabay.com`,
`pixabay.com`, etc.). The exact origin varies by asset type and CDN routing.

**Mitigation:** Media content is read-only (display only) — no script execution surface.

### `*.googleapis.com` in `img-src` and `frame-src`

**Reason:** Google Maps tiles and embed iframes use multiple dynamic subdomains. Pinning
`img-src` and `frame-src` to specific googleapis subdomains has not been done in this
round because the full list of subdomains used by the Maps SDK is not fully documented.

**Remediation plan:** Profile Maps tile requests via Sentry CSP reporting to enumerate
actual subdomains used, then pin in a follow-up PR.

**Note:** `connect-src` and `script-src` wildcards have been replaced with explicit
subdomains as of 2026-05-14.

---

## Timestamp Disclosure — CSS content hashes (false positive)

**Status:** False positive — no actual timestamps in CSS content.

**ZAP finding:** "Timestamp Disclosure" on `/_next/static/css/*.css` resources.

**Reason:** ZAP matches 10-digit decimal sequences as potential Unix timestamps. Next.js
generates content-addressed CSS filenames using a hash that may contain 10-digit numeric
substrings (e.g., `/_next/static/css/3847291056.css`). These are not Unix timestamps — they
are truncated SHA-256 content hashes used for cache-busting.

**Verification:** `postcss.config.mjs` line 31 sets `discardComments: { removeAll: true }`,
removing all CSS comments in production. No actual timestamp values appear in CSS content.

**Evidence:** The ZAP-flagged values match Next.js chunk hash patterns (8-16 hex/decimal
chars) and do not correspond to any real UTC epoch time (would be 2003–2033 if taken
literally — confirmed no build tooling injects dates into CSS).

**Last reviewed:** 2026-05-14
