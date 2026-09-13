# Session 2026-09-13 — P1-05 investor profile (010 not applied)

**Chunk:** P1-05 🟡  
**URL:** **http://127.0.0.1:3100/settings/profile**  
**Who:** family owner saves; family members may read.

## Click paths

- Header name / **Profile** → `/settings/profile`. Sidebar is still Desk, New analysis, Portfolio, Reports, Usage, Plans & wallet. **No Admin.**
- **Save profile** upserts `investor_profiles` for `family_id` of `auth.uid()` when the owner is signed in **and** migration **010** has been applied. The page **reads** the same table. Desk widgets still **read** view `holdings` / `usage_events` / `reports` — they do not read `investor_profiles` yet (that is P1-06).
- Unauthenticated GET `/settings/profile` is 307 to `/login`.
- If **010** is not on DEV, Save is not offered; the page states that `investor_profiles` is missing and that there is **no button** — owner/admin must apply `supabase/migrations/010_investor_profiles.sql`.

## Defaults (not Maya’s book)

- Concentration 15%, tranches 35/25/25/15. **No `max_positions`.**
- India: `cannot_trade_us_options` true, LTCG months **24**, LRS fields shown, `lrs_annual_cap_usd` **null**.
- US: LTCG months **12**, LRS hidden.
- `prompt_versions` bootstrap body (`006`) has no `$150,000`.

## Not done this chunk

- Applying **010** on `cmksomahsfmsjufakryw` (needs you to name the file + `CONFIRM_APPLY=1`).
- Persist smoke: change `ltcg_holding_months` to 18 and reload.
- P1-06 desk flags.

## Next

Name: apply **010** on DEV with `CONFIRM_APPLY=1 ./tools/db/run_migration.sh 010`.
