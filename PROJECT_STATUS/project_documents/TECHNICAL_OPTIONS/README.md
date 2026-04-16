# Technical Options: Nusuk Social Tracker v2

**Idea**: `nusuk-social-tracker-v2` (IF-Y-002)
**Date**: 2026-04-15
**Status**: tech-research-complete
**Strategy**: **Build-heavy on free-tier infrastructure** — every capability's selected option costs $0/mo cash, satisfying BR-15.

---

## Research Progress

| # | Capability | File | Tier | Status | Updated |
|---|---|---|---|---|---|
| 01 | Capture Engine + Hosting | [01-capture-engine-and-hosting.md](01-capture-engine-and-hosting.md) | Hero | complete | 2026-04-15 |
| 02 | Arabic / RTL Rendering | [02-arabic-rendering.md](02-arabic-rendering.md) | Hero | complete | 2026-04-15 |
| 03 | Tweet Fallback Chain & Media Types | [03-tweet-fallback-chain.md](03-tweet-fallback-chain.md) | Depth | complete | 2026-04-15 |
| 04 | Bilingual RTL UI | [04-bilingual-rtl-ui.md](04-bilingual-rtl-ui.md) | Depth | complete | 2026-04-15 |
| 05 | Type Safety | [05-type-safety.md](05-type-safety.md) | Depth | complete | 2026-04-15 |
| 06 | Observability | [06-observability.md](06-observability.md) | Depth | complete | 2026-04-15 |
| 07 | Export & Backup | [07-export-and-backup.md](07-export-and-backup.md) | Supporting | complete | 2026-04-15 |
| 08 | Data Lifecycle | [08-data-lifecycle.md](08-data-lifecycle.md) | Supporting | complete | 2026-04-15 |

---

## Executive Summary

The critical research finding resolves the biggest open risk from the BRD: **Oracle Cloud Always Free ARM64 supports Puppeteer reliably** via either system Chromium (`apt install chromium`) or `@sparticuz/chromium-min` v135+ (which now ships arm64 binaries). Puppeteer's *bundled* Chromium does not ship arm64, but neither of the recommended paths relies on that binary. This removes BRD risk R-1's primary technical block; the remaining R-1 risk (signup/region availability) is a business-side contingency and the documented fallback (Oracle x86 AMD free-tier or Render free) is one env-var change away.

With the ARM64 question resolved, the rest of the stack is conventional: React 18 + Vite + TypeScript + Tailwind RTL on the frontend; Express + TypeScript + Zod + pino on the backend; Supabase for DB + storage; GitHub Actions for CI/CD; Sentry + Axiom free tiers for observability.

---

## Strategy Overview

**Overall strategy**: 100% build-in-house on free-tier managed infrastructure and open-source libraries. No paid SaaS dependencies. No vendor lock-in beyond GitHub and Supabase, both of which have clean exit paths.

### Why build-heavy makes sense here

- The product (audit-grade screenshot + metadata archival for a specific bilingual use case) has no off-the-shelf free replacement (confirmed in BRD Section 4.3).
- The $0/mo constraint disqualifies every paid hosted screenshot API (Urlbox, Browserless, ScreenshotOne, Urlbox, ApiFlash).
- All required technical primitives — headless Chromium, Arabic font rendering, Excel/PDF export — exist as mature open-source libraries in the Node.js ecosystem.
- Operational complexity is bounded: one VM, one managed DB, one CI runner, one developer.

---

## Capability Analyses

| # | Capability | Recommendation | Approach | Est. Y1 Cost (cash) |
|---|---|---|---|---|
| 01 | Capture engine + hosting | Puppeteer + system Chromium on Oracle Cloud Always Free Ampere A1 Flex ARM64 (24 GB RAM) | Build | $0 |
| 02 | Arabic rendering | Docker image pre-installs `fonts-noto-sans-arabic` + `fonts-kacst`; `--font-render-hinting=none`; Satori dropped | Build | $0 |
| 03 | Tweet fallback chain | FxTwitter → oEmbed → Puppeteer embed page; media_type discriminated union; Satori dropped | Build | $0 |
| 04 | Bilingual RTL UI | React 18 + Vite + TypeScript + `react-i18next` + Tailwind `rtl:` variants | Build | $0 |
| 05 | Type safety | TypeScript strict + Zod at boundaries + Supabase gen-types | Build | $0 |
| 06 | Observability | pino → stdout (MVP); Sentry free + Axiom free (Phase 2) | Build/integrate | $0 |
| 07 | Export & backup | exceljs + Puppeteer `page.pdf()` + archiver | Build | $0 |
| 08 | Data lifecycle | Supabase (DB + Storage) + `pg_cron` purge | License free tier | $0 |

