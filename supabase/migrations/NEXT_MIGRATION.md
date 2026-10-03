-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–022**.
- **PROD** `ndgvglcrkbygovlszxze`: **001–022** (021–022 on 2026-10-03). Maya seed not applied.

## Next on DEV / PROD

**023** [`023_admin_prompt_promote.sql`](023_admin_prompt_promote.sql) — grant `prompt_versions` to `authenticated` (RLS still `platform_admin`) + `thesis_admin_promote_prompt`. Apply only with `CONFIRM_APPLY=1` and a named target.
