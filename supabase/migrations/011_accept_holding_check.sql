-- =============================================================================
-- Thesis — Migration 011
-- thesis_accept_analysis: ticker must exist on holdings (THS-HOLDING-001).
-- Recreate with invested_currency char(3). Quota/conflict unchanged.
-- =============================================================================

insert into schema_migrations (id, name) values (11, '011_accept_holding_check.sql');

drop function if exists thesis_accept_analysis(
  text, analysis_lens[], numeric, numeric, char, analysis_intent, avg_down_policy,
  risk_band, cagr_band, tax_residency, text, text, jsonb, text
);

drop function if exists thesis_accept_analysis(
  text, analysis_lens[], numeric, numeric, char(3), analysis_intent, avg_down_policy,
  risk_band, cagr_band, tax_residency, text, text, jsonb, text
);

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
  p_exchange text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_id uuid;
  v_ticker text := upper(trim(p_ticker));
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
    raise exception 'THS-HOLDING-001 ticker is not on holdings for this family' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from holdings h
    where h.family_id = v_family
      and h.ticker = v_ticker
  ) then
    raise exception 'THS-HOLDING-001 ticker is not on holdings for this family' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_family::text)::bigint);

  if thesis_risk_cagr_is_conflict(p_risk, p_cagr) then
    raise exception 'THS-RISK-001 risk/CAGR pair cannot exist' using errcode = '22023';
  end if;

  if p_lenses is null or cardinality(p_lenses) < 1 then
    raise exception 'THS-LENS-001 pick at least one check' using errcode = '22023';
  end if;

  perform thesis_assert_quota(v_family);

  insert into analysis_requests (
    family_id, created_by, ticker, exchange, lenses,
    invested_amount, portfolio_size, invested_currency,
    intent, avg_down, risk_band, cagr_band,
    tax_residency, tax_slab, model_id, clarifications, status
  ) values (
    v_family, auth.uid(), v_ticker, p_exchange, p_lenses,
    p_invested_amount, p_portfolio_size, p_invested_currency,
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
  risk_band, cagr_band, tax_residency, text, text, jsonb, text
) to authenticated;
