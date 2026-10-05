-- =============================================================================
-- Thesis — Migration 027
-- Analyse credits: Quick search = 1, Frontier search = 1.5 against
-- plans.monthly_analysis_limit (Ultra 80). usage_events.quantity is numeric.
-- Refine / refine_gate stay 1. prompt_extract_attempt and pdf are not summed.
-- Do not apply without CONFIRM_APPLY=1 and a named target (DEV or PROD).
-- =============================================================================

insert into schema_migrations (id, name) values (27, '027_search_credit_quantity.sql');

alter table usage_events
  add column if not exists quantity numeric(8, 2) not null default 1
  check (quantity > 0);

comment on column usage_events.quantity is
  'Plan credits. Search is 1 (Quick) or 1.5 (Frontier). Refine kinds stay 1. Not counted for prompt_extract_attempt or pdf.';

create or replace function thesis_family_meter_count(
  p_family_id uuid,
  p_period date
) returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(ue.quantity), 0)
  from usage_events ue
  where ue.family_id = p_family_id
    and ue.billing_period = p_period
    and ue.kind in ('search', 'refine', 'refine_gate');
$$;

create or replace function thesis_assert_quota(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used numeric;
  v_period date := thesis_billing_period_start();
begin
  select p.monthly_analysis_limit into v_limit
  from families f
  join plans p on p.id = f.plan_id
  where f.id = p_family_id;

  if v_limit is null then
    raise exception 'THS-QUOTA-003 family has no plan' using errcode = 'P0001';
  end if;

  v_used := thesis_family_meter_count(p_family_id, v_period);
  if v_used >= v_limit then
    raise exception 'THS-QUOTA-001 allowance exhausted for this cycle' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function thesis_consume_quota_for_provider(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_status request_status;
  v_limit integer;
  v_others numeric;
  v_period date := thesis_billing_period_start();
begin
  select family_id, status into v_family, v_status
  from analysis_requests where id = p_request_id for update;

  if v_family is null then
    raise exception 'THS-REQ-001 unknown request' using errcode = 'P0001';
  end if;

  if v_status <> 'queued' then
    raise exception 'THS-REQ-002 request not queued' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_family::text)::bigint);

  select p.monthly_analysis_limit into v_limit
  from families f
  join plans p on p.id = f.plan_id
  where f.id = v_family;

  select coalesce(sum(ue.quantity), 0) into v_others
  from usage_events ue
  where ue.family_id = v_family
    and ue.billing_period = v_period
    and ue.kind in ('search', 'refine', 'refine_gate')
    and ue.request_id is distinct from p_request_id;

  if v_others >= v_limit then
    update analysis_requests
       set status = 'rejected',
           error_text = 'THS-QUOTA-002 allowance no longer available at provider start'
     where id = p_request_id;
    raise exception 'THS-QUOTA-002 allowance no longer available at provider start' using errcode = 'P0001';
  end if;

  update analysis_requests
     set status = 'gathering',
         provider_started_at = now()
   where id = p_request_id;
end;
$$;

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
    family_id, user_id, kind, model_id, cost_cents, billing_period, request_id, quantity
  )
  select v_family, auth.uid(), 'search', p_model_id, mc.cost_cents_per_run,
         thesis_billing_period_start(), v_id,
         case when mc.thesis_class = 'frontier' then 1.5 else 1 end
  from model_catalog mc where mc.id = p_model_id;

  return v_id;
end;
$$;

grant execute on function thesis_accept_analysis(
  text, analysis_lens[], numeric, numeric, char(3), analysis_intent, avg_down_policy,
  risk_band, cagr_band, tax_residency, text, text, jsonb, text, numeric, numeric, numeric
) to authenticated;
