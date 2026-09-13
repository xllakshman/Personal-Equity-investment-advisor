-- =============================================================================
-- Thesis — Migration 009
-- Refresh model_catalog (2026-09-13). Keep Maya FKs opus5 / gpt56 / gpt56m / sonnet48 / gemini35.
-- Worker calls OpenRouter with openrouter_model_id + openrouter_only (D36/D39).
-- Do not apply without CONFIRM_APPLY=1.
-- =============================================================================

insert into schema_migrations (id, name) values (9, '009_model_catalog_refresh.sql')
on conflict (id) do nothing;

alter table model_catalog
  add column if not exists vendor_class text not null default 'unspecified',
  add column if not exists thesis_class text not null default 'quick'
    check (thesis_class in ('frontier', 'quick')),
  add column if not exists is_refine_gate boolean not null default false,
  add column if not exists sort_order integer not null default 100,
  add column if not exists openrouter_model_id text,
  add column if not exists openrouter_only text;

comment on column model_catalog.vendor_class is
  'Lab''s own class name (Opus, Flash, Luna, Flagship, …).';
comment on column model_catalog.thesis_class is
  'Picker grouping: frontier | quick.';
comment on column model_catalog.provider_model_id is
  'Lab-native model id (docs / optional later native path).';
comment on column model_catalog.openrouter_model_id is
  'OpenRouter slug the worker must send as model. Never swap.';
comment on column model_catalog.openrouter_only is
  'OpenRouter provider.only pin. allow_fallbacks must be false.';

-- Existing rows: fix API ids; keep catalog ids for seed FKs.
update model_catalog set
  label = 'Claude Opus 5',
  provider_model_id = 'claude-opus-5',
  openrouter_model_id = 'anthropic/claude-opus-5',
  openrouter_only = 'anthropic',
  vendor_class = 'Opus',
  thesis_class = 'frontier',
  tier = 'Frontier',
  min_plan_slug = 'professional',
  cost_cents_per_run = 150,
  sort_order = 20
where id = 'opus5';

update model_catalog set
  label = 'GPT-5.6 Sol',
  provider_model_id = 'gpt-5.6-sol',
  openrouter_model_id = 'openai/gpt-5.6-sol',
  openrouter_only = 'openai',
  vendor_class = 'Flagship',
  thesis_class = 'frontier',
  tier = 'Frontier',
  min_plan_slug = 'professional',
  cost_cents_per_run = 150,
  sort_order = 11
where id = 'gpt56';

update model_catalog set
  label = 'GPT-5.6 Luna',
  provider_model_id = 'gpt-5.6-luna',
  openrouter_model_id = 'openai/gpt-5.6-luna',
  openrouter_only = 'openai',
  vendor_class = 'Cost-sensitive',
  thesis_class = 'quick',
  is_refine_gate = true,
  tier = 'Quick',
  min_plan_slug = 'trial',
  cost_cents_per_run = 50,
  sort_order = 13
where id = 'gpt56m';

update model_catalog set
  label = 'Claude Sonnet 5',
  provider_model_id = 'claude-sonnet-5',
  openrouter_model_id = 'anthropic/claude-sonnet-5',
  openrouter_only = 'anthropic',
  vendor_class = 'Sonnet',
  thesis_class = 'quick',
  tier = 'Quick',
  min_plan_slug = 'basic',
  cost_cents_per_run = 80,
  sort_order = 21
where id = 'sonnet48';

update model_catalog set
  label = 'Gemini 3.1 Pro (legacy id)',
  provider_model_id = 'gemini-3.1-pro-preview',
  openrouter_model_id = 'google/gemini-3.1-pro-preview',
  openrouter_only = 'google-ai-studio',
  vendor_class = 'Pro',
  thesis_class = 'frontier',
  tier = 'Frontier',
  is_active = false,
  min_plan_slug = 'professional',
  cost_cents_per_run = 150,
  sort_order = 99
where id = 'gemini35';

