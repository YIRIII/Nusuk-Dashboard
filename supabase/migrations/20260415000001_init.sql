-- Nusuk Social Tracker v2 — initial schema
-- Run against a fresh Supabase project. Requires pg_cron extension (available on Supabase free tier).

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

do $$ begin
  create type post_kind as enum ('tweet', 'article', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('image', 'video', 'gif', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type capture_stage as enum ('fxtwitter', 'oembed', 'puppeteer_embed', 'puppeteer_direct');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- URL normalization (used as generated column; dedupes tracking params / case)
-- -----------------------------------------------------------------------------

create or replace function normalize_url(raw text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if raw is null then return null; end if;
  cleaned := lower(trim(raw));
  -- strip fragment
  cleaned := regexp_replace(cleaned, '#.*$', '');
  -- strip common tracking params
  cleaned := regexp_replace(cleaned, '[?&](utm_[^=]+|gclid|fbclid|mc_[^=]+|ref|ref_src|ref_url|s|t)=[^&]*', '', 'g');
  -- clean up dangling ?/& left behind
  cleaned := regexp_replace(cleaned, '\?&', '?');
  cleaned := regexp_replace(cleaned, '[?&]+$', '');
  -- trailing slash
  cleaned := regexp_replace(cleaned, '/+$', '');
  return cleaned;
end;
$$;

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  normalized_url text generated always as (normalize_url(url)) stored,
  kind post_kind not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb,
  parent_id uuid references posts(id) on delete set null,
  captured_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists posts_normalized_url_key
  on posts(normalized_url)
  where deleted_at is null;

create index if not exists posts_captured_at_idx
  on posts(captured_at desc)
  where deleted_at is null;

create index if not exists posts_deleted_at_idx
  on posts(deleted_at)
  where deleted_at is not null;

-- -----------------------------------------------------------------------------
-- captures (1..N per post: screenshots + artifacts per fallback stage)
-- -----------------------------------------------------------------------------

create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  media media_type not null default 'none',
  stage capture_stage not null,
  storage_path text not null,                    -- key in Supabase Storage bucket
  width int,
  height int,
  bytes bigint,
  duration_ms int,
  success boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists captures_post_id_idx on captures(post_id);
create index if not exists captures_created_at_idx on captures(created_at desc);

-- -----------------------------------------------------------------------------
-- purge_log (audit trail for pg_cron 30-day purge)
-- -----------------------------------------------------------------------------

create table if not exists purge_log (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  rows_deleted int not null,
  note text
);

-- -----------------------------------------------------------------------------
-- 30-day purge job (enforces PDPL retention — KI-003 / step 3.6)
-- -----------------------------------------------------------------------------

select cron.schedule(
  'purge_expired_posts',
  '0 3 * * *',  -- daily at 03:00 UTC
  $$
    with purged as (
      delete from posts
      where deleted_at is not null
        and deleted_at < now() - interval '30 days'
      returning 1
    )
    insert into purge_log (rows_deleted, note)
    values ((select count(*) from purged), 'daily 30d purge');
  $$
);
