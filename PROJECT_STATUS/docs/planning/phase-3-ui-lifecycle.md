# Phase 3: Bilingual UI + Data Lifecycle

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **Business Research:** BR-4 (Bilingual RTL UI, 3.80 DEPTH), BR-8 (Data lifecycle, 2.95 SUPPORTING) → [BUSINESS_RESEARCH/04-bilingual-rtl-ui.md](../../project_documents/BUSINESS_RESEARCH/04-bilingual-rtl-ui.md), [08-data-lifecycle.md](../../project_documents/BUSINESS_RESEARCH/08-data-lifecycle.md)
- **Technical Options:** TC-4 (Bilingual RTL UI), TC-8 (Data Lifecycle) → [TECHNICAL_OPTIONS/04-bilingual-rtl-ui.md](../../project_documents/TECHNICAL_OPTIONS/04-bilingual-rtl-ui.md), [08-data-lifecycle.md](../../project_documents/TECHNICAL_OPTIONS/08-data-lifecycle.md)
- **Supporting Systems:** SS-03 (Scheduled jobs — pg_cron)
- **BRD Section:** NFR-7 (Data retention 30d), i18n/RTL implicit
- **PRD Section:** F-1, F-5, F-6, F-7, F-8

## Recommended Tech Stack
- React 18 + shadcn/ui components (Button, Textarea, Card, Table, Toast, Dialog)
- `react-i18next` with AR + EN resource bundles; locale in `localStorage`
- Tailwind `rtl:` variants + `[dir="rtl"]` selector on `<html>`
- Supabase JS client with generated types
- `pg_cron` SQL for 30-day purge

## Estimated Cost
$0 — Supabase free tier includes `pg_cron`.

## Budget Context
- **Phase cost vs. budget:** 0%. PASS.

## Prerequisites
- Phase 2 complete (capture API returns structured results).
- Phase 0 design system in place (shadcn tokens, AR/EN resources scaffolded).

## Regulatory Deadlines
- PDPL 30-day retention — enforced here via `pg_cron` (step 3.6).

## Constraint Validation
- **Affected constraints:** C-09 (PDPL — retention automation).
- **Remediation:** Step 3.6 implements the 30-day purge referenced in the PDPL processing record.

## Implementation Steps
- [ ] **3.1:** `web/src/pages/Paste.tsx` — shadcn `Textarea` for URL list (1–100 lines), client-side Zod validation (`z.array(z.string().url()).min(1).max(100)`). Submit button disabled while invalid. RTL-aware layout.
- [ ] **3.2:** `web/src/pages/Results.tsx` — shadcn `Table` showing captured posts with thumbnail, source kind (tweet/article), captured_at, media_type badge. Click row → drawer with full metadata + screenshot at full size.
- [ ] **3.3:** Locale toggle component in top-right (or top-left in RTL). Persist to `localStorage`. Toggle flips `<html lang dir>` and swaps i18n resource bundle. All shadcn components must render correctly in both directions (test with Playwright visual).
- [ ] **3.4:** `normalize_url(url)` SQL function — strips tracking params, lowercases host, removes fragment. Used as `normalized_url` column's generated value; UNIQUE index on it. On duplicate insert: return existing row with "prior capture date" UI hint.
- [ ] **3.5:** Soft-delete: `DELETE /post/:id` sets `deleted_at = NOW()`; list views filter `WHERE deleted_at IS NULL`. Trash page lists soft-deleted rows with Restore action (clears `deleted_at`).
- [ ] **3.6:** `pg_cron` job `purge_expired_posts`: `DELETE FROM posts WHERE deleted_at < NOW() - INTERVAL '30 days'`. Schedule daily at 03:00 UTC. Cascade-delete `captures` rows. Log row count to `purge_log` table.

## Key Decisions (from research)
- Locale default = AR (primary user preference). EN is secondary but fully supported.
- URL normalization is DB-side (generated column) not app-side — guarantees dedupe correctness even if code changes.
- Soft-delete + 30-day purge (not hard-delete) gives analyst time to recover mistakes while still meeting PDPL minimization.
- No RLS on Supabase: internal single-tenant tool, auth at the network layer (Cloudflare Tunnel access list).

## Acceptance Criteria
- UI renders correctly in both AR (RTL) and EN (LTR) — Playwright snapshot per locale.
- Submitting a duplicate URL shows "Previously captured on YYYY-MM-DD" without creating a duplicate row.
- Soft-deleted row disappears from main list, appears in Trash, can be restored.
- `pg_cron` job successfully purges a test row aged >30 days (manually set `deleted_at` in dev).
- All shadcn components verified in both themes (light/dark) × both directions (RTL/LTR) = 4 combinations.

## Competitive Context
Bilingual RTL is commodity in the region; the differentiator is pairing it with $0 hosting + audit-grade capture. No competitor offers the combination.

## Research Gaps
None.
