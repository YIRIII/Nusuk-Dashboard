# Changelog — Nusuk Social Tracker v2

All notable changes since the initial commit (`cf76e83`). Dates are calendar, not release.

## [Unreleased] — 2026-04-18

Consolidated feature drop after extended working session. Covers capture pipeline hardening, dashboard redesign, bulk operations, the learn-by-handle company classifier, and the "Grab URLs from X" bookmarklet.

### Added

#### Capture pipeline
- **Fast duplicate pre-check** — `POST /api/capture` looks up `normalized_url` before running the fallback chain. Returns `prior_captured_at` on duplicate so the UI can show a choice dialog instead of silently skipping.
- **Force-recapture override** — new `force_recapture` (single) and `force_recapture_urls` (batch subset) flags on the capture route. Soft-deletes the existing row, then captures fresh. Surfaced in the UI as a "Recapture anyway" button inside the duplicate dialog.
- **Batch URL auto-detection** — paste a free-form blob (Arabic news copy, newlines, commas, mixed URLs) and the client extracts all `x.com/.../status/...` URLs with a regex.
- **Restore-last-paste** — the last pasted batch is cached in `localStorage`; a "Paste last batch" button brings it back if the analyst navigates away.
- **Live progress tracker for batch** — multi-select bulk recapture now shows `{done}/{total}` with an inline cancel button; completes silently to the Monitor log afterwards.
- **TypeScript mirror of `normalize_url()`** — ported the Postgres function to `src/src/db/posts.ts` so `findLivePostByUrl` and upsert-recovery lookups use the same canonical form as the DB unique index. Fixes intermittent `23505 unique violation but no existing row found — Cannot coerce the result to a single JSON object`.

#### Learn-by-handle company classifier
- **New `company_category` enum column** on `posts` (`inner`, `outer`, `general`, `other`, nullable). Migration at `supabase/migrations/20260418000001_company_category.sql`.
- **`classifyCompanyByHandle()`** (`src/src/capture/classify.ts`) — on every capture, looks up any prior live post with the same `author_handle` and a non-null category; if found, inherits. Falls back to a narrow "general" keyword regex (وزارة / إمارة / هيئة / صحيفة / press agency etc.) only for unambiguous official entities. Everything else stays null and waits for the analyst.
- **Propagation on manual classification** — `PATCH /api/posts/:id` applies the chosen category to all other *unclassified* live posts from the same handle in a single update. QuickEdit shows a toast: "Saved — N other posts from the same account updated too."
- **Bulk "Set category" action** — `PostsBulkBar` gained an Inner/Outer/General/Other dropdown that calls PATCH for every selected post.

#### "Grab URLs from X" bookmarklet
- **New `GrabFromX` component** (`web/src/components/GrabFromX.tsx`) on the Capture page. A drag-to-install `javascript:` bookmarklet that, once on the bookmarks bar, extracts tweet URLs from any X page (search results, profile timelines, etc.).
- **Stateful collector** — clicking the bookmarklet installs a MutationObserver on `document.body` because X virtualizes the timeline (scrolled-past tweets are unmounted). URLs accumulate into a `Set` across scroll sessions, so a 300-tweet search yields 300 URLs.
- **Floating live-count badge** — fixed bottom-right, purple gradient, shows `Nusuk: N URLs` with three buttons: **Copy** (clipboard), **View** (opens a new tab with the full list), and **×** (disconnects observer, removes badge). Re-clicking the bookmarklet toggles the badge.
- **ToS-compliant** — uses the user's own authenticated X session; no headless scraping, no API calls.

#### Dashboard redesign
- **Category filter chips** — All / Individual / Inner / Outer / General / Other / Unclassified, each with a live count. Applies to KPIs, charts, and the top-posters list.
- **Top Posters leaderboard** — moved above the analytics charts. Rank badges (gold/silver/bronze), avatar initial chip, thin gradient progress bar sized by relative post count. Replaces the previous vertical bar chart.
- **Posted-vs-captured chart toggle** — `AnalyticsCharts` defaults to `posted_at` (when the news happened), with a one-click toggle to `captured_at` (when we archived it). Busiest-day caption below the chart names the peak date + count.
- **Category pill on PostCard** — sits next to the origin pill. Colors: emerald=Inner, sky=Outer, violet=General, zinc=Other, red=Unclassified.
- **Storage usage bar** — small footer on the dashboard showing MB used vs. budget.
- **Stages chart moved to Monitor** — fallback-chain stage breakdown is a debugging view, not a daily dashboard chart. Lives at `web/src/components/charts/StagesChart.tsx` and is rendered only on the Monitor page.
- **Hours-of-day chart removed** — low signal, not requested by the analyst workflow.

#### UI polish
- **Softer light mode** — `--background: 240 12% 93%` (down from 98%) for less eye strain.
- **Restored v1 dark palette** — `--background: 240 35% 4%`, `--primary: 262 83% 67%` (#8b5cf6).
- **Toast system overhaul** — top-center, larger cards, 7s duration, manual dismiss ×, support for description field used by propagation feedback.
- **Fixed-height post thumbnails** — 256px with bottom gradient fade, so cards line up in the grid regardless of image aspect ratio.
- **Softer origin border** — company/individual left-border opacity reduced from /70 to /40; background from /15 to /10–/8.

### Changed

- **Posts list query is no longer N+1** — replaced per-post capture lookups with a single `.in(post_id, [...])` query and a batch `createSignedUrls` call. ~8 s → ~1.3 s for 100 posts.
- **Vite dev server binds to `0.0.0.0`** (`web/vite.config.ts`). Fixes the IPv6-only localhost binding that caused "connection refused" in some browsers.
- **Dashboard KPI tiles** — switched from gradient kid-style cards to neutral dark cards with small colored icon chips.

### Fixed

- Duplicate URLs with different query strings now dedupe correctly (see `normalizeUrl` note above).
- Missing i18n keys (`posts.filter_label.kind`, etc.) that previously rendered as raw dotted paths in the UI.
- tsx watch restart loop during dev — worked around by building the API and running `node src/dist/index.js`.

### Migration required

Before the next capture, run `supabase/migrations/20260418000001_company_category.sql` in the Supabase SQL Editor. Without it, captures fail with `Could not find the 'company_category' column`. Migration creates:
- `company_category` enum type (inner/outer/general/other)
- nullable column on `posts`
- partial index on the new column (where `deleted_at is null`)
- partial index on `metadata->>'author_handle'` to accelerate classifier lookups

### Schema additions
- `PostPatchSchema.company_category` — nullable enum
- `PostsListQuerySchema.category` — filter chip value (includes `unclassified`)
- `CaptureRequestSchema.force_recapture` + `force_recapture_urls` — duplicate override

### Node version guards (added 2026-04-19 after Node 22 silent-hang incident)
- `.nvmrc` pinning `20` so `nvm use` picks the right version on `cd`.
- `package.json` `engines.node` tightened from `>=20.0.0` to `^20.0.0`.
- Startup preflight in `src/src/index.ts` that exits with a `[FATAL] Node X detected` message if the major version isn't 20 — catches the regression instantly instead of hanging for minutes inside V8's ESM-from-CJS evaluator (the bug triggered by `puppeteer-core` imports on Node 22+).

### Still pending (not in this drop)
- Migration apply in Supabase (user action)
- Oracle Cloud VM provisioning (KI-006 — user's card was flagged by Oracle; blocked on alternate payment)
- Phase 1.5 golden-file PNG baselines (deferred until prod Docker image runs)
- Historical posted_at range picker (current chart is a fixed 30-day window)
- Separate `government` sub-category (kept in mind; currently folded into `general`)
