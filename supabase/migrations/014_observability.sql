-- =============================================================================
-- Thesis — Migration 014
-- Observability capture (P7-05). Never store prompt body, sections, lots, JWT.
-- =============================================================================

insert into schema_migrations (id, name) values (14, '014_observability.sql');

create table observability_events (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid references families(id) on delete set null,
  user_id       uuid references users(id) on delete set null,
  product_id    text not null,
  route         text,
  status_code   integer,
  duration_ms   integer,
  error_code    text,
  created_at    timestamptz not null default now(),
  constraint observability_events_product_chk check (product_id in (
    'auth', 'desk', 'analyse', 'portfolio', 'reports', 'refine', 'billing', 'worker'
  ))
);

create index observability_events_created_idx on observability_events (created_at desc);
create index observability_events_product_idx on observability_events (product_id, created_at desc);

create table observability_minute_buckets (
  bucket_start  timestamptz not null,
  product_id    text not null,
  route         text not null default '',
  calls         integer not null default 0,
  failed        integer not null default 0,
  duration_ms_sum integer not null default 0,
  primary key (bucket_start, product_id, route)
);

create table observability_thresholds (
  id            uuid primary key default gen_random_uuid(),
  watch_kind    text not null unique,
  label         text not null,
  limit_value   numeric not null,
  unit          text not null default 'count',
  updated_at    timestamptz not null default now()
);

create table observability_alert_events (
  id            uuid primary key default gen_random_uuid(),
  watch_kind    text not null,
  fired_at      timestamptz not null default now(),
  payload       jsonb not null default '{}'::jsonb
);

create table observability_settings (
  id            uuid primary key default gen_random_uuid(),
  extra_emails  text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

insert into observability_thresholds (watch_kind, label, limit_value, unit) values
  ('failed_pct', 'Failed %', 10, 'pct'),
  ('analyse_slow_ms', 'Slow Analyse (ms)', 8000, 'ms'),
  ('signin_failures', 'Sign-in failures', 20, 'count'),
  ('worker_stuck', 'Worker jobs stuck queued/failed', 5, 'count'),
  ('no_success_24h', 'No successful analyse in 24h after traffic', 1, 'flag');

create or replace function observability_record_event(
  p_product_id text,
  p_route text default null,
  p_status_code integer default 200,
  p_duration_ms integer default 0,
  p_error_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_family uuid;
  v_bucket timestamptz;
  v_failed integer;
begin
  if p_product_id not in ('auth','desk','analyse','portfolio','reports','refine','billing','worker') then
    raise exception 'THS-OBS-001 unknown product' using errcode = '22023';
  end if;
  select fm.family_id into v_family
    from family_members fm
   where fm.user_id = auth.uid() and fm.is_active = true
   limit 1;

  insert into observability_events (
    family_id, user_id, product_id, route, status_code, duration_ms, error_code
  ) values (
    v_family, auth.uid(), p_product_id, left(coalesce(p_route, ''), 200),
    p_status_code, greatest(coalesce(p_duration_ms, 0), 0), left(coalesce(p_error_code, ''), 40)
  )
  returning id into v_id;

  v_bucket := date_trunc('minute', now());
  v_failed := case when coalesce(p_status_code, 200) >= 400 then 1 else 0 end;
  insert into observability_minute_buckets as b (
    bucket_start, product_id, route, calls, failed, duration_ms_sum
  ) values (
    v_bucket, p_product_id, left(coalesce(p_route, ''), 200), 1, v_failed, greatest(coalesce(p_duration_ms, 0), 0)
  )
  on conflict (bucket_start, product_id, route) do update
    set calls = b.calls + 1,
        failed = b.failed + v_failed,
        duration_ms_sum = b.duration_ms_sum + excluded.duration_ms_sum;
  return v_id;
end;
$$;

create or replace function observability_upsert_threshold(
  p_watch_kind text,
  p_limit_value numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_current_user_platform_admin() then
    raise exception 'THS-ADM-001 platform admin required' using errcode = '42501';
  end if;
  update observability_thresholds
     set limit_value = p_limit_value, updated_at = now()
   where watch_kind = p_watch_kind;
end;
$$;

alter table observability_events enable row level security;
alter table observability_events force row level security;
create policy observability_events_admin on observability_events
  for select using (is_current_user_platform_admin());
create policy observability_events_insert_own on observability_events
  for insert with check (user_id = auth.uid() or is_current_user_platform_admin());

alter table observability_minute_buckets enable row level security;
alter table observability_minute_buckets force row level security;
create policy observability_buckets_admin on observability_minute_buckets
  for select using (is_current_user_platform_admin());

alter table observability_thresholds enable row level security;
alter table observability_thresholds force row level security;
create policy observability_thresholds_admin on observability_thresholds
  for all using (is_current_user_platform_admin())
  with check (is_current_user_platform_admin());

alter table observability_alert_events enable row level security;
alter table observability_alert_events force row level security;
create policy observability_alerts_admin on observability_alert_events
  for select using (is_current_user_platform_admin());

alter table observability_settings enable row level security;
alter table observability_settings force row level security;
create policy observability_settings_admin on observability_settings
  for all using (is_current_user_platform_admin())
  with check (is_current_user_platform_admin());

grant execute on function observability_record_event(text, text, integer, integer, text) to authenticated;
grant execute on function observability_upsert_threshold(text, numeric) to authenticated;
grant select, insert on observability_events to authenticated;
grant select on observability_minute_buckets to authenticated;
grant select on observability_thresholds to authenticated;
