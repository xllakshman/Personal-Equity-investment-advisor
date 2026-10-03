-- =============================================================================
-- Thesis — Migration 024
-- One in-flight Analyse Submit per family (THS-BUSY-001).
-- thesis_accept_analysis refuses a second insert while analysis_requests.status
-- is queued / gathering / drafting / checking / rendering. Ready, failed, and
-- rejected unlock Submit. Desk also checks before the RPC; this is the lock.
-- =============================================================================

insert into schema_migrations (id, name) values (24, '024_one_inflight_analysis.sql');

create or replace function thesis_accept_analysis(
  p_ticker text,
  p_lenses analysis_lens[],
  p_invested_amount numeric,
  p_portfolio_size numeric,
  p_invested_currency char(3),
  p_intent analysis_intent,
  p_avg_down avg_down_policy,
  p_risk risk_band,
  p_cagr cagr_band,
  p_tax_residency tax_residency,
  p_tax_slab text,
  p_model_id text,
  p_clarifications jsonb default '{}'::jsonb,
  p_exchange text default null,
  p_intended_investment numeric default 0,
  p_run_qty numeric default 0,
  p_run_cost_per_share numeric default 0
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_id uuid;
  v_ticker text := upper(trim(p_ticker));
  v_intended numeric := coalesce(p_intended_investment, 0);
  v_qty numeric := coalesce(p_run_qty, 0);
  v_cost numeric := coalesce(p_run_cost_per_share, 0);
begin
  select fm.family_id into v_family
  from family_members fm
  where fm.user_id = auth.uid()
    and fm.is_active = true
    and fm.member_role in ('owner', 'member')
  order by fm.created_at
  limit 1;

  if v_family is null then
    raise exception 'THS-AUTH-001 no writable family' using errcode = '42501';
  end if;

  if v_ticker is null or v_ticker = '' then
    raise exception 'THS-TICKER-001 ticker is required' using errcode = 'P0001';
  end if;

  if v_intended < 0 or v_qty < 0 or v_cost < 0 then
    raise exception 'THS-HOLDING-002 intended investment cannot be negative' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_family::text)::bigint);

  if thesis_risk_cagr_is_conflict(p_risk, p_cagr) then
    raise exception 'THS-RISK-001 risk/CAGR pair cannot exist' using errcode = '22023';
  end if;

  if p_lenses is null or cardinality(p_lenses) < 1 then
    raise exception 'THS-LENS-001 pick at least one check' using errcode = '22023';
  end if;

  if exists (
    select 1
      from analysis_requests ar
     where ar.family_id = v_family
       and ar.status in ('queued', 'gathering', 'drafting', 'checking', 'rendering')
  ) then
    raise exception 'THS-BUSY-001 finish the current analysis first' using errcode = 'P0001';
  end if;

  perform thesis_assert_quota(v_family);

  insert into analysis_requests (
    family_id, created_by, ticker, exchange, lenses,
    invested_amount, portfolio_size, invested_currency, intended_investment,
    run_qty, run_cost_per_share,
    intent, avg_down, risk_band, cagr_band,
    tax_residency, tax_slab, model_id, clarifications, status
  ) values (
    v_family, auth.uid(), v_ticker, p_exchange, p_lenses,
    p_invested_amount, p_portfolio_size, p_invested_currency, v_intended,
    v_qty, v_cost,
    p_intent, p_avg_down, p_risk, p_cagr,
    p_tax_residency, p_tax_slab, p_model_id, coalesce(p_clarifications, '{}'::jsonb), 'queued'
  ) returning id into v_id;

  insert into usage_events (
    family_id, user_id, kind, model_id, cost_cents, billing_period, request_id
  )
  select v_family, auth.uid(), 'search', p_model_id, mc.cost_cents_per_run,
         thesis_billing_period_start(), v_id
  from model_catalog mc where mc.id = p_model_id;

  return v_id;
end;
$$;

grant execute on function thesis_accept_analysis(
  text, analysis_lens[], numeric, numeric, char(3), analysis_intent, avg_down_policy,
  risk_band, cagr_band, tax_residency, text, text, jsonb, text, numeric, numeric, numeric
) to authenticated;
