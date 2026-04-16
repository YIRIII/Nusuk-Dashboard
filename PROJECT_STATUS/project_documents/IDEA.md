# Nusuk Social Tracker v2 — Rebuild

| Field | Value |
|-------|-------|
| **ID** | `IF-Y-002` |
| **Slug** | `nusuk-social-tracker-v2` |
| **Status** | `prd-complete` |
| **Constraint Validation** | [CONSTRAINT_VALIDATION/](CONSTRAINT_VALIDATION/README.md) |
| **PRD** | [PRD.md](PRD.md) |
| **Technical Options** | [TECHNICAL_OPTIONS/](TECHNICAL_OPTIONS/README.md) |
| **Business Research** | [BUSINESS_RESEARCH/](BUSINESS_RESEARCH/README.md) |
| **Supporting Systems** | [SUPPORTING_SYSTEMS/](SUPPORTING_SYSTEMS/README.md) |
| **Created** | 2026-04-15 |
| **Category** | Internal Tooling / Social Archival |
| **Stage** | Rebuild of existing v1 (production, pain points documented) |
| **Tags** | nusuk, hajj, social-archival, scraping, bilingual, rebuild |
| **BRD** | [BRD.md](BRD.md) (Final) · [INITIAL-BRD.md](preparation/INITIAL-BRD.md) |
| **PRD** | — |

## One-Liner

Rebuild of the Nusuk Card social media archival tool — same purpose, done right: a bilingual internal web app that turns pasted social/news URLs into durable, audit-grade screenshots and metadata for weekly PR reports.

## Problem Statement

A non-technical PR/communications analyst tracks public mentions of the Nusuk Card (بطاقة نسك) — the Saudi Hajj digital pilgrim ID — across Twitter/X and news sites. The manual workflow is ~3 minutes per post (search → copy → screenshot → file into folders). v1 automated this down to <20 seconds per URL, but suffered chronic reliability bugs: OOM crashes on batch captures (≥6 tweets), intermittent Arabic font rendering, blank video-tweet cards, and zero observability. The analyst lost confidence in the tool and fell back to manual work during peak Hajj season.

## Target Audience

**Primary user**: Internal PR/comms analyst (non-technical, Arabic-preferring) compiling weekly Nusuk mention reports for program leadership.

**Secondary users**: Program leadership reading exported reports (Excel, PDF, ZIP archives).

## Existing Solutions

- **v1 of this tool** (the thing being rebuilt) — React 19 JSX + Express + Puppeteer + Supabase on Render free tier. Works when it works, but crashes under batch load.
- **Social listening platforms** (Meltwater, Brand24, Mention, Talkwalker) — overkill, expensive, and don't produce audit-grade screenshots that preserve original layout/fonts/media.
- **Manual screenshotting** (the fallback) — slow and error-prone, but what the analyst reverts to when v1 fails.

To be researched further during BRD phase.

## Initial Thoughts

**Preserve from v1 (proven):**
- URL paste → auto-detect source type (tweet / Instagram / article)
- Screenshot + metadata extraction (username, text, date, media)
- Auto-capture of linked articles from tweets
- Single + batch capture (up to 100 URLs)
- Duplicate detection
- Soft-delete with 30-day recovery
- Bilingual EN/AR UI with full RTL
- Excel, PDF, ZIP exports + ZIP backup/restore
- Dashboard stats
- Tweet fallback chain: FxTwitter → Twitter oEmbed → Puppeteer embed page → server-rendered Satori card

**Fix in v2:**
- TypeScript on both client and server; Zod validation at every network boundary
- Explicit `media_type` discriminated union in schema (stops videos being treated as images)
- Single pooled browser manager (no more duplicate Puppeteer singletons)
- Bundled fonts in the app (`.ttf`) injected via `evaluateOnNewDocument` before navigation; poll `document.fonts.check` with timeout; register all weights for Satori fallback
- Cap image fetches at 2 MB; fetch video thumbnails only; recycle browser every N captures
- Structured JSON logging (pino) with RSS sampling every 30s; `/api/metrics` endpoint tracking capture duration + fallback-path distribution
- Golden-file screenshot tests for Arabic rendering regression detection
- Move off Render 512 MB free tier if root-cause analysis confirms the constraint is the real bottleneck (to be validated in `/tech-research`)

## Monetization Idea

Currently internal-only — no monetization. Productization (SaaS for Saudi gov comms teams / brands tracking government service mentions) is a possible v3 path but out of scope for this rebuild. To be revisited in `/marketing-strategy`.

## Known Constraints

- **Languages**: Arabic + English with full RTL layout — non-negotiable (government service, bilingual audience).
- **Scale**: Seasonal. Peaks at ~100–200 posts per Hajj season (2-month Islamic-calendar window), quiet rest of year.
- **Platforms scraped**: Twitter/X (primary), news articles (via OG meta tags). Instagram was present in v1 but deprecated mid-way (login cookies abandoned) — keep/drop decision pending.
- **Legal**: Public posts only. No scraping behind auth walls.
- **Budget**: v1 ran on $0/mo (Render free + Supabase free). Free tier was the root cause of most crashes — revised envelope is a key open decision for the BRD.
- **Audit grade**: Screenshots must preserve original layout, fonts, and media exactly (not summaries) — these are compliance artifacts.

## References & Inspiration

- v1 source docs: `/Users/yiri/Desktop/Projects/Nusuk-Dashboard/docs/` — `ARCHITECTURE.md`, `BRD.md`, `PRD.md`, `Features.md`, `CHALLENGES.md` (especially `CHALLENGES.md` for the pain-point inventory that drives v2 requirements).
- v1 stack: React 19 (JSX) + Vite + Express + Puppeteer + Supabase + Render.
- Fallback chain references: FxTwitter, Twitter oEmbed API, Satori (server-side React → SVG/PNG).

## Resolved Decisions (Follow-Up 1 — 2026-04-15)

- **Budget envelope**: **$0/month** — stay on free tier. v2 must solve OOM through engineering discipline (browser recycling, media size caps, video-thumbnail-only fetching, possibly streaming/worker offload), not by throwing money at a bigger instance. This is a hard constraint for `/tech-research` and `/constraint-validation`.
- **Instagram**: **Dropped.** v2 scrapes Twitter/X + news articles only. Remove Instagram code paths entirely.
- **Scope**: **Internal-only.** Single analyst, no RBAC, no billing, no multi-tenant. `/supporting-systems` can skip admin/billing/auth systems. `/marketing-strategy` and `/pricing-strategy` are effectively skippable (no go-to-market, no revenue).

## Open Questions (carried forward)

1. **Screenshot engine choice** — stay with Puppeteer, or evaluate Playwright / Browserless / ScrapFly / Urlbox in `/tech-research`? Especially relevant given the $0 budget constraint — free hosted APIs may outperform self-hosted headless Chrome on 512 MB.
2. **Deployment target** — Render free vs Fly.io free vs alternative free tier? Decide after `/tech-research`.
3. **Worker offloading** — does batch capture warrant a separate free-tier worker process (e.g., Cloudflare Workers, Vercel cron) to avoid competing with the main web process for 512 MB?

## Next Steps

- [x] Complete follow-up questionnaire (budget, Instagram, scope) — `preparation/follow-up-1.html` *(2026-04-15)*
- [ ] Conduct market research (`/brd-generator`)
- [ ] Generate BRD
- [ ] Run `/business-research` → `/supporting-systems` → `/marketing-strategy` → `/tech-research` → `/pricing-strategy` → `/constraint-validation`
- [ ] Generate PRD (`/prd-generator`)
