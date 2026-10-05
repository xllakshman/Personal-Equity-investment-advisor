-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–026** (026 on 2026-10-04).
- **PROD** `ndgvglcrkbygovlszxze`: **001–026** (026 on 2026-10-04). Maya seed not applied. `holdings` = 0.

## Next on DEV / PROD

**027** `027_search_credit_quantity.sql` is in git, **not applied**. Frontier search `usage_events.quantity = 1.5` vs Quick `1`. Do not apply until the user names DEV or PROD, the file, and `CONFIRM_APPLY=1`.
