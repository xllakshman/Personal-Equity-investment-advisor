-- =============================================================================
-- Thesis — Migration 001
-- Extensions, enums, updated_at helper, schema_migrations
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists schema_migrations (
  id            integer primary key,
  name          text not null unique,
  applied_at    timestamptz not null default now()
);

insert into schema_migrations (id, name) values (1, '001_extensions_enums.sql')
on conflict (id) do nothing;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type tax_residency as enum (
  'us',
  'india',
  'uae',
  'nri'
);

create type app_role as enum (
  'desk_owner',
  'platform_admin'
);

create type family_member_role as enum (
  'owner',
  'member',
  'viewer'
);

create type request_status as enum (
  'queued',
  'gathering',
  'drafting',
  'checking',
  'rendering',
  'ready',
  'failed',
  'rejected'
);

create type usage_kind as enum (
  'search',
  'refine',
  'pdf',
  'prompt_extract_attempt'
);

create type analysis_lens as enum (
  'fundamental',
  'technical',
  'macro',
  'news',
  'tax'
);

create type analysis_intent as enum (
  'long_term',
  'swing',
  'positional_3_9m',
  'undecided'
);

create type avg_down_policy as enum (
  'planned_tranches',
  'thesis_intact_dips',
  'single_entry'
);

-- Mock indices: risk 0–3, cagr 0–3. Conflict when risk <= 1 and cagr >= 2.
create type risk_band as enum (
  'low_0_10',
  'medium_11_20',
  'high_21_35',
  'extreme_35_plus'
);

create type cagr_band as enum (
  'low_12',
  'medium_13_18',
  'high_18_25',
  'extreme_25_plus'
);

create type lot_source as enum (
  'csv',
  'manual'
);

create type billing_provider as enum (
  'upi',
  'card',
  'wallet',
  'manual'
);

create type payment_status as enum (
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled'
);

create or replace function thesis_risk_cagr_is_conflict(
  p_risk risk_band,
  p_cagr cagr_band
) returns boolean
language sql
immutable
as $$
  select (
    p_risk in ('low_0_10', 'medium_11_20')
    and p_cagr in ('high_18_25', 'extreme_25_plus')
  );
$$;

create or replace function thesis_risk_cagr_has_slack(
  p_risk risk_band,
  p_cagr cagr_band
) returns boolean
language sql
immutable
as $$
  select (
    p_risk in ('high_21_35', 'extreme_35_plus')
    and p_cagr = 'low_12'
  );
$$;
