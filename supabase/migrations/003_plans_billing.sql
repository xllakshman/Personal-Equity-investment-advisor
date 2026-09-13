-- =============================================================================
-- Thesis — Migration 003
-- plans, model catalog, wallets, billing rows, auth signup trigger
-- Allowances and 60/80/90/100 notices are rows (D9).
-- =============================================================================

insert into schema_migrations (id, name) values (3, '003_plans_billing.sql');

create table plans (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text not null unique,
  name                      text not null,
  price_cents               integer not null default 0,
  currency                  char(3) not null default 'USD',
  interval                  text not null default 'month',
  monthly_analysis_limit    integer not null,
  allowed_model_ids         text[] not null default '{}',
  who_copy                  text not null default '',
  why_copy                  text not null default '',
  is_active                 boolean not null default true,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger plans_updated_at
  before update on plans for each row execute function set_updated_at();

alter table families
  add constraint families_plan_id_fkey
  foreign key (plan_id) references plans(id);

create table plan_notice_thresholds (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references plans(id) on delete cascade,
  pct         integer not null check (pct in (60, 80, 90, 100)),
  message     text not null,
  unique (plan_id, pct)
);

create table model_catalog (
  id                    text primary key,
  label                 text not null,
  provider              text not null,
  provider_model_id     text not null,
  tier                  text not null,
  cost_cents_per_run    integer not null,
  min_plan_slug         text not null references plans(slug),
  is_active             boolean not null default true
);

create table wallets (
  family_id       uuid primary key references families(id) on delete cascade,
  balance_cents   integer not null default 0 check (balance_cents >= 0),
  updated_at      timestamptz not null default now()
);

create table wallet_topups (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  amount_cents    integer not null check (amount_cents > 0),
  currency        char(3) not null default 'USD',
  provider        billing_provider not null,
  provider_ref    text unique,
  status          payment_status not null default 'pending',
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger wallet_topups_updated_at
  before update on wallet_topups for each row execute function set_updated_at();

create table invoices (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  plan_id         uuid references plans(id),
  amount_cents    integer not null,
  currency        char(3) not null default 'USD',
  provider        billing_provider not null,
  provider_ref    text unique,
  status          payment_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger invoices_updated_at
  before update on invoices for each row execute function set_updated_at();

insert into plans (slug, name, price_cents, monthly_analysis_limit, allowed_model_ids, who_copy, why_copy, sort_order) values
  ('trial', 'Free trial', 0, 3, array['gpt56m'],
   'Judge the notes before you pay. Card not required.',
   'Three analyses. Sample library notes do not count.', 0),
  ('basic', 'Basic', 1900, 5, array['gpt56m', 'sonnet48'],
   'A few names, checked properly.',
   'Quick agents only. Five full notes a month.', 1),
  ('professional', 'Professional', 4900, 20, array['gpt56m', 'sonnet48', 'opus5', 'gpt56', 'gemini35'],
   'A working book you actually size.',
   'Frontier agents. Twenty notes. Tax-aware exits.', 2),
  ('premium', 'Premium', 9900, 50, array['gpt56m', 'sonnet48', 'opus5', 'gpt56', 'gemini35'],
   'Active desk, many names, weekly review.',
   'Fifty notes. Same frontier models as Professional.', 3),
  ('ultra', 'Ultra Premium', 14900, 80, array['gpt56m', 'sonnet48', 'opus5', 'gpt56', 'gemini35'],
   'Full-time research habit.',
   'Eighty notes. Wallet still available on top.', 4);

insert into plan_notice_thresholds (plan_id, pct, message)
select p.id, t.pct, t.message
from plans p
cross join (values
  (60, 'You have used 60% of this cycle''s analyses.'),
  (80, 'You have used 80% of this cycle''s analyses.'),
  (90, 'You have used 90% of this cycle''s analyses. New runs stop at 100%.'),
  (100, 'Allowance exhausted. Saved notes stay readable.')
) as t(pct, message);

insert into model_catalog (id, label, provider, provider_model_id, tier, cost_cents_per_run, min_plan_slug) values
  ('opus5', 'Frontier agent · Opus 5', 'anthropic', 'claude-opus-4-8', 'Frontier', 150, 'professional'),
  ('gpt56', 'Frontier agent · GPT-5.6', 'openai', 'gpt-5.6', 'Frontier', 150, 'professional'),
  ('gemini35', 'Frontier agent · Gemini 3.5 Pro', 'google', 'gemini-3.5-pro', 'Frontier', 150, 'professional'),
  ('sonnet48', 'Quick agent · Sonnet 4.8', 'anthropic', 'claude-sonnet-4-8', 'Balanced', 100, 'basic'),
  ('gpt56m', 'Quick agent · GPT-5.6 mini', 'openai', 'gpt-5.6-mini', 'Economy', 100, 'trial');

-- Signup: one family per new auth user. Later Family accounts ADD members to
-- this row; they do not move reports.
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
