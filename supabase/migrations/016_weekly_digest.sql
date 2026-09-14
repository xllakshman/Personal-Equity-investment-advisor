-- =============================================================================
-- Thesis — Migration 016
-- Weekly digest opt-in + table (P8-02). No email send in this file.
-- =============================================================================

insert into schema_migrations (id, name) values (16, '016_weekly_digest.sql');

alter table families
  add column if not exists weekly_digest_opt_in boolean not null default false;

alter table plans
  add column if not exists weekly_digest_ticker_limit integer not null default 3;

update plans set weekly_digest_ticker_limit = 3
 where slug in ('trial', 'basic', 'professional');
update plans set weekly_digest_ticker_limit = 15
 where slug in ('premium', 'ultra');

alter type usage_kind add value if not exists 'weekly_digest';

create table weekly_digests (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references families(id) on delete cascade,
  week_start         date not null,
  ticker_ids         text[] not null default '{}',
  body               jsonb not null default '{}'::jsonb,
  model_id           text references model_catalog(id),
  prompt_version_id  uuid references prompt_versions(id),
  cost_cents         integer not null default 0,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (family_id, week_start)
);

select apply_family_rls('public.weekly_digests');

create or replace function thesis_set_weekly_digest_opt_in(p_opt_in boolean, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
begin
  select fm.family_id into v_family
    from family_members fm
   where fm.user_id = auth.uid()
     and fm.member_role = 'owner'
     and fm.is_active = true
   limit 1;
  if v_family is null then
    raise exception 'THS-FAM-001 owner required' using errcode = '42501';
  end if;
  if p_opt_in and not coalesce(p_confirm, false) then
    raise exception 'THS-WD-001 confirm required' using errcode = '22023';
  end if;
  update families set weekly_digest_opt_in = p_opt_in where id = v_family;
end;
$$;

alter table prompt_versions
  drop constraint if exists prompt_versions_role_check;
alter table prompt_versions
  add constraint prompt_versions_role_check
  check (role in ('advisor', 'refine_gate', 'weekly_digest'));

insert into prompt_versions (semver, body, role)
values (
  'v0.1.0-weekly-digest',
  $wd$WEEKLY HOLDINGS DIGEST. Cite Step 0 facts only. If items 2–7 have no vendor, say so. Do not recommend tickers the family does not hold. Not a broker.$wd$,
  'weekly_digest'
);

grant execute on function thesis_set_weekly_digest_opt_in(boolean, boolean) to authenticated;
