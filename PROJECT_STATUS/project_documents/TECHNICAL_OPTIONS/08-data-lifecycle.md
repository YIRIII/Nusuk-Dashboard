# Capability 08: Data Lifecycle — Schema, Dedupe, Purge (Supporting)

**BRs covered**: BR-7, BR-11, BR-13 · **Tier**: Supporting

## Data store

**Supabase** (already in v1, working). Free tier: 500 MB DB + 1 GB Storage + `pg_cron` + Edge Functions + Row Level Security. Accessed 2026-04-15 at [supabase.com/pricing](https://supabase.com/pricing).

At ~200 captures/season × avg 300 KB/screenshot = 60 MB/season → multi-year capacity on free tier.

## Schema sketch (Postgres + Supabase)

```sql
create type media_type as enum ('text_only','image','video','gif','link_card','article');
create type source_type as enum ('tweet','article','instagram'); -- instagram retained in enum for legacy rows only

create table posts (
  id uuid primary key default gen_random_uuid(),
  normalized_url text not null,
  source_type source_type not null,
  media_type media_type not null,
  captured_at timestamptz not null default now(),
  category text check (category in ('person','company')),
  username text,
  post_text text,
  post_date date,
  screenshot_path text not null,  -- Supabase Storage path
  metadata jsonb not null default '{}'::jsonb,
  parent_post_id uuid references posts(id) on delete set null,  -- for linked articles
  deleted_at timestamptz
);
create unique index posts_normalized_url_active_uq on posts (normalized_url) where deleted_at is null;
create index posts_captured_at_idx on posts (captured_at desc);
create index posts_deleted_at_idx on posts (deleted_at) where deleted_at is not null;
```

## URL normalization (for dedupe)

- Lowercase host
- Strip fragments
- Strip tracking params (`utm_*`, `si`, `t`, `ref_src`, `ref_url`)
- Canonicalize Twitter URLs (`twitter.com` → `x.com`; strip `/photo/N`)
- Implement once in a shared `normalizeUrl(input: string): string` function used by both the insert path (writes normalized) and the dedupe check (reads normalized)

## Soft-delete + 30-day purge

`pg_cron` job (from Supporting System #03):

```sql
select cron.schedule(
  'soft-delete-purge',
  '0 3 * * *',
  $$ delete from posts where deleted_at < now() - interval '30 days' $$
);
```

Trigger cascades to orphan Supabase Storage object cleanup via an Edge Function invoked on `posts` DELETE.

## Dashboard stats (BR-13)

SQL-side aggregates (fast, cache-friendly):

```sql
select count(*) filter (where source_type='tweet')   as tweets,
       count(*) filter (where source_type='article') as articles,
       count(*) filter (where category='person')      as persons,
       count(*) filter (where category='company')     as companies,
       count(*) filter (where captured_at > now() - interval '7 days') as last_7d
from posts where deleted_at is null;
```

Expose via a Postgres `view` or Supabase RPC; SWR/TanStack Query caches client-side for 60s.

## Recommendation

Supabase with the schema above. RLS disabled (internal tool, single user), or set a single-role policy if you want defense-in-depth.

**Est. Year 1 cost: $0 cash** (Supabase free tier comfortable at this scale).
