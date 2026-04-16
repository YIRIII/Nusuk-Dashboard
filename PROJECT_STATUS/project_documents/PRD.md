# PRD: Nusuk Social Tracker v2 — Rebuild

**Version**: 1.0
**Date**: 2026-04-15
**Status**: Draft
**ID**: IF-Y-002
**Parent BRD**: [BRD.md](BRD.md)

---

## 1. Purpose

Deliver a reliability-first rebuild of the existing Nusuk Card social-media archival tool. v2 replaces the failure-prone v1 (React 19 JSX + Express + Puppeteer on Render 512 MB) with a TypeScript-end-to-end stack on Oracle Cloud Always Free (24 GB RAM), eliminating OOM and Arabic-rendering failures while holding recurring infrastructure cost at $0/month.

Scope is single-analyst internal use; **no** multi-tenant, authentication/RBAC, billing, or public-API surface area.

## 2. Goals & Success Metrics

Goals derived from BRD business objectives and constraint validation verdict.

| ID | Goal | Metric | Target | How measured |
|---|---|---|---|---|
| G-1 | Eliminate batch OOM crashes (BR-1) | Process-kill rate on 100-URL mixed batch | 0 kills across 10 consecutive test runs | Weekly E2E test harness |
| G-2 | Arabic rendering correctness (BR-2, reworded) | Golden-file suite pass rate | 100% on ≥8 AR reference cases per deploy | CI gate |
| G-3 | Capture latency (BR-6) | Median single-capture; 100-URL batch end-to-end | Median <20s; batch <30 min | `/api/metrics` endpoint aggregation |
| G-4 | Observability (BR-9) | Structured-log coverage of capture pipeline | 100% of capture requests emit a structured log line | Log volume vs. capture count |
| G-5 | $0/mo infrastructure cost (BR-15) | Monthly cash spend on hosting + SaaS | Exactly $0 | Monthly provider billing review |
| G-6 | Analyst confidence (BR-4 indirect) | Manual-fallback usage during Hajz peak | 0 manual screenshots | Post-Hajz interview |

## 3. User Stories (derived from BRD BR-* requirements)

Single primary persona: the PR/comms analyst.

| ID | Story | BRD link |
|---|---|---|
| US-1 | As the analyst, I paste a tweet URL and get a faithful screenshot + metadata in <20s, so I can archive mentions fast. | BR-1, BR-3, BR-6 |
| US-2 | As the analyst, I paste up to 100 URLs at once and the batch completes without crashes, so I can process a week of mentions in one sitting. | BR-1, BR-6 |
| US-3 | As the analyst, every Arabic post renders with correct glyphs, so my reports look professional. | BR-2 |
| US-4 | As the analyst, when I paste a tweet that links to a news article, both are captured automatically, so I don't track two rows manually. | BR-12 |
| US-5 | As the analyst, I export selected captures to Excel, PDF, or ZIP (Phase 1); and a full-dataset ZIP backup (Phase 2), so I can submit reports and recover from data loss. | BR-5, BR-14 |
| US-6 | As the analyst, duplicate URLs are detected so I don't recapture the same post. | BR-11 |
| US-7 | As the analyst, I can soft-delete mistakes and restore within 30 days, so I don't lose data to finger-slips. | BR-7 |
| US-8 | As the analyst, the UI is Arabic by default with RTL layout and an English toggle. | BR-4 |
| US-9 | As the developer (secondary user), every capture produces a structured log line and `/api/metrics` exposes performance + fallback-path distribution, so I can diagnose failures without guessing. | BR-9 |

## 4. Feature Specifications

All features reference the BRD's BR-* IDs and the technical options file that selected the implementation. Phase classification reflects constraint-validation conditions.

### F-1 — URL paste & auto-detection (Phase 1, Hero)