insert into model_catalog (
  id, label, provider, provider_model_id, openrouter_model_id, openrouter_only,
  vendor_class, thesis_class, tier, is_refine_gate, cost_cents_per_run, min_plan_slug, is_active, sort_order
) values
  ('gpt6a', 'GPT-6 Astra', 'openai', 'gpt-6-astra', 'openai/gpt-6-astra', 'openai', 'Flagship', 'frontier', 'Frontier', false, 180, 'professional', true, 10),
  ('gpt56t', 'GPT-5.6 Terra', 'openai', 'gpt-5.6-terra', 'openai/gpt-5.6-terra', 'openai', 'Balanced', 'quick', 'Quick', false, 80, 'basic', true, 12),
  ('fable51', 'Claude Fable 5.1', 'anthropic', 'claude-fable-5-1', 'anthropic/claude-fable-5.1', 'anthropic', 'Fable', 'frontier', 'Frontier', false, 180, 'professional', true, 19),
  ('haiku45', 'Claude Haiku 4.5', 'anthropic', 'claude-haiku-4-5', 'anthropic/claude-haiku-4.5', 'anthropic', 'Haiku', 'quick', 'Quick', true, 40, 'trial', true, 22),
  ('gemini31p', 'Gemini 3.1 Pro', 'google', 'gemini-3.1-pro-preview', 'google/gemini-3.1-pro-preview', 'google-ai-studio', 'Pro', 'frontier', 'Frontier', false, 150, 'professional', true, 30),
  ('gemini38f', 'Gemini 3.8 Flash', 'google', 'gemini-3.8-flash', 'google/gemini-3.8-flash', 'google-ai-studio', 'Flash', 'quick', 'Quick', false, 60, 'basic', true, 31),
  ('gemini31fl', 'Gemini 3.1 Flash-Lite', 'google', 'gemini-3.1-flash-lite', 'google/gemini-3.1-flash-lite', 'google-ai-studio', 'Flash-Lite', 'quick', 'Quick', true, 30, 'trial', true, 32),
  ('dsflash', 'DeepSeek V4.1 Flash', 'deepseek', 'deepseek-flash', 'deepseek/deepseek-flash', 'deepseek', 'Flash', 'quick', 'Quick', true, 40, 'trial', true, 40),
  ('grok46', 'Grok 4.6', 'xai', 'grok-4.6', 'x-ai/grok-4.6', 'x-ai', 'Frontier', 'frontier', 'Frontier', false, 150, 'professional', true, 50),
  ('grok43', 'Grok 4.3', 'xai', 'grok-4.3', 'x-ai/grok-4.3', 'x-ai', 'General', 'quick', 'Quick', false, 80, 'basic', true, 51),
  ('grokbuild', 'Grok Build 0.1', 'xai', 'grok-build-0.1', 'x-ai/grok-build-0.1', 'x-ai', 'Fast coding', 'quick', 'Quick', false, 60, 'basic', true, 52),
  ('kimik3', 'Kimi K3', 'moonshot', 'kimi-k3', 'moonshotai/kimi-k3', 'moonshotai', 'K3', 'frontier', 'Frontier', false, 150, 'professional', true, 60),
  ('kimik26', 'Kimi K2.6', 'moonshot', 'kimi-k2.6', 'moonshotai/kimi-k2.6', 'moonshotai', 'K2.6', 'quick', 'Quick', false, 70, 'basic', true, 61),
  ('kimik27hs', 'Kimi K2.7 Code HighSpeed', 'moonshot', 'kimi-k2.7-code-highspeed', 'moonshotai/kimi-k2.7-code-highspeed', 'moonshotai', 'HighSpeed', 'quick', 'Quick', false, 60, 'basic', true, 62)
on conflict (id) do update set
  label = excluded.label,
  provider = excluded.provider,
  provider_model_id = excluded.provider_model_id,
  openrouter_model_id = excluded.openrouter_model_id,
  openrouter_only = excluded.openrouter_only,
  vendor_class = excluded.vendor_class,
  thesis_class = excluded.thesis_class,
  tier = excluded.tier,
  is_refine_gate = excluded.is_refine_gate,
  cost_cents_per_run = excluded.cost_cents_per_run,
  min_plan_slug = excluded.min_plan_slug,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

alter table model_catalog
  alter column openrouter_model_id set not null,
  alter column openrouter_only set not null;

-- Trial / Basic: Quick only. Professional+: every active row.
update plans
set allowed_model_ids = coalesce((
  select array_agg(mc.id order by mc.sort_order)
  from model_catalog mc
  where mc.is_active and mc.thesis_class = 'quick'
), '{}')
where slug in ('trial', 'basic');

update plans
set allowed_model_ids = coalesce((
  select array_agg(mc.id order by mc.sort_order)
  from model_catalog mc
  where mc.is_active
), '{}')
where slug in ('professional', 'premium', 'ultra');
