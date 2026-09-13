# Session 2026-09-13 — P1-02 through P1-04

**Chunks:** P1-02 ✅ · P1-03 ✅ · P1-03b ✅ · P1-04 ✅  
**URL:** **http://127.0.0.1:3100/**

## Click paths

- `/login` Sign in (`maya@thesis.demo`) → `/desk`. Wrong password shows banner **Wrong email or password.** Sign out → `/login`.
- `/signup` collects name, tax residency (`us` / `india` / `uae` / `nri`), email, phone (`+91` / `+1` / `+971`), password ≥ 12. Auth `signUp` writes `auth.users`; trigger `handle_new_auth_user` inserts `users`, `families`, `family_members` (owner), `wallets`, `portfolios`.
- `/reset` emails a recovery link. Setting a new password signs out other sessions (`scope: others`).
- Continue with Google is visible. Google is off in this project — map errors to **Google sign-in is not enabled** (button not clicked in browser smoke).
- Desk nav (only): Desk, New analysis, Portfolio, Reports, Usage, Plans & wallet. **No Admin.** `/admin` → `/admin/login` (stub; P7-00 builds the form).
- Header Analyse: `tsm` → `/analyse?ticker=TSM` (empty builder; **no** `thesis_accept_analysis`). `ZZZZ` → `/portfolio?add=ZZZZ`.
- `/desk` reads view `holdings` (5 rows for Maya), `usage_events` kind `search` this month (1), `reports.name` including `MSFT — accumulate on weakness`. Cost × qty only — **not** a live price. Load does **not** insert `usage_events`.

## Not built

- Request builder (P3-00), investor profile (P1-05), admin login form (P7-00).

## Next

[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) **P1-05** (needs named migration **010**).
