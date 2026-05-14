# Accepted Security Risks

This document records security findings that have been reviewed and accepted as known risks.
Each entry includes the justification, scope of impact, owner, and review date.

---

## AR-001 — leaflet@1.9.4 XSS in Address6 HTML-emitting methods

| Field | Value |
|---|---|
| **Package** | `leaflet@1.9.4` |
| **Snyk IDs** | SNYK-JS-LEAFLET-8816768, SNYK-JS-LEAFLET-8816769 |
| **CVSS** | ~6.1 (Medium — requires attacker-controlled map data) |
| **Severity** | Medium |
| **Status** | Accepted Risk — documented exemption |
| **Review date** | 2026-05-14 |
| **Next review** | 2026-08-14 |
| **Owner** | Security team / frontend lead |

### Vulnerability description

leaflet@1.9.4 contains XSS in `Address6` HTML-emitting helper methods
(`toHexLabeledGroups()`, `toGroup()`, etc.). These methods emit unsanitized
HTML when given attacker-controlled input.

### Why this is accepted

1. **Unused code path:** The only leaflet consumer in this codebase is
   [packages/breakapp/src/components/maps/MapComponent.tsx](../../packages/breakapp/src/components/maps/MapComponent.tsx).
   It uses exclusively: `L.icon`, `L.divIcon`, `L.tileLayer`, `L.polyline`,
   `L.marker`, `L.popup` — none of which invoke `Address6` or any HTML-emitting helper.

2. **No upstream fix in 1.x:** leaflet 1.x has no patch available. The vulnerable
   methods are part of the core distribution but are not called by our integration.

3. **Alternative cost:** Migrating to MapLibre GL or react-map-gl would require a full
   rewrite of MapComponent.tsx (markers, polylines, tile layers, popups, click handlers).
   This has been assessed as disproportionate given the unexploited surface.

4. **Map data is trusted:** The application only renders user-selected KMZ/GeoJSON files
   that pass through backend validation. No attacker-controlled strings reach the map
   rendering layer directly.

### Mitigations in place

- CSP `script-src` with nonce enforcement prevents inline script injection.
- The `L.Address6` code path is never exercised (verified via code review).
- `.snyk` policy suppresses the finding in CI scan with an expiry date.

### Remediation plan

- Monitor leaflet 2.x release (expected 2026). If a patched 2.x ships before the
  review date, upgrade and close this entry.
- Alternatively, evaluate `react-leaflet@5` (which wraps leaflet 2.x) when available.

---

## AR-002 — XSRF-TOKEN cookie httpOnly:false (intentional)

| Field | Value |
|---|---|
| **Finding** | ZAP rule 10010 — Cookie No HttpOnly Flag |
| **Cookie** | `XSRF-TOKEN` |
| **Severity** | Low (informational in context) |
| **Status** | Accepted Risk — pattern-required behavior |
| **Review date** | 2026-05-13 |
| **Owner** | Backend lead |

See [zap-baseline-exemptions.md](zap-baseline-exemptions.md) for the full explanation.
The Double Submit Cookie CSRF pattern requires JavaScript read access to this cookie.
Setting `httpOnly:true` would silently break CSRF protection.

---

## Note — Python pip scanning operational requirement

Snyk CLI's pip plugin resolves `requirements.txt` against the **active Python
environment's site-packages**. If the developer's global Python (or any active
venv) has older versions installed than the `==` pins in `requirements.txt`,
Snyk will report the **installed** versions, not the pinned ones.

This is not a Snyk bug — it is documented `pip` resolution behaviour. The fix
is operational, not policy: keep the active Python environment's installed
versions in sync with `requirements.txt` before running `snyk test`.

The supplementary `pnpm security:py` script (`scripts/security/pip-audit-all.sh`)
builds isolated venvs per project and runs `pip-audit` against them, giving
deterministic results independent of the developer's global Python state.
