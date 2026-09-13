-- =============================================================================
-- Thesis — Migration 004
-- Portfolios, holding_lots (source of truth), holdings view (average cost)
-- FX is display-only: lots store native_currency; never write converted amounts.
-- =============================================================================

insert into schema_migrations (id, name) values (4, '004_portfolios_lots.sql');

create table portfolios (
  id                    uuid primary key default gen_random_uuid(),
  family_id             uuid not null unique references families(id) on delete cascade,
  display_currency      char(3) not null default 'USD',
  fx_usd_inr_override   numeric(12, 6),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger portfolios_updated_at
  before update on portfolios for each row execute function set_updated_at();

create table holding_lots (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  portfolio_id      uuid not null references portfolios(id) on delete cascade,
  ticker            text not null,
  exchange          text not null,
  company_name      text not null,
  qty               numeric(20, 8) not null check (qty > 0),
  cost_per_share    numeric(20, 8) not null check (cost_per_share >= 0),
  native_currency   char(3) not null,
  purchased_at      date,
  source            lot_source not null default 'manual',
  created_by        uuid references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger holding_lots_updated_at
  before update on holding_lots for each row execute function set_updated_at();

create index holding_lots_family_ticker_idx
  on holding_lots (family_id, ticker, exchange, native_currency);

create table portfolio_import_rows (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  portfolio_id      uuid not null references portfolios(id) on delete cascade,
  raw               jsonb not null,
  ticker            text,
  company_name      text,
  cost_per_share    numeric(20, 8),
  total_purchased   numeric(20, 8),
  accepted          boolean not null,
  reject_reason     text,
  created_at        timestamptz not null default now()
);

-- Desk table: one row per ticker/exchange/currency. Lots remain the write path.
create or replace view holdings as
select
  family_id,
  portfolio_id,
  ticker,
  exchange,
  native_currency,
  min(company_name) as company_name,
  sum(qty) as qty,
  sum(qty * cost_per_share) / nullif(sum(qty), 0) as cost_per_share,
  count(*)::integer as lot_count
from holding_lots
group by family_id, portfolio_id, ticker, exchange, native_currency;

alter view holdings set (security_invoker = true);

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
begin
  v_email := nullif(new.email, '');
  v_phone := nullif(new.phone, '');
  v_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(v_email::text, v_phone, 'desk'), '@', 1)
  );
  select id into v_plan from plans where slug = 'trial';

  insert into public.users (id, email, phone_e164, full_name, tax_residency)
  values (
    new.id,
    v_email,
    v_phone,
    v_name,
    coalesce((new.raw_user_meta_data ->> 'tax_residency')::tax_residency, 'us')
  );

  insert into public.families (name, created_by, plan_id, billing_status)
  values (v_name || '''s desk', new.id, v_plan, 'trial')
  returning id into v_family;

  insert into public.family_members (family_id, user_id, member_role)
  values (v_family, new.id, 'owner');

  insert into public.wallets (family_id) values (v_family);
  insert into public.portfolios (family_id, display_currency) values (v_family, 'USD');

  return new;
end;
$$;

-- Backfill portfolios for families created in 003 before this function existed.
insert into portfolios (family_id, display_currency)
select f.id, 'USD' from families f
where not exists (select 1 from portfolios p where p.family_id = f.id);