**BRD**: BR-1, BR-3, BR-6 · **Tier**: Hero · **Tech ref**: [TECHNICAL_OPTIONS/01](TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md), [03](TECHNICAL_OPTIONS/03-tweet-fallback-chain.md)

- User pastes one or more URLs; client parses and classifies each as `tweet` / `article` / `unknown` via URL pattern match.
- Server re-validates with Zod; classified `media_type` written to DB row before any fetch.
- Batch limit: 100 URLs per submission.

### F-2 — Tweet capture (fallback chain) (Phase 1, Hero)

**BRD**: BR-1, BR-3, BR-6 · **Tech ref**: [TECHNICAL_OPTIONS/03](TECHNICAL_OPTIONS/03-tweet-fallback-chain.md)

- Order: FxTwitter → Twitter oEmbed → Puppeteer on embed page → Puppeteer on tweet URL direct.
- Satori dropped from chain (no RTL support).
- Each attempt logs its outcome; successful path wins and the rest are skipped.
- `media_type` discriminated union prevents v1's video-as-image bug.

### F-3 — News article capture (Phase 1, Depth)

**BRD**: BR-3, BR-12 · **Tech ref**: [TECHNICAL_OPTIONS/03](TECHNICAL_OPTIONS/03-tweet-fallback-chain.md)

- Puppeteer navigates article URL; waits for `document.fonts.ready` with 3s timeout.
- Extracts OG meta (`og:title`, `og:description`, `og:image`) via `open-graph-scraper`.
- Auto-captures linked articles discovered inside tweets (parent-child relation via `parent_post_id`).

### F-4 — Arabic/RTL screenshot rendering (Phase 1, Hero)

**BRD**: BR-2 (reworded), BR-10 · **Tech ref**: [TECHNICAL_OPTIONS/02](TECHNICAL_OPTIONS/02-arabic-rendering.md), [SUPPORTING_SYSTEMS/04](SUPPORTING_SYSTEMS/04-golden-file-testing.md)

