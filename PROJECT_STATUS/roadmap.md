# Roadmap — Nusuk Social Tracker v2
**Generated from:** /Users/yiri/Desktop/Projects/Idea-Forge/ideas/nusuk-social-tracker-v2 | **Research Tier:** A
**Last Updated:** 2026-04-18 | **Next:** 1.5 golden-file baselines (blocked on Docker prod image) or 4.x exports

## Phase 0: Project Foundation ✅
- [x] **0.1:** Initialize repo (TS strict, monorepo with `src/` + `web/`, Vite, Express) → [plan](docs/planning/phase-0-foundation.md)
- [x] **0.2:** Dockerfile with Arabic fonts pre-installed (noto-sans-arabic + kacst) — _build verifies in CI (step 0.8)_
- [x] **0.3:** Supabase schema migration (posts, captures, purge_log, normalize_url fn, pg_cron 30-day purge) — _project provisioning gated on KI-006 Oracle region_
- [x] **0.4:** pino logger module + trace-id middleware + `/health` + `/api/metrics` stub
- [x] **0.5:** Zod validation middleware + `db/types.ts` placeholder + `gen:supabase-types` script
- [x] **0.6:** Tailwind + shadcn/ui (Button) + react-i18next AR/EN + locale toggle + light+dark tokens
- [x] **0.7:** Design system doc at `docs/technical/design-system.md`
- [x] **0.8:** GitHub Actions CI with `docker buildx --platform linux/arm64,linux/amd64` QEMU (addresses CV-03)
- [x] **0.9:** Compliance docs: PDPL processing record + X ToS posture (addresses C-08, C-09)
- [x] **0.10:** Oracle VM provisioning runbook + `scripts/ops/bootstrap.sh` + systemd units — _actual VM creation blocked on KI-006_
- [x] **0.11:** CLAUDE.md created referencing design system, pipeline, conventions, Arabic threshold wording

## Phase 1: Capture Engine + Arabic Rendering (HERO) 🚧 _(partial — code ready; baselines deferred until Docker prod image runs)_
- [x] **1.1:** Puppeteer + system Chromium capture service → [plan](docs/planning/phase-1-capture-hero.md) (`src/src/capture/puppeteer-service.ts`)
- [x] **1.2:** Browser pool management via `generic-pool` (min 1, max 2, destroy-on-error)
- [x] **1.3:** Chromium launch flags centralized in `src/src/capture/chromium.ts`
- [x] **1.4:** Arabic golden-file test harness (Playwright `toHaveScreenshot`, `playwright.config.ts`, CI ARM64 parity)
- [ ] **1.5:** Baseline PNGs — generated once on prod Docker image (see `tests/golden/README.md`)
- [x] **1.6:** `POST /api/capture` endpoint (`src/src/routes/capture.ts`)

## Phase 2: Fallback Chain + Audit-Grade Capture ✅
- [x] **2.1:** FxTwitter fetcher (primary, <1s, 95% success) → [plan](docs/planning/phase-2-fallback-chain.md)
- [x] **2.2:** Twitter oEmbed fallback (secondary)
- [x] **2.3:** Puppeteer embed-page fallback (tertiary)
- [x] **2.4:** `media_type` discriminated union (image / video / gif / none) — prevents v1's video-as-image bug
- [ ] **2.5:** News article OG/meta extractor — _deferred; v1 data has only tweet URLs so far_
- [ ] **2.6:** Linked-article auto-capture (tweet → linked URL → second capture) — _deferred with 2.5_
- [x] **2.7:** Batch `POST /capture` (1–100 URLs, queued)

