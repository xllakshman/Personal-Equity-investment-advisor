-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–025** (025 on 2026-10-04).
- **PROD** `ndgvglcrkbygovlszxze`: **001–025** (025 on 2026-10-04). Maya seed not applied. `holdings` = 0.

## Next on DEV / PROD

**026** `026_admin_prompt_remove.sql` is in git. Not applied. Needs named env + `CONFIRM_APPLY=1`. Adds `prompt_versions.archived_at` and `thesis_admin_remove_prompt` (refuses the In use row).
