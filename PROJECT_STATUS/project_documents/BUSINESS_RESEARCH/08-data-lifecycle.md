# Feature: Data Lifecycle — Dedupe, Soft-Delete, Dashboard (BR-7, BR-11, BR-13)

**BRs covered**: BR-7 (soft-delete with 30-day recovery), BR-11 (duplicate detection on URL), BR-13 (dashboard stats)
**Category**: Day-to-day UX
**Tier**: **Supporting**

## What it does

- Paste the same URL twice → system warns or merges (dedupe).
- Delete a post → it moves to trash, auto-purged after 30 days, restorable meanwhile.
- Dashboard shows counts by category (Person/Company), source (Twitter/article), date bucket.

## Competitive analysis

All three are saturated — standard CRUD + dashboard patterns. v1 implemented them correctly; they weren't on the failure list.

## Impact severity: **Minor inconvenience**

Lose dedupe → analyst occasionally recaptures the same URL (wastes Puppeteer cycles but not catastrophic).
Lose soft-delete → accidental deletes are painful but recoverable from Supabase backups.
Lose dashboard → analyst counts manually (minor friction).

## Novelty rating: **Saturated**

## Rebuild-specific notes

- Unique index on `normalized_url` in Supabase (normalize: lowercase, strip UTM params, strip fragments).
- Soft-delete via `deleted_at` timestamp column; filtered views in UI; scheduled job (Supabase Edge Function or GitHub Actions cron) purges `deleted_at < NOW() - 30 days`.
- Dashboard queries use Supabase `.rpc()` or aggregate selects — no heavy client-side crunching.
