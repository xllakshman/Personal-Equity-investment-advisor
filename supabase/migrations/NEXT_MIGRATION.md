-- =============================================================================
-- Next migration (010)
-- =============================================================================

## Applied

See `HANDOFF.md` §6. **001–009** on DEV `cmksomahsfmsjufakryw`. Seed `supabase/seed/001_maya_desk.sql` is not a numbered schema file.

`009_model_catalog_refresh.sql` — applied 2026-09-13 (`CONFIRM_APPLY=1 ./tools/db/run_migration.sh 009`).

## Next

`010_*.sql` — investor_profiles (P1-05) unless you name another file.