- Docker image pre-installs `fonts-noto-sans-arabic` and `fonts-kacst` at `/usr/share/fonts/TTF`, runs `fc-cache -f`.
- Puppeteer launches with `--font-render-hinting=none` and `--lang=ar-SA`.
- Before `page.goto`: inject font-face definitions via `evaluateOnNewDocument` (belt-and-suspenders over OS install).
- After navigation: `await page.waitForFunction(() => document.fonts.check('1em "Noto Sans Arabic"'))` with 3s timeout.
- **Golden-file tests** (Playwright `toHaveScreenshot`) run in the production Docker image in CI; deploy blocked on any baseline mismatch.
- **Reworded acceptance** (per constraint-validation): 100% golden-file pass + manual spot-check of weekly report. Chromium shaping bug (#4996) is an irreducible residual.

### F-5 — Metadata extraction (Phase 1)

**BRD**: BR-3 · **Tech ref**: [TECHNICAL_OPTIONS/03](TECHNICAL_OPTIONS/03-tweet-fallback-chain.md), [08](TECHNICAL_OPTIONS/08-data-lifecycle.md)

- Extract: username, post_text, post_date, media URLs + types, linked URLs.
- All extracted fields pass through a Zod schema before insert.
- Storage: JSONB `metadata` column on `posts` table; structured, queryable.

### F-6 — Duplicate detection (Phase 1)

**BRD**: BR-11 · **Tech ref**: [TECHNICAL_OPTIONS/08](TECHNICAL_OPTIONS/08-data-lifecycle.md)

- `normalizeUrl()`: lowercase host, strip fragment, strip `utm_*` + `si`/`t`/`ref_*`, canonicalize `twitter.com` → `x.com`, strip `/photo/N`.
- Unique partial index: `posts_normalized_url_active_uq on posts (normalized_url) where deleted_at is null`.
- UI shows "already captured on YYYY-MM-DD" when a duplicate is detected.

### F-7 — Soft-delete + 30-day recovery (Phase 1)

**BRD**: BR-7 · **Tech ref**: [TECHNICAL_OPTIONS/08](TECHNICAL_OPTIONS/08-data-lifecycle.md), [SUPPORTING_SYSTEMS/03](SUPPORTING_SYSTEMS/03-scheduled-jobs.md)

- Delete sets `deleted_at = now()`; filtered views hide deleted rows.
- `pg_cron` nightly at 03:00 UTC purges rows with `deleted_at < now() - 30 days`.
- Supabase Edge Function deletes orphaned Storage objects on purge.

### F-8 — Bilingual AR/EN UI with RTL (Phase 1)

**BRD**: BR-4 · **Tech ref**: [TECHNICAL_OPTIONS/04](TECHNICAL_OPTIONS/04-bilingual-rtl-ui.md)

- React 18 + Vite + TypeScript + Tailwind `rtl:` variants + `react-i18next`.
- `<html lang>` + `<html dir>` toggled at app root; localStorage persists user preference.
- `Intl.DateTimeFormat('ar-SA-u-nu-latn')` for date display.

### F-9 — Export to Excel / PDF / ZIP (Phase 1)

**BRD**: BR-5 · **Tech ref**: [TECHNICAL_OPTIONS/07](TECHNICAL_OPTIONS/07-export-and-backup.md)

- **Excel**: `exceljs` with `workbook.views = [{ rightToLeft: true }]` and per-cell `alignment: { readingOrder: 'rtl' }` for AR columns.
- **PDF**: Puppeteer `page.pdf()` in the same pooled browser context (inherits Arabic font embedding).
- **ZIP**: `archiver` streams screenshots + metadata JSON + Excel into a single download.

### F-10 — Structured observability + `/api/metrics` (Phase 1)

**BRD**: BR-9 · **Tech ref**: [TECHNICAL_OPTIONS/06](TECHNICAL_OPTIONS/06-observability.md), [SUPPORTING_SYSTEMS/01](SUPPORTING_SYSTEMS/01-error-monitoring.md)

- `pino` emits JSON per request with trace_id, capture_url, media_type, fallback_path, fallback_path_used, duration_ms, rss_before/after/delta, outcome.
- `setInterval(() => logger.info({ rss: process.memoryUsage().rss }), 30_000)` background memory sampler.
- `/api/metrics` endpoint (token-auth) returns 24h aggregates as JSON.

### F-11 — Dashboard stats (Phase 2)

**BRD**: BR-13 · **Tech ref**: [TECHNICAL_OPTIONS/08](TECHNICAL_OPTIONS/08-data-lifecycle.md)

- Postgres view or RPC returning counts by category / source / date-bucket.
- SWR / TanStack Query with 60s client cache.
- Deferred to Phase 2 per capacity constraint (C-10 remediation).

### F-12 — ZIP backup/restore (Phase 2)

**BRD**: BR-14 · **Tech ref**: [TECHNICAL_OPTIONS/07](TECHNICAL_OPTIONS/07-export-and-backup.md), [SUPPORTING_SYSTEMS/03](SUPPORTING_SYSTEMS/03-scheduled-jobs.md)

- User-triggered full backup: all rows + all Storage objects → single ZIP.
- Weekly scheduled backup via GitHub Actions cron → private GitHub Release asset.
- Restore: Zod-validate `metadata.json` → upsert rows → re-upload PNGs.

### F-13 — External error tracking & log aggregation (Phase 2)

**BRD**: BR-9 extension · **Tech ref**: [SUPPORTING_SYSTEMS/01](SUPPORTING_SYSTEMS/01-error-monitoring.md)

- Sentry free tier SDK for uncaught exceptions (5K errors/mo).
- `pino-axiom` transport to Axiom free tier for 30-day log retention.

### Explicitly out of scope (dropped from v1)

- **Instagram capture**: dropped in follow-up-1; not rebuilt.
- **Automated Twitter keyword monitoring (BR-16)**: X API read access is paid post-2023 ToS change; Puppeteer timeline scraping reintroduces v1's OOM class + ToS exposure. Deferred indefinitely.
- **Satori server-side card rendering**: no RTL support; removed from fallback chain.

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Choice | Rationale / ref |
|---|---|---|
| Host | Oracle Cloud Always Free Ampere A1 Flex ARM64 (24 GB RAM) | [TECHNICAL_OPTIONS/01](TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md) — 48× v1 RAM headroom at $0 |
| Fallback host | Render free (via `render.yaml`) | [TECHNICAL_OPTIONS/01](TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md) — one-env-var pivot if Oracle blocked |
| OS / container | Ubuntu 22.04 aarch64 + Docker Compose | Portable between Oracle and Render |
| Node runtime | Node 20 LTS | Stable through 2026 |
| Language | TypeScript strict, `noUncheckedIndexedAccess` | [TECHNICAL_OPTIONS/05](TECHNICAL_OPTIONS/05-type-safety.md) |
| Backend framework | Express + Zod | [TECHNICAL_OPTIONS/05](TECHNICAL_OPTIONS/05-type-safety.md) |
| Headless browser | Puppeteer + **system Chromium** (`apt install chromium`; `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`) | [TECHNICAL_OPTIONS/01](TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md) — bundled Chromium is x64-only; system Chromium runs on ARM64 |
| Fonts (AR) | `fonts-noto-sans-arabic` + `fonts-kacst` pre-installed in Docker image | [TECHNICAL_OPTIONS/02](TECHNICAL_OPTIONS/02-arabic-rendering.md) |
| Frontend | React 18 + Vite + TypeScript + Tailwind (`rtl:` variants) + `react-i18next` | [TECHNICAL_OPTIONS/04](TECHNICAL_OPTIONS/04-bilingual-rtl-ui.md) |
| DB + Storage | Supabase free tier (Postgres, Storage, pg_cron, Edge Functions) | [TECHNICAL_OPTIONS/08](TECHNICAL_OPTIONS/08-data-lifecycle.md) |
| Exports | `exceljs`, `archiver`, Puppeteer `page.pdf()` | [TECHNICAL_OPTIONS/07](TECHNICAL_OPTIONS/07-export-and-backup.md) |
| Logger | `pino` (JSON) | [TECHNICAL_OPTIONS/06](TECHNICAL_OPTIONS/06-observability.md) |
| Error tracker (P2) | Sentry free | [SUPPORTING_SYSTEMS/01](SUPPORTING_SYSTEMS/01-error-monitoring.md) |
| Log aggregation (P2) | Axiom free (via `pino-axiom`) | [SUPPORTING_SYSTEMS/01](SUPPORTING_SYSTEMS/01-error-monitoring.md) |
| CI/CD | GitHub Actions + ghcr.io + Docker Compose + SSH deploy | [SUPPORTING_SYSTEMS/02](SUPPORTING_SYSTEMS/02-ci-cd.md) |
| Visual tests | Playwright `toHaveScreenshot` in prod Docker image | [SUPPORTING_SYSTEMS/04](SUPPORTING_SYSTEMS/04-golden-file-testing.md) |
| Scheduled jobs | Supabase `pg_cron` (purge) + GitHub Actions cron (weekly backup) | [SUPPORTING_SYSTEMS/03](SUPPORTING_SYSTEMS/03-scheduled-jobs.md) |
| Network access | Cloudflare Tunnel (free) for TLS + origin hiding | PDPL posture; hides Oracle VM IP |

### 5.2 Data Model (core)

```
posts (
  id uuid pk,
  normalized_url text not null,
  source_type ['tweet'|'article'],
  media_type ['text_only'|'image'|'video'|'gif'|'link_card'|'article'],
  captured_at timestamptz,
  category ['person'|'company'],
  username text, post_text text, post_date date,
  screenshot_path text,
  metadata jsonb,
  parent_post_id uuid refs posts(id),
  deleted_at timestamptz
)
unique index on (normalized_url) where deleted_at is null
```

### 5.3 Capture Request Flow

```
Client → POST /api/captures { urls: string[] }
  → Zod-validate payload
  → For each URL (sequential, with browser recycle every 25):
    → normalizeUrl → duplicate check → insert posts row (media_type='text_only' initially)
    → run fallback chain → FxTwitter → oEmbed → Puppeteer(embed) → Puppeteer(direct)
    → on success: upload screenshot to Supabase Storage, update row
    → log structured outcome
  → Return array of capture IDs + outcomes
```

### 5.4 Integrations

- **Supabase** (DB + Storage + pg_cron): free tier, no paid account.
- **FxTwitter** (`fxtwitter.com`): free third-party tweet-metadata service; watch for outages.
- **Twitter oEmbed** (`publish.twitter.com/oembed`): public endpoint, rate-limited.
- **GitHub** (Actions + ghcr.io + Releases for backup storage): free tier.
- **Cloudflare** (Tunnel): free tier.
- **Oracle Cloud** (Always Free VM): free tier with credit-card verification.

## 6. Non-Functional Requirements

| ID | NFR | Target | Traceability |
|---|---|---|---|
| NFR-1 | Reliability | 0 process-kill events per 100-URL batch | BR-1 |
| NFR-2 | Latency | Median single capture <20s, p95 <40s; 100-URL batch <30 min | BR-6 |
| NFR-3 | Correctness (AR) | 100% golden-file suite pass + manual weekly spot-check | BR-2 (reworded) |
| NFR-4 | Availability | Best-effort; no formal SLA. Daily health check alerts. | — |
| NFR-5 | Cost | $0/mo recurring cash | BR-15 |
| NFR-6 | Compliance | PDPL archival basis documented; X ToS capture-vs-scrape position documented | BRD §12 |
| NFR-7 | Data retention | Soft-deleted rows purged after 30 days | BR-7 |
| NFR-8 | Type safety | 0 `any` in application code; Zod validation at all network boundaries | BR-8 |

## 7. Milestones / Phased Delivery

Per constraint-validation C-10 remediation: phased delivery to stay within the ~600h available at 15 hrs/week for 10 months.

### Phase 1 — MVP (target: ~430h, ~8 months @ 15 hr/week)

**Ship before next Hajz peak.** Includes all Hero + Depth + essential Supporting features.

- M1 (weeks 1–2): Infra setup — Oracle VM, Docker, Cloudflare Tunnel, Supabase project, DB schema migration
- M2 (weeks 3–6): Capture pipeline — pooled browser manager + fallback chain + media_type + URL normalization
- M3 (weeks 5–8, parallel): Arabic font infrastructure + golden-file test baseline + CI setup (incl. ARM64 QEMU per CV-03)
- M4 (weeks 7–12): Frontend rebuild — React 18 + Vite + bilingual UI + capture forms + dashboard
- M5 (weeks 11–14): Exports — Excel (RTL-aware) + PDF via `page.pdf()` + single-capture ZIP
- M6 (weeks 13–16): Observability MVP — pino structured logs + `/api/metrics` endpoint + 30s RSS sampler
- M7 (weeks 15–18): Data lifecycle — soft-delete, pg_cron purge, duplicate detection
- M8 (weeks 17–20): Compliance docs (CV-01 + CV-02), runbook, UAT with analyst

**Phase 1 features**: F-1 through F-10. **Out of Phase 1**: F-11 (dashboard stats), F-12 (full backup/restore), F-13 (Sentry/Axiom).

### Phase 2 — Polish (target: ~90h, post-Hajz)

- M9: Sentry free SDK integration
- M10: Axiom free via `pino-axiom` transport
- M11: Dashboard stats (F-11)
- M12: Full-dataset ZIP backup/restore + GitHub Actions weekly backup (F-12)

### Explicitly deferred indefinitely
- Automated keyword monitoring (BR-16) — ToS + reliability costs exceed value.
- Instagram capture — out of scope.
- Multi-tenant / RBAC / billing — internal-only scope.

## 8. Development Critical Path

Solo developer, sequential dependencies:

```
M1 Infra → M2 Capture pipeline → {M3 AR fonts, M4 Frontend} (parallel-ish on one dev)
                              → M5 Exports → M6 Observability → M7 Data lifecycle → M8 Compliance + UAT
                              → Ship Phase 1
                              → M9-M12 Phase 2
```

Longest sequential chain (one developer): M1 (16h) + M2 (80h) + M3 (30h, can interleave with M2 tail) + M4 (80h) + M5 (40h) + M6 (16h) + M7 (20h) + M8 (16h) + integration/buffer (~132h) ≈ **430h Phase 1**.

## 9. Risks & Mitigation

Extends BRD Section 10 with technical implementation risks discovered during tech-research and constraint-validation.

| ID | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Oracle Cloud signup blocked in region | Medium | High | Fallback to Oracle x86 AMD free tier or Render free via `render.yaml`; documented |
| R-2 | X ToS enforcement action | Low | High | Capture-vs-scrape position doc; low volume (~200/season); internal use |
| R-3 | Twitter structure change breaks fallback chain | Medium | Medium | Multi-path chain; observability catches quickly; FxTwitter + vxtwitter as redundant first-rank |
| R-4 | AR rendering regression slips past tests | Low | High | Golden-file CI gate; manual weekly spot-check; Chromium version pin |
| **R-5** | **CI (x64) ↔ Prod (ARM64) parity drift** (CV-03) | **Medium** | **High** | `docker buildx --platform linux/arm64` under QEMU in GitHub Actions; CI runs identical Docker image to prod |
| R-6 | PDPL enforcement question | Low | Medium | `docs/compliance/pdpl-record.md`; region selection; internal only |
| R-7 | Solo-dev capacity shortfall (C-10, ratio 1.15) | Medium | Medium | Phased delivery; defer F-11/F-12/F-13 to Phase 2 |
| R-8 | FxTwitter / vxtwitter service outage | Low | Medium | Chain falls through to Puppeteer-direct; observability tracks path distribution |
| R-9 | Supabase free-tier feature removed (e.g., pg_cron) | Low | Medium | Substitute GitHub Actions cron; documented swap |

## 10. Open Questions & Pre-Build Tasks

Tasks to resolve before or during Phase 1 M1 (infra):

- [ ] **Confirm Hajz target date** to validate 10-month timeline assumption
- [ ] **Sign up for Oracle Cloud Always Free** and verify Ampere A1 Flex provisioning succeeds in target region (fallback: x86 AMD free or Render)
- [ ] **Select Supabase region** (prefer KSA; fall back to EU-central)
- [ ] **Set up Cloudflare Tunnel** and domain
- [ ] **Write `docs/compliance/x-tos.md`** (capture-vs-scrape position, 2h)
- [ ] **Write `docs/compliance/pdpl-record.md`** (processing-activity record, 3h)
- [ ] **Optional**: $0–500 legal review of compliance posture

## 11. Success Criteria (Go/No-Go at Phase 1 end)

Before declaring Phase 1 complete and using the tool for real reporting:

1. 10 consecutive 100-URL E2E test runs with **0 process kills** and **0 golden-file regressions**
2. p95 single-capture latency <40s over 100 captures of varied content
3. Analyst completes one full weekly-report cycle using v2 only (no manual fallback)
4. `/api/metrics` data confirms fallback-path distribution matches expectations (~85% FxTwitter primary)
5. Compliance documents (X ToS posture, PDPL record) reviewed and committed
