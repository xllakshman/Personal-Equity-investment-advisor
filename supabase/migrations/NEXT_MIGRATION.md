-- =============================================================================
-- Next migration
-- =============================================================================

## Applied

See `HANDOFF.md` §6.

- **DEV** `cmksomahsfmsjufakryw`: **001–011** + seed `supabase/seed/001_maya_desk.sql`.
- **PROD** `ndgvglcrkbygovlszxze` (`https://ndgvglcrkbygovlszxze.supabase.co`): URL recorded 2026-09-14. **No Thesis migrations applied** from this repo until you name **prod** + the file + `CONFIRM_APPLY=1`.

`009_model_catalog_refresh.sql` — applied on DEV 2026-09-13.
`010_investor_profiles.sql` — applied on DEV 2026-09-13.
`011_accept_holding_check.sql` — applied on DEV 2026-09-13.

## Next on DEV

`012_worker_quotes_and_gate.sql` — drafted (eod_quotes, refine_gate usage kind, meter count). **Not applied** until you name this file and `CONFIRM_APPLY=1`.
