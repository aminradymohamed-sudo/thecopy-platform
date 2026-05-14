# License Review

## sharp / libvips — LGPL-3.0-or-later

| Package | License | Version |
|---|---|---|
| `sharp` (npm) | Apache-2.0 | current |
| `libvips` (native dependency) | LGPL-3.0-or-later | bundled via sharp prebuilt |

### Compliance Assessment

`sharp` ships **prebuilt binaries** that bundle `libvips` as a **dynamically linked** shared library.
Under LGPL-3.0-or-later, dynamic linking is permitted in proprietary/closed-source products provided:

1. **The LGPL library itself remains replaceable** by the end user (satisfied — prebuilt binaries are
   swappable via npm install or source build).
2. **Attribution** is preserved in the build output (see below).
3. **Application source code does not need to be open-sourced** as long as libvips is dynamically linked
   (confirmed by the LGPL-3.0-or-later terms, §4–6).

### Attribution

Include the following in release notes / OSS notice file:

> This product uses **libvips** (https://libvips.github.io/libvips/), licensed under LGPL-3.0-or-later.
> Source code: https://github.com/libvips/libvips

### Decision

**Accepted** — dynamic linking via prebuilt binaries is compatible with our proprietary codebase
under LGPL-3.0-or-later.  No application source disclosure required.

**Last reviewed:** 2026-05-13