**Total Year 1 cash cost: $0.** Founder time imputed ~$2,500–3,500 (mostly one-time v2 implementation).

---

## Cost Impact Summary

| Category | Monthly | Annual |
|---|---|---|
| Infrastructure (Oracle Cloud Always Free + Supabase free) | $0 | $0 |
| Screenshot engine / APIs | $0 | $0 |
| Observability (free tiers) | $0 | $0 |
| CI/CD (GitHub Actions free tier) | $0 | $0 |
| Fonts / libraries (SIL OFL, MIT) | $0 | $0 |
| **Total cash** | **$0** | **$0** |
| Founder time (one-time implementation + ongoing upkeep, imputed @ $40/hr KSA dev rate) | — | ~$2,500–3,500 |

**All recommendations satisfy BR-15.**

---

## Partnership / Vendor Strategy

No paid vendor relationships. Free-tier dependencies:

| Vendor | What we use | Lock-in risk | Exit path |
|---|---|---|---|
| Oracle Cloud | Always Free ARM64 VM | Low — free tier could be revoked | Redeploy Docker Compose to Render free / Fly.io / any VM |
| Supabase | DB + Storage + `pg_cron` | Medium — Postgres is portable, Storage requires data migration | `pg_dump` + Storage → S3-compatible bucket; 1-day migration |
| GitHub | Actions CI + repo + Container Registry + Release backup storage | Low — widely portable | GitLab / Gitea; ~2-day migration |
| Sentry / Axiom | Observability | Zero — logs can be piped anywhere | Change the pino transport line |

---

## Key Open Questions

1. **Confirm Oracle Cloud signup succeeds in the target region** (KSA / GCC). If blocked, pivot to Oracle x86 AMD free-tier or Render free with tighter memory mitigations. Both documented.
2. **Verify FxTwitter and Twitter oEmbed remain operational** in the weeks leading up to the next Hajz season. If either breaks, rank changes and Puppeteer-on-embed-page takes a larger share.
3. **Check that Supabase `pg_cron` is still available on the free plan** when you set it up — free-plan features occasionally change; if removed, substitute GitHub Actions scheduled purge.
4. **Decide network access pattern for Oracle VM**: public domain + HTTPS via Caddy (simplest), Cloudflare Tunnel (better privacy posture for PDPL), or VPN-gated (maximum privacy). Recommend Cloudflare Tunnel — free, hides origin IP, easy TLS.
5. **Legal review** (optional, BRD §13): capture-vs-scrape posture under X ToS + PDPL archival-basis documentation.

---

## Impact on Downstream Pipeline

**For `/constraint-validation`**:
- All 8 capabilities satisfy BR-15 ($0/mo) individually. The combined constraint test should verify aggregate memory fits 24 GB on Oracle ARM64 (it will — Puppeteer ~300 MB, Node app ~100 MB, leaves ~23.6 GB headroom).
- Combined latency: FxTwitter path ~1s, full fallback to Puppeteer ~10s per URL → 100 URLs × 3s blended average ≈ 5 minutes, comfortably inside BR-6 (30 min).
- Arabic correctness bound by Chromium shaping behavior — cannot guarantee 100% without actual golden-file runs. Constraint validation should note this as CONDITIONAL PASS with manual spot-check mitigation.

**For `/prd-generator`**:
- Concrete stack: **Ubuntu 22.04 aarch64 (Oracle Cloud Ampere A1 Flex) / Docker / Node 20 / TypeScript / Express / Puppeteer + system Chromium / React 18 + Vite + Tailwind / Supabase Postgres + Storage / pino + Sentry + Axiom / exceljs + archiver / GitHub Actions CI**.
- Deployment: Docker Compose + GitHub Actions SSH, with Render fallback via `render.yaml`.
- Phased delivery: Phase 1 (MVP) = everything except Axiom + Sentry + automated monitoring; Phase 2 (before Hajz) adds Axiom + Sentry.
- Explicitly deferred: automated keyword monitoring (BR-16) — do not build in v2.
