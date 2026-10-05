-- =============================================================================
-- Thesis — Migration 028
-- holding_lots.lot_kind: retail vs esop. View holdings exposes it and groups
-- by kind so the same ticker can appear in both sleeves.
-- RLS unchanged (007 family policies on holding_lots; view is security_invoker).
-- Do not apply without CONFIRM_APPLY=1 and a named target (DEV or PROD).
-- =============================================================================

insert into schema_migrations (id, name) values (28, '028_holding_lot_kind.sql')
on conflict (id) do nothing;

alter table holding_lots
  add column if not exists lot_kind text not null default 'retail';

alter table holding_lots
  drop constraint if exists holding_lots_lot_kind_check;

alter table holding_lots
  add constraint holding_lots_lot_kind_check
  check (lot_kind in ('retail', 'esop'));

comment on column holding_lots.lot_kind is
  'Sleeve: retail or esop. Default retail. Display-only grouping; not a live P&L write-back.';

-- lot_kind is appended (Postgres CREATE OR REPLACE VIEW may only add columns at the end).
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
  count(*)::integer as lot_count,
  lot_kind
from holding_lots
group by family_id, portfolio_id, ticker, exchange, native_currency, lot_kind;

alter view holdings set (security_invoker = true);

grant select on holdings to authenticated;
