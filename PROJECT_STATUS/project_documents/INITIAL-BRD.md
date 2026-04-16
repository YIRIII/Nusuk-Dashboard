# BRD: Nusuk Social Tracker v2 — Rebuild

**Version**: 1.0
**BRD Phase**: Initial
**Date**: 2026-04-15
**Status**: Draft
**Author**: Idea Forge (AI-Generated)
**ID**: IF-Y-002

> **Scope note — internal tool**: This idea is an internal-only rebuild. Sections typically focused on market sizing, revenue, and pricing (4.1, 4.2, 8) are intentionally marked N/A. The binding analysis is **Approach Validation** (Section 6.3) and **Regulatory** (Section 12). Downstream skills `/marketing-strategy` and `/pricing-strategy` can be skipped; `/business-research`, `/supporting-systems`, `/tech-research`, `/constraint-validation` remain relevant.

---

## 1. Executive Summary

Nusuk Social Tracker v2 is a ground-up rebuild of a production internal tool that archives public social-media posts and news articles mentioning the Nusuk Card (بطاقة نسك) — the Saudi Hajj digital pilgrim ID. The v1 tool proved the workflow (paste URL → audit-grade screenshot + metadata → bilingual Excel/PDF/ZIP report) saves ~3 minutes per post for a non-technical PR analyst compiling weekly reports for program leadership. However, v1 suffered chronic reliability failures — OOM crashes on batch captures (≥6 tweets on 512 MB Render free tier), intermittent Arabic font rendering, blank video-tweet cards, and zero observability — causing the analyst to revert to manual workflow during peak Hajj season.

v2's goal is not more features — it's **reliability at $0/month**. The hard constraint (no budget) rules out paying to escape the 512 MB limit, so v2 must solve the OOM root cause by moving to a more generous free tier (Oracle Cloud Always Free: 4 OCPU + 24 GB RAM forever) and engineering disciplined resource use (pooled browser manager, bundled fonts, TypeScript + Zod at boundaries, structured observability). Instagram — deprecated in v1 — is formally dropped. Scope is single-analyst internal use; no multi-tenancy, no RBAC, no billing.

Now is the right time because (a) the v1 pain points are well-documented, (b) a free-tier hosting option with 48× v1's RAM exists (Oracle Cloud Always Free), (c) Vercel Satori's confirmed lack of RTL support means v1's fallback chain has a silent bug that must be redesigned, and (d) the next Hajj season gives a natural deadline to ship before real usage resumes.

## 2. Problem Statement

**Who**: A single non-technical, Arabic-preferring PR/communications analyst at the Nusuk Card program. Secondary consumers: program leadership reading exported reports.

**Problem**: Public mentions of the Nusuk Card (on Twitter/X and news sites) must be archived as compliance artifacts — screenshots that faithfully preserve the original visual state (layout, fonts, media) of each post. The manual workflow is ~3 minutes per post and error-prone. v1 automated this to <20 seconds per URL, but its reliability failures during peak Hajj forced fallback to manual — negating its value at exactly the moment it matters most.

**Cost of inaction**: Continuing with v1 means another Hajj season with unreliable capture, analyst frustration, and potential loss of compliance-relevant artifacts when v1 OOM-crashes mid-batch. Starting from scratch with v2 costs engineering time but eliminates the repeating-crisis tax.

## 3. Business Objectives

| ID | Objective | Target | Timeframe |
|----|-----------|--------|-----------|
| BO-1 | Eliminate OOM crashes during batch capture | Zero crashes on a 100-URL batch including video tweets | Before next Hajj peak |
| BO-2 | Consistent Arabic rendering | 100% of AR-language captures render correct glyphs (verified by golden-file test suite) | v2 MVP |
| BO-3 | Observability & debuggability | Every capture produces a structured log line; `/api/metrics` endpoint exposes fallback-path distribution + memory timeline | v2 MVP |
| BO-4 | Preserve v1 UX | Every feature in v1's preserved feature list (see Section 6.1) works identically or better | v2 MVP |
| BO-5 | Stay within $0/month infrastructure budget | Recurring infra cost = $0 | Ongoing |

## 4. Market Analysis

### 4.1 Market Size

**N/A — internal tool, no revenue.** No TAM/SAM/SOM analysis performed by design.

### 4.2 Market Trends

**N/A — internal tool.** Relevant external trends (scraping legal landscape, free-tier hosting offerings, Arabic font tooling) are captured in Section 6.3 (Approach Validation) and Section 12 (Regulatory).

### 4.3 Competitive Landscape

Reviewed to confirm no free/cheap alternative would make building redundant.

