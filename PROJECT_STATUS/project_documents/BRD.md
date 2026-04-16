# BRD: Nusuk Social Tracker v2 — Rebuild

**Version**: 2.0 (Final)
**BRD Phase**: Final
**Date**: 2026-04-15
**Status**: Approved for implementation (CONDITIONAL PASS from constraint validation)
**Author**: Idea Forge (AI-Generated)
**ID**: IF-Y-002

> **Scope note — internal tool**: Sections typically focused on market sizing and revenue (4.1, 4.2, 8) are intentionally marked N/A — this is a single-analyst internal tool with no revenue model. The binding analysis is **Approach Validation** (Section 6.3), **Regulatory** (Section 12), and **Technical Options Summary** (Section 14). Downstream `/marketing-strategy` and `/pricing-strategy` were skipped as planned.

---

## 1. Executive Summary

Nusuk Social Tracker v2 is a ground-up reliability rebuild of a production internal tool that archives public social-media posts and news articles mentioning the Nusuk Card (بطاقة نسك), the Saudi Hajj digital pilgrim ID. The v1 tool proved the workflow saves the PR/comms analyst ~3 minutes per post while compiling weekly reports for program leadership, but v1 suffered chronic reliability failures (OOM on ≥6-tweet batches on its 512 MB tier, intermittent Arabic font rendering, blank video-tweet cards, zero observability) that forced the analyst back to manual workflow during peak Hajj season — negating v1's value at the moment it mattered most.

v2's deliverable is not more features; it is **reliability at $0/month**. The pipeline confirmed that the hard $0-budget constraint is achievable through a free-tier pivot (Oracle Cloud Always Free Ampere A1 Flex — 24 GB RAM, 48× v1's capacity) rather than through engineering heroics on Render's 512 MB, and that the ARM64 toolchain risk (the biggest open question from the Initial BRD) is resolved: Puppeteer runs reliably on Oracle ARM64 via system Chromium (`apt install chromium`) or `@sparticuz/chromium-min` v135+ (which ships arm64 binaries). Google's native Chrome-for-ARM64 Linux ships Q2 2026, removing remaining friction.

Constraint validation returned **CONDITIONAL PASS** — no hard FAILs, 1 HIGH technical issue (CI/prod ARM64 parity — remediated with `docker buildx` under QEMU, +4h), 3 documentation conditions (BR-2 threshold wording, X ToS posture doc, PDPL archival-basis record), and 1 WARNING (solo-developer capacity ratio 1.15 — remediated via a phased delivery plan that defers dashboard stats, backup automation, and external error tracking to Phase 2 post-Hajz). Total Year 1 cash cost: **$0**.

## 2. Problem Statement

**Who**: A single non-technical, Arabic-preferring PR/communications analyst at the Nusuk Card program. Secondary consumers: program leadership reading exported reports.

**Problem**: Public mentions of the Nusuk Card (Twitter/X and news sites) must be archived as compliance artifacts — screenshots that faithfully preserve original layout, fonts, and media. Manual archival takes ~3 minutes per post and is error-prone. v1 automated this to <20 seconds per URL but its reliability failures during peak Hajj forced fallback to manual — precisely when the tool is most needed.

**Cost of inaction**: Another Hajz season with unreliable capture, analyst frustration, and potential loss of compliance-relevant artifacts. Starting fresh with v2 costs engineering time (one-time ~430h Phase 1, solo, part-time over ~8 months) but eliminates the repeating-crisis tax.

## 3. Business Objectives

| ID | Objective | Target | Timeframe |
|----|-----------|--------|-----------|
| BO-1 | Eliminate OOM crashes during batch capture | Zero process-kill events on a 100-URL mixed batch (10 consecutive runs) | Before next Hajz peak |
| BO-2 | Consistent Arabic rendering | 100% golden-file test pass rate + manual weekly spot-check | v2 MVP |
| BO-3 | Observability | Every capture emits a structured JSON log line; `/api/metrics` exposes fallback-path distribution + memory timeline | v2 MVP |
| BO-4 | Preserve v1 UX | Every preserved feature (Section 6.1) works identically or better | v2 MVP |
| BO-5 | $0/month infrastructure cost | Recurring cash = $0 | Ongoing |

## 4. Market Analysis

### 4.1 Market Size

**N/A — internal tool, no revenue.**

### 4.2 Market Trends

