-- Company sub-category (inner / outer / general / other). Null for individual
-- posts and for company posts awaiting analyst classification.

do $$ begin
  create type company_category as enum ('inner', 'outer', 'general', 'other');
exception when duplicate_object then null; end $$;

alter table posts
  add column if not exists company_category company_category;

create index if not exists posts_company_category_idx
  on posts(company_category) where deleted_at is null;

-- Accelerates learn-by-handle classifier lookups.
create index if not exists posts_author_handle_idx
  on posts((metadata->>'author_handle')) where deleted_at is null;