## Phase 3: Bilingual UI + Data Lifecycle ✅
- [x] **3.1:** URL paste screen (1–100 URLs, client-side Zod validation) → [plan](docs/planning/phase-3-ui-lifecycle.md)
- [x] **3.2:** Capture results screen (metadata + screenshot thumbnails)
- [x] **3.3:** Locale toggle (AR default, localStorage) + RTL/LTR swap
- [x] **3.4:** Duplicate detection via normalized-URL unique index; UI shows prior capture date + Recapture-anyway override
- [x] **3.5:** Soft-delete (`deleted_at` column) + restore flow
- [x] **3.6:** Supabase `pg_cron` 30-day purge job

## Phase 4: Export + Observability MVP ⏸
- [ ] **4.1:** Excel export with `exceljs` (RTL-aware) → [plan](docs/planning/phase-4-export-observability.md)
- [ ] **4.2:** PDF export via Puppeteer `page.pdf()` (AR font embedded)
- [ ] **4.3:** ZIP bundle via `archiver` (screenshots + metadata.json)
- [ ] **4.4:** `/api/metrics` 24h window (request counts, fallback-chain stage, p50/p95 latency)
- [ ] **4.5:** RSS sampler (30s) to catch memory regressions

## Phase 5: MVP Hardening & Launch ⏸
- [ ] **5.1:** 10× clean 100-URL batch runs without process kill → [plan](docs/planning/phase-5-launch.md)
- [ ] **5.2:** p95 latency <40s verification
- [ ] **5.3:** Golden-file regression run — 0 failures
- [ ] **5.4:** Analyst dry-run: one full weekly reporting cycle
- [ ] **5.5:** Launch checklist (backups, access, runbooks)

## Phase 6: Post-MVP Polish 🚧 _(dashboard shell delivered; backup/obs deferred)_
- [x] **6.1:** Dashboard stats view — category-filtered KPIs, top-posters leaderboard, posted/captured chart toggle, busiest-day caption, category breakdown pills
- [ ] **6.2:** User-triggered ZIP backup + weekly GitHub Actions cron → GH Release asset
- [ ] **6.3:** Sentry free-tier integration
- [ ] **6.4:** Axiom free-tier log shipping

## Phase 7: Analyst Workflow Quality-of-Life ✅ _(delivered 2026-04-18)_
- [x] **7.1:** Multi-select with bulk recapture + live progress tracker + cancel button (`web/src/components/PostsBulkBar.tsx`)
- [x] **7.2:** Duplicate-choice dialog (single + batch review) with `force_recapture` override on the API
- [x] **7.3:** Restore-last-paste — last pasted batch cached in localStorage
- [x] **7.4:** Company sub-category (`inner`/`outer`/`general`/`other`) on `posts`, with **learn-by-handle classifier** — auto-inherits category from prior posts by the same handle; one manual classify propagates to all history (`src/src/capture/classify.ts`, migration `20260418000001_company_category.sql`)
- [x] **7.5:** Bulk "Set Category" action on `PostsBulkBar`
- [x] **7.6:** Category chip buttons in `QuickEditDialog` with propagation toast
- [x] **7.7:** "Grab URLs from X" bookmarklet — drag-to-install, stateful MutationObserver collector across virtualized scrolls, floating badge with live URL count + Copy/View/Close (`web/src/components/GrabFromX.tsx`)
- [x] **7.8:** TypeScript mirror of `normalize_url()` to match DB unique index (fixes false 23505s)
- [x] **7.9:** Posts list N+1 elimination — single `.in()` + batch `createSignedUrls` (~8 s → ~1.3 s for 100 posts)
- [x] **7.10:** Toast system overhaul — top-center, larger cards, 7 s, manual × dismiss, description field
- [x] **7.11:** Dark palette restored to v1 (#8b5cf6) + softer light mode

## Deferred / Skipped
- **BR-9 Automated Keyword Monitoring** — skipped (X API paid; scraping violates ToS; manual search suffices; partially addressed by 7.7 bookmarklet which uses the analyst's own session).
- **Historical posted_at range picker** — 30-day window is enough for weekly reporting; add when analyst asks for quarterly views.
- **Separate `government` company sub-category** — folded into `general` for now; split when volume warrants.
