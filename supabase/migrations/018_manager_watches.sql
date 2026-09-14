-- =============================================================================
-- Thesis — Migration 018
-- Manager watches + optional 13F snapshots (P9-01).
-- =============================================================================

insert into schema_migrations (id, name) values (18, '018_manager_watches.sql');

create table manager_watches (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  name        text not null,
  created_by  uuid not null references users(id),
  created_at  timestamptz not null default now(),
  unique (family_id, name)
);

create table manager_holdings_snapshots (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  manager_id  uuid not null references manager_watches(id) on delete cascade,
  ticker      text not null,
  as_of       date not null default current_date,
  created_at  timestamptz not null default now()
);

select apply_family_rls('public.manager_watches');
select apply_family_rls('public.manager_holdings_snapshots');

grant select, insert, update, delete on manager_watches to authenticated;
grant select, insert, delete on manager_holdings_snapshots to authenticated;