**N/A — internal tool.** Relevant external trends (scraping legal landscape, ARM64 Linux tooling, free-tier hosting offerings) captured in Section 6.3 and Section 12.

### 4.3 Competitive Landscape

Reviewed only to confirm that no free alternative makes building redundant.

| Alternative | Type | Pricing | Why it doesn't replace v2 |
|---|---|---|---|
| Archive.today | Free web archive | $0 | Compromised Jan–Mar 2026 (DDoS relay, content tampering); untrustworthy for audit |
| Wayback Machine | Free historical crawl | $0 | No on-demand per-URL capture; not audit-oriented |
| Hunchly | Legal evidence capture | $100+/mo | Out of $0 budget |
| PageVault | Legal capture SaaS | $200+/mo | Out of $0 budget |
| Meltwater / Brand24 / Mention | Social listening | $500+/mo | Overkill; no audit-grade screenshot preservation |

### 4.4 Competitive Advantage

Not a product — not meaningful. The value over v1 and over manual is: **bilingual AR/EN audit-grade capture at $0 that actually stays up**, verified by CI gating on Arabic golden-file tests and backed by structured observability.

## 5. Target Audience

### 5.1 Primary Users

One (1) non-technical, Arabic-preferring PR/comms analyst at the Nusuk Card program.

### 5.2 User Personas

**Persona 1 — The Analyst**: Non-technical, Arabic-preferring, web + Excel literate. Pain: v1 crashes at scale; tofu squares on Arabic; blank video cards. Goal: deliver weekly mention reports on time with faithful screenshots. Current fallback: manual screenshots.

**Persona 2 — Program Leadership** (secondary): Consume weekly reports. Pain: late delivery when v1 fails. Goal: bilingual, trustworthy archives.

### 5.3 Audience Validation

v1 was in production during the last Hajz season; real usage validated both demand and the fact that reliability (not features) is the binding constraint. No further validation needed.

## 6. Scope

### 6.1 In Scope (per PRD Phase 1 unless noted)

