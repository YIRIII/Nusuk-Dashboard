-- Adds dashboard-facing fields to posts + a companies lookup table.
-- Idempotent: safe to re-run.

do $$ begin
  create type post_origin as enum ('individual', 'company');
exception when duplicate_object then null; end $$;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  handle text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Seed well-known companies (idempotent via natural-key conflict on handle).
insert into companies (name_ar, name_en, handle)
values
  ('نُسك', 'Nusuk', '@nusuk_official'),
  ('واس', 'Saudi Press Agency', 'spa.gov.sa'),
  ('عرب نيوز', 'Arab News', 'arabnews.com'),
  ('الخطوط السعودية', 'Saudia', '@Saudi_Airlines'),
  ('stc', 'stc', '@stc_ksa')
on conflict do nothing;

alter table posts
  add column if not exists origin post_origin not null default 'individual',
  add column if not exists company_id uuid references companies(id) on delete set null,
  add column if not exists reviewed boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists title_override text,
  add column if not exists notes text,
  add column if not exists posted_at timestamptz;

create index if not exists posts_company_id_idx on posts(company_id) where deleted_at is null;
create index if not exists posts_reviewed_idx on posts(reviewed) where deleted_at is null;
create index if not exists posts_origin_idx on posts(origin) where deleted_at is null;
create index if not exists posts_posted_at_idx on posts(posted_at desc) where deleted_at is null;
