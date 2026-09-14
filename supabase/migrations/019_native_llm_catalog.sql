-- =============================================================================
-- Thesis — Migration 019
-- Native lab APIs only (OpenAI, Anthropic, xAI, DeepSeek). Hide Gemini / Kimi.
-- Worker uses model_catalog.provider + provider_model_id (D39). OpenRouter unused.
-- Do not apply without CONFIRM_APPLY=1 and a named target.
-- =============================================================================

insert into schema_migrations (id, name) values (19, '019_native_llm_catalog.sql')
on conflict (id) do nothing;

update model_catalog
   set is_active = false
 where provider in ('google', 'moonshot');

comment on column model_catalog.provider_model_id is
  'Lab-native model id sent as HTTP model to that lab (OpenAI / Anthropic / xAI / DeepSeek).';
comment on column model_catalog.openrouter_model_id is
  'Unused after native-lab transport (D39). Kept so 009 rows remain valid.';
comment on column model_catalog.openrouter_only is
  'Unused after native-lab transport (D39). Kept so 009 rows remain valid.';

-- Trial / Basic: Quick native rows only. Professional+: every remaining active row.
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