**Phase 1 (MVP)**:
- URL paste + auto-detect (tweet / article); batch up to 100 URLs
- Tweet fallback chain: FxTwitter → oEmbed → Puppeteer embed page → Puppeteer direct (**Satori dropped** — confirmed no RTL support)
- News article capture via OG meta; auto-capture of linked articles from tweets
- Audit-grade screenshot with correct Arabic rendering
- Bilingual AR/EN UI with full RTL (AR default)
- Excel / PDF / ZIP export (single capture)
- Duplicate detection via normalized URL
- Soft-delete with 30-day recovery (`pg_cron` purge)
- TypeScript + Zod at all network boundaries
- Explicit `media_type` discriminated union (prevents v1's video-as-image bug)
- Single pooled browser manager + context recycling
- Structured pino logs + `/api/metrics` endpoint + 30s RSS sampling
- Golden-file screenshot test suite in CI (ARM64 parity via QEMU)

**Phase 2 (post-Hajz polish)**:
- Sentry free + Axiom free integration
- Dashboard stats
- Full-dataset ZIP backup/restore + weekly scheduled backup to GitHub Releases

### 6.2 Out of Scope

- **Instagram** (deprecated in v1; formally dropped in follow-up-1)
- **TikTok, Snapchat, Facebook, LinkedIn**
- **Multi-tenant / SaaS / RBAC / billing** (internal-only scope)
- **Automated keyword / timeline monitoring (BR-16)** — deferred indefinitely (X API read is paid post-2023; Puppeteer timeline scraping reintroduces OOM class + ToS risk; cost > value)
- **Mobile app** (web only)
- **Go-to-market / monetization** (no revenue model)

### 6.3 Approach Validation (from tech research + constraint validation)

| Decision | v1 | v2 | Verified by |
|---|---|---|---|
| Hosting | Render free 512 MB | **Oracle Cloud Always Free Ampere A1 Flex ARM64 (24 GB)** | [TECHNICAL_OPTIONS/01](TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md); [CONSTRAINT_VALIDATION/01](CONSTRAINT_VALIDATION/01-cumulative-performance.md) — 22.8 GB headroom |
| Browser engine | Puppeteer (duplicate singletons) | **Puppeteer + system Chromium on ARM64** (or `@sparticuz/chromium-min` v135+), single pooled manager, context recycling every N captures | Research verified ARM64 support path |
| Fonts | CSS injection at runtime, partial weight registration | **Pre-installed in Docker** (`fonts-noto-sans-arabic`, `fonts-kacst`) + `evaluateOnNewDocument` fallback injection + `document.fonts.ready` wait | [TECHNICAL_OPTIONS/02](TECHNICAL_OPTIONS/02-arabic-rendering.md) |
| Satori fallback card | In chain | **Removed** — confirmed no RTL support | [github.com/vercel/satori](https://github.com/vercel/satori) |
| Type safety | React 19 JSX, untyped Express | **TypeScript strict + Zod at all network boundaries + Supabase gen-types** | [TECHNICAL_OPTIONS/05](TECHNICAL_OPTIONS/05-type-safety.md) |
| Observability | Render OOM emails only | **pino structured JSON + `/api/metrics` + 30s RSS sampling**; Sentry + Axiom in Phase 2 | [TECHNICAL_OPTIONS/06](TECHNICAL_OPTIONS/06-observability.md) |

## 7. Business Requirements (updated)

| ID | Requirement | Priority | Phase | Change notes |
|----|-------------|----------|-------|--------------|
| BR-1 | Zero OOM crashes on 100-URL batch including video tweets | Must Have | P1 | Verified feasible — 22.8 GB headroom on Oracle ARM64 |
| **BR-2** | **Arabic glyph correctness: 100% on golden-file reference suite + manual spot-check of weekly report** | Must Have | P1 | **Reworded per constraint validation** — Chromium #4996 makes absolute 100% infeasible; golden-file + human spot-check is the verifiable criterion |
| BR-3 | Capture preserves original post layout, fonts, media | Must Have | P1 | — |
| BR-4 | Bilingual AR/EN UI with full RTL | Must Have | P1 | — |
| BR-5 | Excel/PDF/ZIP export (single capture) | Must Have | P1 | — |
| BR-6 | <20s median single capture; <30 min 100-URL batch | Must Have | P1 | Verified ~5-10 min blended batch |
| BR-7 | Soft-delete with 30-day recovery | Must Have | P1 | — |
| BR-8 | TypeScript + Zod at all network boundaries | Must Have | P1 | — |
| BR-9 | Structured logs + `/api/metrics` | Must Have | P1 (MVP); P2 adds Sentry + Axiom | Split into phases |
| BR-10 | Golden-file test suite gating deploys | Must Have | P1 | — |
| BR-11 | Duplicate detection on URL | Should Have | P1 | — |
| BR-12 | Auto-capture of linked articles inside tweets | Should Have | P1 | — |
| BR-13 | Dashboard stats | Should Have | **P2** | Deferred per capacity constraint |
| BR-14 | ZIP backup/restore + weekly scheduled backup | Should Have | **P2** | Deferred per capacity constraint |
| BR-15 | $0/month recurring infrastructure cash | Must Have | Ongoing | Satisfied across all 8 technical options |
| BR-16 | Automated keyword/timeline monitoring | Nice to Have → **Dropped** | — | X API paid + ToS risk + reintroduces OOM class |

## 8. Revenue Model

**N/A — internal tool, no revenue.** Sections 8.1 and 8.2 not applicable.

### 8.1 Pricing Strategy

N/A.

### 8.2 Revenue Projections

N/A.

## 9. Success Criteria

| ID | Metric | Target | Measurement | Timeframe |
|----|--------|--------|-------------|-----------|
| SC-1 | Batch capture reliability | 10 consecutive 100-URL mixed batches with zero process-kill events | Weekly E2E test harness | P1 launch + ongoing |
| SC-2 | Arabic golden-file pass rate | 100% on ≥8 reference cases per deploy | CI gate | P1 launch + ongoing |
| SC-3 | Single-capture latency | Median <20s, p95 <40s | `/api/metrics` aggregation | P1 launch + ongoing |
| SC-4 | Analyst confidence | 0 manual fallback usage during Hajz peak | Post-season interview | After next Hajz |
| SC-5 | Infrastructure cost | $0/month | Provider billing review | Monthly |
| SC-6 | Compliance documentation | X ToS posture doc + PDPL archival-basis record committed | Repo audit | Before P1 launch |

## 10. Risks & Mitigation

Extended with technical and capacity findings from tech research + constraint validation.

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|-------------|
| R-1 | Oracle Cloud Always Free signup blocked/unavailable in region | Medium | High | Fallback to Oracle x86 AMD free tier (2× 1-OCPU) or Render free via `render.yaml`; one env-var pivot; documented |
| R-2 | X ToS enforcement action | Low | High | Document capture-vs-scrape position; internal-only low-volume (~200/season); optional legal review |
| R-3 | Twitter structural change breaks fallback chain | Medium | Medium | Multi-path chain; observability catches quickly; FxTwitter + vxtwitter as redundant first-rank paths |
| R-4 | Arabic rendering regression slips past tests | Low | High | Golden-file CI gate; manual weekly spot-check; Chromium version pin |
| **R-5** | **CI (x64) ↔ Prod (ARM64) parity drift (CV-03)** | **Medium** | **High** | `docker buildx --platform linux/arm64` under QEMU in GitHub Actions; CI runs identical image to prod |
| R-6 | PDPL enforcement question | Low | Medium | `docs/compliance/pdpl-record.md`; region selection (prefer KSA, fallback EU-central); internal-only |
| **R-7** | **Solo-dev capacity shortfall (C-10, ratio 1.15)** | **Medium** | **Medium** | Phased delivery (P1 MVP defers F-11/F-12/F-13); commit to 15+ hrs/week; reconfirm Hajz target date |
| R-8 | FxTwitter/vxtwitter service outage | Low | Medium | Chain falls through to Puppeteer paths; observability tracks distribution |
| R-9 | Supabase free-tier feature removed (e.g., pg_cron) | Low | Medium | Substitute GitHub Actions cron; documented swap |

## 11. Assumptions & Dependencies

### Assumptions
- The analyst continues in role and continues needing weekly Nusuk reports
- Capture volume remains seasonal and bounded (~100–200 per Hajz season)
- Twitter/X keeps public web access to posts; FxTwitter and oEmbed remain functional
- Oracle Cloud Always Free tier remains available (or fallback options remain)
- Developer commits 15+ hrs/week over ~8 months

### Dependencies
- **Oracle Cloud Always Free** — primary host (fallback: Render free)
- **Supabase** — DB + Storage + pg_cron + Edge Functions (free tier)
- **FxTwitter + Twitter oEmbed** — third-party tweet-metadata services
- **Cloudflare Tunnel** — free TLS + origin hiding for PDPL posture
- **GitHub** — source, CI Actions, Container Registry, Release-asset backups
- **Docker base image** with `fonts-noto-sans-arabic` + `fonts-kacst` pre-installed
- **Node 20 LTS**, Puppeteer, Zod, pino (ecosystem stability)

## 12. Regulatory & Compliance

- **Twitter/X ToS (updated Sept 2023)**: explicitly prohibits crawling/scraping. v2 does **screenshot capture** (user-agent emulation), not data extraction. Distinction documented in `docs/compliance/x-tos.md`. Low volume reduces enforcement surface. Optional legal review ($0–500 one-off).
- **Saudi PDPL (effective Sept 14, 2024, enforced by SDAIA)**: permits processing for "archival purposes in the public interest / organizational interest." v2 qualifies if properly documented. Action: `docs/compliance/pdpl-record.md` captures the processing-activity record and lawful basis. Supabase region selected (prefer KSA; fallback EU-central).
- **Data sovereignty**: Cloudflare Tunnel hides origin IP; DB/Storage region configured to match compliance posture.

## 13. Estimated Budget Range

| Category | Low | High | Notes |
|---|---|---|---|
| Development (solo, part-time) | — | — | In-house; founder time imputed ~$2,500–3,500 at $40/hr KSA dev rate (not cash) |
| Infrastructure (ongoing) | **$0/mo** | **$0/mo** | Oracle Cloud Always Free (or Render fallback) + Supabase free tier + Cloudflare Tunnel free |
| CI/CD | $0 | $0 | GitHub Actions free tier |
| Error monitoring & logs | $0 | $0 | Sentry + Axiom free tiers (Phase 2) |
| Fonts / libraries | $0 | $0 | SIL OFL 1.1 (Noto Sans Arabic, Cairo) + MIT (all JS libs) |
| Legal review | $0 | $500 | One-off, optional |
| **Total (recurring)** | **$0/mo** | **$0/mo** | Satisfies BR-15 |

## 14. Technical Options Summary

Detailed analysis in [TECHNICAL_OPTIONS/](TECHNICAL_OPTIONS/README.md). Strategy: **build-heavy on free-tier infrastructure** — 8 capabilities, all chosen options $0/mo cash, no paid vendor dependencies.

| # | Capability | Recommendation | Approach | Year 1 Cash |
|---|---|---|---|---|
| 01 | Capture engine + hosting | Puppeteer + system Chromium on Oracle Cloud Always Free Ampere A1 Flex ARM64 | Build | $0 |
| 02 | Arabic / RTL rendering | OS-installed fonts in Docker (`fonts-noto-sans-arabic`, `fonts-kacst`); Satori dropped | Build | $0 |
| 03 | Tweet fallback chain | FxTwitter → oEmbed → Puppeteer embed → Puppeteer direct; `media_type` discriminated union | Build | $0 |
| 04 | Bilingual RTL UI | React 18 + Vite + TypeScript + Tailwind `rtl:` variants + react-i18next | Build | $0 |
| 05 | Type safety | TypeScript strict + Zod at boundaries + Supabase gen-types | Build | $0 |
| 06 | Observability | pino (MVP) → Sentry + Axiom (Phase 2) | Build / integrate free tiers | $0 |
| 07 | Export & backup | exceljs + Puppeteer `page.pdf()` + archiver | Build | $0 |
| 08 | Data lifecycle | Supabase Postgres + Storage + `pg_cron` | License free tier | $0 |

**Overall Strategy**: build-heavy. No paid vendors. $0/mo recurring cash across the stack.

## 15. Supporting Systems Summary

Detailed analysis in [SUPPORTING_SYSTEMS/](SUPPORTING_SYSTEMS/README.md). 5 systems apply (13 N/A for internal-only scope).

| # | System | Priority | Tool | Cash |
|---|---|---|---|---|
| 01 | Error monitoring & log aggregation | Essential | pino → stdout (MVP); Sentry + Axiom free (P2) | $0 |
| 02 | CI/CD | Essential | GitHub Actions | $0 |
| 03 | Scheduled jobs | Essential | Supabase `pg_cron` + GitHub Actions cron | $0 |
| 04 | Golden-file screenshot tests | Essential | Playwright `toHaveScreenshot` in prod Docker image | $0 |
| 05 | Deployment automation | Growth | Docker Compose + GitHub Actions SSH; Render `render.yaml` fallback | $0 |

N/A (single-user internal scope): RBAC, admin dashboard, billing, multi-tenancy, support, notifications, API management, content moderation, order mgmt, analytics (covered by `/api/metrics`), onboarding, settings, separate audit-logging.

## 16. Constraint Validation Summary

Detailed analysis in [CONSTRAINT_VALIDATION/](CONSTRAINT_VALIDATION/README.md). **Verdict: CONDITIONAL PASS.**

- **10 constraints** checked; **8 PASS**, **3 CONDITIONAL** (all documentation/wording), **1 WARNING** (C-10 capacity ratio 1.15, remediated via phasing)
- **3 compatibility issues**: 1 HIGH (CV-03 ARM64 CI parity — +4h remediation via `docker buildx` + QEMU), 2 MEDIUM (documentation)
- **No hard FAILs**. Proceed to implementation with the 6 conditions documented in `CONSTRAINT_VALIDATION/README.md` incorporated into the PRD.

## 17. Recommended Next Steps

1. **Confirm target Hajz date** to validate the 10-month part-time capacity assumption
2. **Sign up for Oracle Cloud Always Free**; provision the Ampere A1 Flex VM; verify region
3. **Create Supabase project**; select region; enable `pg_cron`
4. **Set up Cloudflare Tunnel** with domain for TLS + origin hiding
5. **Write `docs/compliance/x-tos.md`** (2h) and **`docs/compliance/pdpl-record.md`** (3h)
6. **Optional**: $0–500 legal review
7. **Start Phase 1 M1** per the PRD milestone plan (infra → capture pipeline → AR fonts → frontend → exports → observability → data lifecycle → compliance + UAT)
8. **Go/no-go at Phase 1 end**: confirm 10 consecutive clean batches, p95 <40s, 100% golden-file pass, and analyst completes one full weekly cycle without manual fallback
9. **Phase 2** (post-Hajz): add Sentry + Axiom, dashboard stats (BR-13), full backup/restore (BR-14)

---

*Final BRD generated 2026-04-15. All figures and technical decisions traceable to TECHNICAL_OPTIONS, SUPPORTING_SYSTEMS, BUSINESS_RESEARCH, and CONSTRAINT_VALIDATION folders. Year 1 recurring cash cost: $0.*
