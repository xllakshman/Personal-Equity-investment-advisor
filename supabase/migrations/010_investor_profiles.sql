-- =============================================================================
-- Thesis — Migration 010
-- investor_profiles (P1-05). One row per family. Framework knobs, not Maya's book.
-- Never default LRS cap to a dollar amount from the May 2026 personal book.
-- =============================================================================

insert into schema_migrations (id, name) values (10, '010_investor_profiles.sql');

create table investor_profiles (
  id                      uuid primary key default gen_random_uuid(),
  family_id               uuid not null unique references families(id) on delete cascade,
  cannot_trade_us_options boolean not null default false,
  monitor_per_week        integer not null default 1 check (monitor_per_week >= 0),
  horizon_years           numeric(6, 2) not null default 5 check (horizon_years > 0),
  cash_reserve_pct_min    numeric(6, 2) not null default 10 check (cash_reserve_pct_min >= 0),
  cash_reserve_pct_max    numeric(6, 2) not null default 20 check (cash_reserve_pct_max >= 0),
  concentration_cap_pct   numeric(6, 2) not null default 15 check (concentration_cap_pct > 0),
  trim_to_pct             numeric(6, 2) not null default 12 check (trim_to_pct > 0),
  tranche_t1_pct          numeric(6, 2) not null default 35,
  tranche_t2_pct          numeric(6, 2) not null default 25,
  tranche_t3_pct          numeric(6, 2) not null default 25,
  tranche_t4_pct          numeric(6, 2) not null default 15,
  position_size_min_pct   numeric(6, 2) not null default 3 check (position_size_min_pct >= 0),
  position_size_max_pct   numeric(6, 2) not null default 15 check (position_size_max_pct > 0),
  ltcg_holding_months     integer not null default 12 check (ltcg_holding_months > 0),
  ltcg_rate_bps           integer not null default 1500 check (ltcg_rate_bps >= 0),
  stcg_rate_bps           integer not null default 2200 check (stcg_rate_bps >= 0),
  outside_book            jsonb not null default '{}'::jsonb,
  lrs_enabled             boolean not null default false,
  lrs_annual_cap_usd      numeric(20, 2),
  blackout_windows        jsonb not null default '[]'::jsonb,
  timezone                text not null default 'America/New_York',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint investor_profiles_cash_band
    check (cash_reserve_pct_max >= cash_reserve_pct_min),
  constraint investor_profiles_size_band
    check (position_size_max_pct >= position_size_min_pct),
  constraint investor_profiles_outside_object
    check (jsonb_typeof(outside_book) = 'object'),
  constraint investor_profiles_blackout_array
    check (jsonb_typeof(blackout_windows) = 'array')
);

create trigger investor_profiles_updated_at
  before update on investor_profiles for each row execute function set_updated_at();

create or replace function investor_profile_from_residency(p_residency tax_residency)
returns table (
  cannot_trade_us_options boolean,
  ltcg_holding_months integer,
  ltcg_rate_bps integer,
  stcg_rate_bps integer,
  lrs_enabled boolean,
  timezone text
)
language sql
immutable
as $$
  select
    (p_residency = 'india'),
    case when p_residency = 'india' then 24 else 12 end,
    case p_residency
      when 'india' then 1250
      when 'nri' then 1250
      when 'uae' then 0
      else 1500
    end,
    case p_residency
      when 'india' then 2000
      when 'nri' then 2000
      when 'uae' then 0
      else 2200
    end,
    (p_residency = 'india'),
    case p_residency
      when 'india' then 'Asia/Kolkata'
      when 'nri' then 'Asia/Kolkata'
      when 'uae' then 'Asia/Dubai'
      else 'America/New_York'
    end;
$$;

insert into investor_profiles (
  family_id,
  cannot_trade_us_options,
  ltcg_holding_months,
  ltcg_rate_bps,
  stcg_rate_bps,
  lrs_enabled,
  timezone
)
select
  f.id,
  d.cannot_trade_us_options,
  d.ltcg_holding_months,
  d.ltcg_rate_bps,
  d.stcg_rate_bps,
  d.lrs_enabled,
  d.timezone
from families f
join users u on u.id = f.created_by
cross join lateral investor_profile_from_residency(u.tax_residency) d
where not exists (
  select 1 from investor_profiles p where p.family_id = f.id
);

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_email citext;
  v_phone text;
  v_name text;
  v_plan uuid;
  v_residency tax_residency;
begin
  v_email := nullif(new.email, '');
  v_phone := nullif(new.phone, '');
  v_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(v_email::text, v_phone, 'desk'), '@', 1)
  );
  v_residency := coalesce((new.raw_user_meta_data ->> 'tax_residency')::tax_residency, 'us');
  select id into v_plan from plans where slug = 'trial';

  insert into public.users (id, email, phone_e164, full_name, tax_residency)
  values (new.id, v_email, v_phone, v_name, v_residency);

  insert into public.families (name, created_by, plan_id, billing_status)
  values (v_name || '''s desk', new.id, v_plan, 'trial')
  returning id into v_family;

  insert into public.family_members (family_id, user_id, member_role)
  values (v_family, new.id, 'owner');

  insert into public.wallets (family_id) values (v_family);
  insert into public.portfolios (family_id, display_currency) values (v_family, 'USD');

  insert into public.investor_profiles (
    family_id,
    cannot_trade_us_options,
    ltcg_holding_months,
    ltcg_rate_bps,
    stcg_rate_bps,
    lrs_enabled,
    timezone
  )
  select
    v_family,
    d.cannot_trade_us_options,
    d.ltcg_holding_months,
    d.ltcg_rate_bps,
    d.stcg_rate_bps,
    d.lrs_enabled,
    d.timezone
  from investor_profile_from_residency(v_residency) d;

  return new;
end;
$$;

alter table investor_profiles enable row level security;
alter table investor_profiles force row level security;

create policy investor_profiles_select on investor_profiles
  for select using (user_can_read_family(family_id));

create policy investor_profiles_insert on investor_profiles
  for insert with check (user_is_family_owner(family_id));

create policy investor_profiles_update on investor_profiles
  for update using (user_is_family_owner(family_id))
  with check (user_is_family_owner(family_id));

grant select, insert, update on investor_profiles to authenticated;
revoke delete on investor_profiles from authenticated, anon;
revoke all on investor_profiles from anon;
