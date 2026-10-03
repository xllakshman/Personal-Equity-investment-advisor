-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–019**. **020** and **021** apply when named with `CONFIRM_APPLY=1`.
- **PROD** `ndgvglcrkbygovlszxze`: **001–019** (2026-09-15). **020** and **021** apply when named with **prod** + `CONFIRM_APPLY=1`.

## Next on DEV / PROD

`021_analyse_without_holding.sql` — drop the holdings gate on `thesis_accept_analysis`. Also adds `intended_investment` if **020** is not applied yet. Does not write lots.
