# Category 3: Technical Compatibility

## Stack inventory

- **Runtime**: Node.js 20 LTS on Ubuntu 22.04 aarch64 (Oracle Ampere A1)
- **Language**: TypeScript (strict) end-to-end
- **Frontend**: React 18 + Vite + Tailwind + react-i18next
- **Backend**: Express + Zod + pino
- **Capture**: Puppeteer (latest) + system Chromium via `apt`
- **DB**: Supabase Postgres + Storage + pg_cron + Edge Functions
- **Exports**: exceljs + archiver + Puppeteer `page.pdf()`
- **CI/CD**: GitHub Actions with Docker build + SSH deploy
- **Tests**: Vitest + Playwright `toHaveScreenshot` (in prod Docker image)
- **Obs**: pino → Sentry + Axiom (free tiers)

## Compatibility checks

| # | Check | Finding | Severity |
|---|---|---|---|
| 1 | Runtime consistency | All TS/Node — single runtime across frontend + backend | ✅ PASS |
| 2 | DB consistency | Single Postgres (Supabase) | ✅ PASS |
| 3 | Auth consistency | No auth (internal tool, VPN/Cloudflare-Tunnel gated) — or single-user Supabase auth if exposed | ✅ PASS (decision deferred to PRD) |
| 4 | API protocol | REST over HTTPS throughout | ✅ PASS |
| 5 | **Compliance (X ToS)** | Screenshot-capture position documented; internal-use low-volume; legal review optional | ⚠️ CV-01 — MEDIUM |
| 6 | **Compliance (PDPL)** | Archival lawful basis + processing-activity record needed; all data paths inside Supabase + Oracle VM (choose KSA or EU region) | ⚠️ CV-02 — MEDIUM |
| 7 | Dependency: Puppeteer on ARM64 | Works via system Chromium or @sparticuz/chromium-min v135+ (bundled Chromium x64-only) | ✅ PASS — research-verified |
| 8 | Dependency: Playwright `toHaveScreenshot` on ARM64 in CI | Runs in GitHub Actions ubuntu-latest (x64) — parity concern with prod ARM64 | ⚠️ CV-03 — HIGH |
| 9 | Dependency: exceljs + Puppeteer coexistence | Independent libraries; exceljs is pure-JS, no browser dependency | ✅ PASS |
| 10 | Browser instance sharing (Puppeteer for capture + `page.pdf()` for PDF export) | Same pooled manager; documented pattern | ✅ PASS |
| 11 | Data flow: FxTwitter JSON → Zod schema → DB row → Excel/PDF output | Schema-validated at each boundary | ✅ PASS |
| 12 | Deployment environment | Single container target (Docker Compose on Oracle VM) — no GPU/serverless conflict | ✅ PASS |

## Compatibility issues register

| ID | Issue | Options involved | Severity | Resolution | Effort |
|---|---|---|---|---|---|
| **CV-01** | X (Twitter) ToS explicitly prohibits scraping post-Sept 2023 | Puppeteer fallback on tweet URL | MEDIUM | Document "screenshot capture ≠ data scraping" position; keep low-volume; optional legal review ($0–500 one-off) | 2h doc + optional review |
| **CV-02** | PDPL archival basis must be documented | Supabase region + processing-activity record | MEDIUM | Choose Supabase region (prefer KSA or EU-central); write one-page processing-activity record; verify no personal data is exported outside approved region | 3h |
| **CV-03** | **CI (x64) ↔ Prod (ARM64) golden-file parity risk** | Playwright screenshot tests in GitHub Actions vs. Puppeteer+system Chromium on Oracle ARM64 | **HIGH** | Run CI tests inside the **same Docker image used in prod**, built with `--platform linux/arm64` and using QEMU emulation in GH Actions. OR use GitHub Actions' Ubuntu 22.04 ARM runners (available free tier 2026 for public repos). | +4h CI setup |

## Resolution recommendations

**CV-03 (HIGH)** — the only non-trivial finding. Two paths:

1. **QEMU emulation in GitHub Actions**: `docker buildx build --platform linux/arm64` with `qemu-user-static` — slower CI runs (~3× longer), but exact binary parity. Free tier minutes stay within budget at current usage.
2. **GitHub Actions ARM64 runners**: free for public repos; may become paid for private. Much faster than QEMU. Current minute limits apply.

**Recommendation**: Start with Option 1 (QEMU) for reliability; migrate to Option 2 if/when available on the repo plan.

**CV-01 and CV-02**: documentation-only remediations with <5 hours effort total. Not blocking.

## Verdict

**CONDITIONAL PASS** — 1 HIGH issue (CV-03) with a clear remediation that adds ~4 hours of CI setup. 2 MEDIUM issues that are documentation tasks. No CRITICAL blockers. No runtime or dependency conflicts.