| Alternative | Type | Pricing | Why it doesn't replace v2 |
|---|---|---|---|
| Archive.today | Free web archive | $0 | Compromised Jan–Mar 2026 (DDoS relay, content tampering); untrustworthy for audit |
| Wayback Machine | Free historical crawl | $0 | No on-demand per-URL capture; not audit-oriented |
| Hunchly | Legal evidence capture | $100+/mo | Out of $0 budget |
| PageVault | Legal capture SaaS | $200+/mo | Out of $0 budget |
| Meltwater / Brand24 / Mention | Social listening | $500+/mo | Overkill; no audit-grade screenshot preservation |

### 4.4 Competitive Advantage

Not a product — not meaningful. But the "competitive advantage" over the manual workflow and over v1 is: bilingual AR/EN audit-grade capture at $0 that actually stays up.

## 5. Target Audience

### 5.1 Primary Users

One (1) non-technical, Arabic-preferring PR/comms analyst at the Nusuk Card program.

### 5.2 User Personas

**Persona 1: The Analyst**
- Role: PR / communications analyst, Nusuk Card program
- Demographics: Non-technical, Arabic-preferring, comfortable with web browsers and Excel
- Pain Points: v1 crashes during batch captures; Arabic glyphs sometimes render as tofu squares; video tweets produce blank cards
- Goals: Deliver weekly mention reports on time with screenshots that faithfully preserve original post visuals
- Current Solutions: v1 (unreliable) + manual screenshot fallback

**Persona 2: Program Leadership (secondary)**
- Role: Consumers of the analyst's weekly reports
- Demographics: Senior decision-makers; read outputs, don't use the tool
- Pain Points: Reports arriving late when v1 breaks; questioning the authenticity of manually cropped screenshots
- Goals: Bilingual, well-formatted reports with verifiable archived posts
- Current Solutions: Whatever the analyst can produce

### 5.3 Audience Validation

v1 is in production. Real usage during the last Hajj season validated that (a) the workflow is needed and (b) reliability — not features — is the binding constraint. No additional validation research required.

## 6. Scope

### 6.1 In Scope

