-- =============================================================================
-- Seed 001 — synthetic Maya desk (never the author's personal May 2026 book)
-- Demo login: maya@thesis.demo / ThesisMaya!2026
-- =============================================================================

do $$
declare
  v_id uuid := '11111111-1111-4111-8111-111111111111';
  v_family uuid;
  v_portfolio uuid;
  v_plan uuid;
  v_prompt uuid;
  v_req uuid;
  v_sample_req uuid;
begin
  if exists (select 1 from auth.users where id = v_id) then
    raise notice 'Maya auth user already exists — skipping seed 001';
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    'maya@thesis.demo',
    extensions.crypt('ThesisMaya!2026', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maya Raghavan","tax_residency":"us"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_id,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', 'maya@thesis.demo'),
    'email',
    v_id::text,
    now(),
    now(),
    now()
  );

  update users
     set full_name = 'Maya Raghavan',
         tax_residency = 'us',
         tax_slab = '24%'
   where id = v_id;

  select id into v_plan from plans where slug = 'professional';
  select fm.family_id into v_family from family_members fm where fm.user_id = v_id limit 1;
  select id into v_portfolio from portfolios where family_id = v_family;
  select id into v_prompt from prompt_versions where semver = 'v0.1.0-bootstrap';

  update families
     set name = 'Maya''s desk',
         plan_id = v_plan,
         billing_status = 'subscribed'
   where id = v_family;

  insert into holding_lots (
    family_id, portfolio_id, ticker, exchange, company_name,
    qty, cost_per_share, native_currency, purchased_at, source, created_by
  ) values
    (v_family, v_portfolio, 'MSFT', 'NASDAQ', 'Microsoft Corp', 28, 402.5, 'USD', '2024-11-12', 'csv', v_id),
    (v_family, v_portfolio, 'TSM', 'NYSE', 'Taiwan Semiconductor', 60, 168.0, 'USD', '2025-03-04', 'csv', v_id),
    (v_family, v_portfolio, 'UNH', 'NYSE', 'UnitedHealth Group', 14, 512.0, 'USD', '2025-01-22', 'csv', v_id),
    (v_family, v_portfolio, 'HDFCBANK', 'NSE', 'HDFC Bank', 120, 18.4, 'USD', '2025-06-18', 'csv', v_id),
    (v_family, v_portfolio, 'BRK.B', 'NYSE', 'Berkshire Hathaway B', 9, 438.0, 'USD', '2024-08-09', 'csv', v_id);

  insert into analysis_requests (
    id, family_id, created_by, ticker, exchange, lenses,
    invested_amount, portfolio_size, invested_currency,
    intent, avg_down, risk_band, cagr_band, tax_residency, tax_slab,
    model_id, status, completed_at
  ) values (
    'aaaaaaaa-1111-4111-8111-111111111111',
    v_family, v_id, 'MSFT', 'NASDAQ',
    array['fundamental', 'technical']::analysis_lens[],
    12000, 150000, 'USD',
    'long_term', 'planned_tranches', 'medium_11_20', 'medium_13_18',
    'us', '24%', 'opus5', 'ready', now()
  ) returning id into v_req;

  insert into reports (
    family_id, request_id, created_by, name, ticker, verdict, conviction,
    sections, charts, prompt_version_id, model_id, token_cost_cents, page_count,
    is_library_sample
  ) values (
    v_family, v_req, v_id,
    'MSFT — accumulate on weakness',
    'MSFT',
    'Accumulate',
    'medium',
    '{"verdict":"Synthetic Maya seed — not a live underwrite."}'::jsonb,
    '{}'::jsonb,
    v_prompt,
    'opus5',
    42,
    11,
    false
  );

  insert into analysis_requests (
    family_id, created_by, ticker, lenses,
    invested_amount, portfolio_size, intent, avg_down, risk_band, cagr_band,
    tax_residency, model_id, status, completed_at
  ) values (
    v_family, v_id, 'DEMO', array['fundamental']::analysis_lens[],
    0, 150000, 'undecided', 'single_entry', 'medium_11_20', 'medium_13_18',
    'us', 'gpt56m', 'ready', now()
  ) returning id into v_sample_req;

  insert into reports (
    family_id, request_id, created_by, name, ticker, verdict,
    sections, prompt_version_id, model_id, token_cost_cents, page_count,
    is_library_sample
  ) values (
    v_family, v_sample_req, v_id,
    'Sample: how a Thesis note reads',
    'DEMO',
    'Sample',
    '{"verdict":"Read-only sample. Does not count against allowance."}'::jsonb,
    v_prompt,
    'gpt56m',
    0,
    12,
    true
  );

  insert into usage_events (
    family_id, user_id, kind, model_id, cost_cents, billing_period, request_id
  ) values (
    v_family, v_id, 'search', 'opus5', 150, date_trunc('month', now())::date, v_req
  );
end;
$$;
