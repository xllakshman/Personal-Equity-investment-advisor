-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–019**. **020** applies when named with `CONFIRM_APPLY=1`.
- **PROD** `ndgvglcrkbygovlszxze`: **001–019** (2026-09-15). **020** applies when named with **prod** + `CONFIRM_APPLY=1`.

## Next on DEV / PROD

`020_intended_investment.sql` — `analysis_requests.intended_investment` + `thesis_accept_analysis` extra arg. Does not write lots.
