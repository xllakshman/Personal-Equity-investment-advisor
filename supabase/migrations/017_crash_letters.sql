-- =============================================================================
-- Thesis — Migration 017
-- Crash letter (P9-00).
-- =============================================================================

insert into schema_migrations (id, name) values (17, '017_crash_letters.sql');

create table crash_letters (
  family_id   uuid primary key references families(id) on delete cascade,
  body        text not null default '',
  pdf_key     text,
  updated_by  uuid references users(id),
  updated_at  timestamptz not null default now()
);

select apply_family_rls('public.crash_letters');

grant select, insert, update on crash_letters to authenticated;
