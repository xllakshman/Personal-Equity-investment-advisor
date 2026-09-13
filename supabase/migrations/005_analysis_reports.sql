-- =============================================================================
-- Thesis — Migration 005
-- analysis_requests, evidence, reports (immutable verdict/sections),
-- refinements, usage_events, quota + accept RPCs
-- =============================================================================

insert into schema_migrations (id, name) values (5, '005_analysis_reports.sql');

create table analysis_requests (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references families(id) on delete cascade,
  created_by          uuid not null references users(id),
  ticker              text not null,
  exchange            text,
  lenses              analysis_lens[] not null,
  invested_amount     numeric(20, 6) not null default 0,
  portfolio_size      numeric(20, 6) not null default 0,
  invested_currency   char(3) not null default 'USD',
  intent              analysis_intent not null,
  avg_down            avg_down_policy not null,
  risk_band           risk_band not null,
  cagr_band           cagr_band not null,
  tax_residency       tax_residency not null,
  tax_slab            text,
  model_id            text not null references model_catalog(id),
  clarifications      jsonb not null default '{}'::jsonb,
  status              request_status not null default 'queued',
  error_text          text,
  accepted_at         timestamptz not null default now(),
  provider_started_at timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint analysis_requests_lenses_nonempty check (cardinality(lenses) >= 1),
  constraint analysis_requests_no_conflict check (
    not thesis_risk_cagr_is_conflict(risk_band, cagr_band)
  )
);

create trigger analysis_requests_updated_at
  before update on analysis_requests for each row execute function set_updated_at();

create index analysis_requests_family_status_idx
  on analysis_requests (family_id, status, created_at desc);

create table analysis_evidence (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references analysis_requests(id) on delete cascade,
  family_id       uuid not null references families(id) on delete cascade,
  step0_number    integer not null check (step0_number between 1 and 7),
  query           text not null,
  source_url      text,
  excerpt         text,
  retrieved_at    timestamptz not null default now()
);

create table reports (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null unique references analysis_requests(id),
  family_id           uuid not null references families(id) on delete cascade,
  created_by          uuid not null references users(id),
  name                text not null,
  ticker              text not null,
  verdict             text not null,
  conviction          text,
  sections            jsonb not null default '{}'::jsonb,
  charts              jsonb not null default '{}'::jsonb,
  pdf_key             text,
  prompt_version_id   uuid,
  model_id            text not null references model_catalog(id),
  token_cost_cents    integer not null default 0,
  page_count          integer,
  is_library_sample   boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger reports_updated_at
  before update on reports for each row execute function set_updated_at();

create or replace function reports_forbid_rewrite()
returns trigger
language plpgsql
as $$
begin
  if new.verdict is distinct from old.verdict
     or new.sections is distinct from old.sections
     or new.charts is distinct from old.charts
     or new.prompt_version_id is distinct from old.prompt_version_id
     or new.request_id is distinct from old.request_id
     or new.family_id is distinct from old.family_id
     or new.is_library_sample is distinct from old.is_library_sample
  then
    raise exception 'reports are immutable after save (refinements append)';
  end if;
  return new;
end;
$$;

create trigger reports_forbid_rewrite
  before update on reports
  for each row execute function reports_forbid_rewrite();

create table refinements (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references reports(id) on delete cascade,
  family_id       uuid not null references families(id) on delete cascade,
  created_by      uuid not null references users(id),
  user_text       text not null,
  focus_tags      text[] not null default '{}',
  response        text,
  was_refused     boolean not null default false,
  refusal_reason  text,
  created_at      timestamptz not null default now()
);

create table usage_events (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  user_id           uuid not null references users(id),
  kind              usage_kind not null,
  model_id          text references model_catalog(id),
  cost_cents        integer not null default 0,
  billing_period    date not null,
  request_id        uuid references analysis_requests(id),
  report_id         uuid references reports(id),
  created_at        timestamptz not null default now()
);

create index usage_events_family_period_idx
  on usage_events (family_id, billing_period, kind);

create or replace function thesis_billing_period_start(p_ts timestamptz default now())
returns date
language sql
immutable
as $$
  select date_trunc('month', p_ts)::date;
$$;

create or replace function thesis_family_search_count(
  p_family_id uuid,
  p_period date
) returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from usage_events ue
  where ue.family_id = p_family_id
    and ue.billing_period = p_period
    and ue.kind = 'search';
$$;

create or replace function thesis_assert_quota(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
  v_period date := thesis_billing_period_start();
begin
  select p.monthly_analysis_limit into v_limit
  from families f
  join plans p on p.id = f.plan_id
  where f.id = p_family_id;

  if v_limit is null then
    raise exception 'THS-QUOTA-003 family has no plan' using errcode = 'P0001';
  end if;

  v_used := thesis_family_search_count(p_family_id, v_period);
  if v_used >= v_limit then
    raise exception 'THS-QUOTA-001 allowance exhausted for this cycle' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function thesis_accept_analysis(
  p_ticker text,
  p_lenses analysis_lens[],
  p_invested_amount numeric,
  p_portfolio_size numeric,
  p_invested_currency char,
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
    v_family, auth.uid(), upper(trim(p_ticker)), p_exchange, p_lenses,
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

-- Worker: second quota check immediately before the provider call (D5).
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
  v_others integer;
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

  -- Exclude this request's accept-time reservation. Other jobs queued after
  -- us can exhaust the cycle; then we must not call the provider (D5).
  select count(*)::integer into v_others
  from usage_events ue
  where ue.family_id = v_family
    and ue.billing_period = v_period
    and ue.kind = 'search'
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

create or replace function report_rename(p_report_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'THS-REP-001 name required' using errcode = '22023';
  end if;
  update reports
     set name = trim(p_name)
   where id = p_report_id
     and user_can_write_family(family_id);
  if not found then
    raise exception 'THS-REP-002 not found or not writable' using errcode = '42501';
  end if;
end;
$$;

grant execute on function thesis_accept_analysis(
  text, analysis_lens[], numeric, numeric, char, analysis_intent, avg_down_policy,
  risk_band, cagr_band, tax_residency, text, text, jsonb, text
) to authenticated;

grant execute on function report_rename(uuid, text) to authenticated;
grant execute on function thesis_risk_cagr_is_conflict(risk_band, cagr_band) to authenticated;
grant execute on function thesis_risk_cagr_has_slack(risk_band, cagr_band) to authenticated;
grant execute on function thesis_consume_quota_for_provider(uuid) to service_role;
