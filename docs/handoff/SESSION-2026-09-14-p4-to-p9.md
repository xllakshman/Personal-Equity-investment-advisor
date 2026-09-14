# Session 2026-09-14 — Phases 4–9 on DEV, P10 scaffold

Port **3100**. Demo `maya@thesis.demo` / `ThesisMaya!2026`.

## Shipped

- Worker/API already in git; refine pack now loads `holdings` / `analysis_evidence` / `investor_profiles`.
- `/reports` lists `reports` (name, ticker, model, verdict, cost). `/reports/[id]` reads `reports.sections` (no innerHTML). `report_rename` updates `reports.name` only. PDF button calls analysis-api `GET /reports/:id/pdf`. Satisfaction: RPC `thesis_submit_analysis_feedback` → `analysis_feedback` (**013**). Sample notes have no form.
- `/usage` counts `usage_events` kinds search+refine+refine_gate (same as `thesis_family_meter_count`). `/billing` reads `plans` / `wallets`. Pay does not insert `invoices` (P6-03 placeholder).
- `/admin/login` → `/admin/accounts` for `users.role = platform_admin` only. Maya is rejected. Desk JWT cannot open admin. **014–018** on DEV.
- `/settings/family` `thesis_invite_family_member`. `/settings/crash-letter` → `crash_letters`. `/research/managers` → `manager_watches`. Weekly opt-in on `/billing` → `families.weekly_digest_opt_in`; no email send.

## Not done (needs you to name **prod**)

- P10-00 apply 001–018 on `ndgvglcrkbygovlszxze`
- P10-01 Vercel Production env + eqveste.com
- P10-02 DigitalOcean droplet (`infra/docker`)

DEV DB: `schema_migrations` **1–18**. Local `.env` still DEV. `.env.prod` was not read.