- **Core workflow**: Paste URL → auto-detect source (tweet / news article) → audit-grade screenshot + metadata extraction → categorize (Person / Company) → Excel/PDF/ZIP export
- **Sources**: Twitter/X (primary), news articles via OG meta (secondary)
- **Batch**: Up to 100 URLs per batch
- **Auto-capture** of external links referenced inside tweets
- **Duplicate detection** and **soft-delete with 30-day recovery**
- **Bilingual UI** (AR default + EN), full RTL
- **Export formats**: Excel (.xlsx), PDF, ZIP; ZIP backup/restore
- **Dashboard stats**
- **Tweet fallback chain** (re-implemented with types + tests): FxTwitter → Twitter oEmbed → Puppeteer embed page; **drop Satori fallback card** (doesn't support RTL — silent Arabic bug in v1)
- **v2-specific must-haves**: TypeScript end-to-end, Zod at all network boundaries, `media_type` discriminated union, single pooled browser manager, bundled fonts injected via `evaluateOnNewDocument`, pino structured logging, `/api/metrics` endpoint, RSS sampling every 30s, golden-file tests for Arabic rendering

### 6.2 Out of Scope

- **Instagram** capture (v1 had login-cookie scraping; officially dropped in v2)
- **TikTok, Snapchat, Facebook, LinkedIn** (not requested)
- **Multi-tenant / SaaS**: single-user internal tool only
- **Authentication / RBAC / billing**: not needed (single user, no external sharing)
- **Monitoring / automated keyword scanning**: v1 had this, disabled under free-tier constraint; remains disabled in v2
- **Mobile app**: web UI only
- **Marketing and pricing strategy**: internal tool, no GTM, no revenue model — `/marketing-strategy` and `/pricing-strategy` downstream skills can be skipped

### 6.3 Approach Validation

v1's architecture is challenged against alternatives to ensure v2 isn't a silent repeat of the same mistakes. Details in `RESEARCH.md`; summary here:

| Decision | v1 choice | v2 recommendation | Rationale |
|---|---|---|---|
| **Hosting** | Render free (512 MB, 15-min spin-down) | **Oracle Cloud Always Free** (4 OCPU + 24 GB RAM, lifetime) | 48× RAM; always-on; $0; fixes OOM at the tier, not just in code. Render free remains viable fallback if Oracle signup blocked |
| **Browser engine** | Puppeteer (duplicate singletons) | **Puppeteer + @sparticuz/chromium-min**, single pooled manager | Slim Chromium bundle (~50 MB); context recycling every N captures prevents memory leak; Playwright would buy ~30% less memory but no Arabic improvement, so switching cost > benefit |
| **Fonts** | Runtime CSS injection, partial weight registration | **Bundle fonts in Docker image** (`fonts-noto-sans-arabic`, `fonts-kacst`) + inject via `evaluateOnNewDocument` before navigation + `document.fonts.ready` wait | Pre-installed OS fonts + early injection = reliable Arabic render |
| **Satori fallback card** | Present in v1 fallback chain | **Remove from chain** | [Confirmed](https://github.com/vercel/satori): Satori doesn't support RTL — v1's fallback silently produced broken Arabic cards |
| **Type safety** | React 19 JSX, untyped Express | **TypeScript end-to-end + Zod at every network boundary** | Eliminates media_type/schema drift bugs surfaced in v1 (video URLs treated as images) |
| **Observability** | Render OOM emails only | **Pino structured JSON logs + `/api/metrics` + 30s RSS sampling** | v1 had no way to diagnose in-flight failures |

**Top risks flagged by research**:
1. Oracle Cloud Always Free signup requires credit card for verification and has known regional-availability variations — fall back to Render if blocked.
2. Hosted screenshot APIs (Browserless/Urlbox/SnapRender) were evaluated but either lack free tiers sufficient for batch peaks or don't confirm Arabic font support. Self-hosted is the safer default.
3. Satori replacement: v1's Satori was a last-resort card rendering when all else failed. Dropping it means accepting that tweets failing the full fallback chain produce no card. Acceptable at ~100–200 captures/season volume.

## 7. Business Requirements

| ID | Requirement | Priority | Rationale |
|----|------------|----------|-----------|
| BR-1 | Zero OOM crashes on 100-URL batch including video tweets | Must Have | Primary v1 failure mode; breaks trust in tool |
| BR-2 | Arabic glyphs render correctly in 100% of AR captures | Must Have | v1's intermittent font failures produced unusable audit artifacts |
| BR-3 | Capture preserves original post layout (fonts, media, formatting) | Must Have | Compliance/audit requirement |
| BR-4 | Bilingual AR/EN UI with full RTL layout | Must Have | Non-negotiable — government program context |
| BR-5 | Excel/PDF/ZIP export of archived captures | Must Have | Direct input to weekly reports |
| BR-6 | Single capture completes in <20 s; 100-URL batch in <30 min | Must Have | Matches v1's best-case performance |
| BR-7 | Soft-delete with 30-day recovery | Must Have | v1 UX preserved |
| BR-8 | TypeScript + Zod validation at all network boundaries | Must Have | Addresses v1 root cause for several bug classes |
| BR-9 | Structured logging + `/api/metrics` endpoint | Must Have | Enables diagnosis of future failures |
| BR-10 | Golden-file test suite for Arabic rendering | Must Have | Prevents regression on the hardest-to-notice failure mode |
| BR-11 | Duplicate detection on URL | Should Have | v1 UX preserved |
| BR-12 | Auto-capture of external links inside tweets | Should Have | Proven-value feature from v1 |
| BR-13 | Dashboard stats (counts by category, by source, by date) | Should Have | Minor value; straightforward to build |
| BR-14 | ZIP backup/restore of all archived captures + metadata | Should Have | Disaster recovery UX from v1 |
| BR-15 | `$0/month` infrastructure cost, ongoing | Must Have | Hard user-specified constraint |
| BR-16 | Automated keyword/timeline monitoring | Nice to Have | Disabled in v1 under free tier; re-enable only if Oracle Cloud capacity allows safely |

## 8. Revenue Model

**N/A — internal tool, no revenue.** Sections 8.1 and 8.2 not applicable.

### 8.1 Pricing Strategy

N/A.

### 8.2 Revenue Projections

N/A. (This is why `/pricing-strategy` is skippable downstream.)

## 9. Success Criteria

| ID | Metric | Target | Measurement Method | Timeframe |
|----|--------|--------|--------------------|-----------|
| SC-1 | Batch capture reliability | 100% completion rate on 100-URL mixed batch (tweets with video, AR-text, news links) | End-to-end test script, run weekly | v2 MVP + ongoing |
| SC-2 | Arabic font rendering correctness | 0 failures on golden-file test suite | CI gate on every deploy | v2 MVP + ongoing |
| SC-3 | Capture latency | Median single-capture <20 s; p95 <40 s | `/api/metrics` data aggregated weekly | v2 MVP + ongoing |
| SC-4 | Analyst confidence (qualitative) | Analyst stops using manual fallback during Hajj peak | Post-season interview | After next Hajj |
| SC-5 | Infrastructure cost | Exactly $0/month | Monthly billing review | Ongoing |

## 10. Risks & Mitigation

| ID | Risk | Probability | Impact | Mitigation Strategy |
|----|------|-------------|--------|---------------------|
| R-1 | Oracle Cloud Always Free signup blocked / region-unavailable | Medium | High | Fall back to Render free with aggressive browser recycling + media caps; document both deployment paths |
| R-2 | X (Twitter) scraping ToS enforcement action | Low (volume ~100–200/season) | High | Document capture-vs-scrape distinction; low volume; internal use only; legal review before production |
| R-3 | Twitter structural change breaks fallback chain (FxTwitter / oEmbed / embed page) | Medium | Medium | Observability catches it quickly; maintain multiple fallback paths; monitor FxTwitter status page |
| R-4 | Arabic rendering regression slips past tests | Low | High | Golden-file test suite on every deploy; manual spot-check as part of weekly report workflow |
| R-5 | $0 budget proves infeasible (Oracle Cloud quota breaches, unexpected traffic) | Low | Medium | Rate-limit at app level; capture volume is user-driven (bounded by analyst workflow); escalation path = temporary paid tier |
| R-6 | PDPL enforcement question on personal data in archived posts | Low | Medium | Document archival lawful basis; maintain processing activity record; internal-only reduces exposure |
| R-7 | Single analyst absent / bus factor | Medium | Low | Tool is simple enough for another non-technical user to pick up; documentation in AR + EN |

## 11. Assumptions & Dependencies

### Assumptions
- The single analyst user continues in role and continues needing weekly Nusuk mention reports
- Capture volume remains seasonal and bounded (~100–200 per Hajj season; quiet rest of year)
- Twitter/X does not close off public web access to posts entirely; FxTwitter and oEmbed remain functional
- Oracle Cloud Always Free tier remains available (no sudden termination of free tier)

### Dependencies
- Supabase free tier (500 MB DB, 1 GB Storage) — retained from v1, working
- Oracle Cloud Always Free or Render free — hosting
- FxTwitter, Twitter oEmbed — third-party fallback services for tweet data
- Docker base image with pre-installed Arabic fonts (`fonts-kacst`, `fonts-noto-sans-arabic`)
- Node.js + TypeScript, Puppeteer + @sparticuz/chromium-min, Zod, pino (ecosystem stability)

## 12. Regulatory & Compliance

- **Twitter/X ToS (updated Sept 2023)**: explicitly prohibits crawling/scraping without written consent; $15,000/1M posts penalty structure. v2 does *screenshot capture* (user-agent emulation), not data extraction; distinction to be documented and legally reviewed before production. Low volume (~100–200/season) reduces enforcement surface.
- **Saudi PDPL (effective Sept 14, 2024, enforced by SDAIA)**: permits processing for archival in public interest / organizational interest. Required: maintain processing activity record, document lawful basis. Internal-only use with no external sharing reduces risk. Public posts only — no auth-walled scraping.
- **Data sovereignty**: Supabase region should be set (if not already) to a geography acceptable under PDPL for Saudi-origin data.

## 13. Estimated Budget Range

| Category | Low | High | Notes |
|---|---|---|---|
| Development (re-implementation) | $0 | $0 | Done in-house by user/team — no external contractor cost planned |
| Infrastructure (ongoing) | $0/mo | $0/mo | Oracle Cloud Always Free (or Render free fallback) + Supabase free tier |
| Fonts / licenses | $0 | $0 | Noto Sans Arabic (SIL OFL 1.1, free) + Cairo (SIL OFL 1.1, free) |
| Error monitoring (optional) | $0 | $0 | BetterStack / Logtail / Axiom free tiers if needed; pino-to-stdout sufficient for MVP |
| Legal review (one-off) | $0 | $500 | Optional — recommend brief review of X ToS capture-vs-scrape position + PDPL basis documentation |
| **Total (recurring)** | **$0/mo** | **$0/mo** | — |

## 14. Technical Options Summary

> *Completed in the Final BRD phase after `/tech-research`. Blank for Initial BRD.*

## 15. Recommended Next Steps

1. **Skip `/customer-validation`** — single internal user already validated through v1 production usage.
2. **Skip `/domain-research`** — no methodology-dependent core; scraping is a means, not the domain.
3. Run **`/business-research`** — per-feature competitive analysis and feature prioritization (most BR-* line items should tier cleanly into Hero/Depth/Supporting/Skip).
4. Run **`/supporting-systems`** — expected minimal scope (no billing, no RBAC); confirm and document.
5. **Skip `/marketing-strategy`** and **`/pricing-strategy`** — internal tool, no GTM, no revenue.
6. Run **`/tech-research`** — critical stage. Validate the Oracle Cloud + Puppeteer + @sparticuz/chromium-min + bundled-fonts stack end-to-end; compare against the Render-free + hosted-API backup plan.
7. Run **`/constraint-validation`** — verify combined choices hit BR-1 (zero OOM on 100-URL batch), BR-2 (100% Arabic correctness), BR-6 (latency), BR-15 ($0/mo) simultaneously.
8. *(optional)* Run **`/risk-assessment`** — low stakes, likely skip.
9. Run **`/prd-generator`** to produce the PRD + Final BRD with concrete capability decisions.

---

*This BRD was generated by Idea Forge using real research data. All figures should be validated before making investment decisions.*
