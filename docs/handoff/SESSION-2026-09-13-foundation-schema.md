# Session 2026-09-13 — foundation schema

**Status:** SQL **001–008** + Maya seed written. Apply to DEV `cmksomahsfmsjufakryw` with `CONFIRM_APPLY=1 ./tools/db/apply_foundation.sh`.

## Locks from the user

| Topic | Decision |
|-------|----------|
| Stack | Next.js App Router + FastAPI analysis-api/worker |
| Tenancy | `family_id` now so Family accounts later add `family_members` without rewriting reports |
| Auth | Email or phone + password, and Google OAuth signup |
| Target | This URL is DEV. Maya synthetic seed. Never the author's personal book. |
| Holdings | `holding_lots` source of truth + `holdings` average-cost view |

Phone+password: SQL stores unique `phone_e164`. Supabase dashboard must enable Phone (OTP) and Google; we did not build a second password table.

## What `/portfolio` and Desk will read

- `/portfolio` writes `holding_lots`. The table the desk grid reads is view `holdings` (sum qty, weighted average cost). No button exists yet.
- `POST /analysis` (when API exists) will call RPC `thesis_accept_analysis`, which inserts `analysis_requests` + `usage_events` (`kind = search`) for `family_id`. Desk counts `usage_events` for the billing month. Until `apps/analysis-worker` runs, status stays `queued`.

## Apply

```bash
set -a && source .env && set +a
CONFIRM_APPLY=1 ./tools/db/apply_foundation.sh
```

Demo: `maya@thesis.demo` / `ThesisMaya!2026`

Promote yourself: after you sign up (Google), run `tools/db/promote_platform_admin.sql`.

## Not done

- `apps/web` Next.js app
- FastAPI routes
- Enabling Auth providers in the Supabase dashboard
