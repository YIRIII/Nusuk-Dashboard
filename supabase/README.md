# Supabase

Database schema + migrations for Hadaq Tracker v2.

## Apply migrations

Using the Supabase CLI (recommended):

```bash
supabase link --project-ref <ref>
supabase db push
```

Or apply manually via the SQL editor in the Supabase dashboard by pasting `migrations/20260415000001_init.sql`.

## What's in `20260415000001_init.sql`

- Extensions: `pgcrypto`, `pg_cron`
- Enums: `post_kind`, `media_type`, `capture_stage`
- `normalize_url(text)` function — strips fragments + common tracking params, lowercases, trims trailing slash
- `posts` table — with `normalized_url` as a stored generated column and a partial unique index on non-deleted rows
- `captures` table — one row per fallback-chain stage attempt (image/video/gif/none, success/error, bytes, timing)
- `purge_log` table — audit of daily purges
- `pg_cron` job `purge_expired_posts` — runs daily at 03:00 UTC, hard-deletes rows with `deleted_at < now() - 30 days` (PDPL retention enforcement; ref KI-003)

## Storage bucket (manual)

Create a private bucket named `captures` in the Supabase dashboard. Paths follow `{post_id}/{capture_id}.png` (or `.mp4` for video).

## Region

Pick a region that satisfies PDPL processing-activity record requirements (documented in `docs/compliance/pdpl-processing-record.md` once created in step 0.9).
