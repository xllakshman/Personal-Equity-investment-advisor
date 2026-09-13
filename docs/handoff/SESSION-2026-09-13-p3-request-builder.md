# Session 2026-09-13 — Phase 3 request builder

**Chunks:** P3-00 … P3-03 ✅  
**URL:** **http://127.0.0.1:3100/analyse**  
**Who:** family write (`owner` / `member`) calls `thesis_accept_analysis`. Family read on `/analyse/[id]` and `/reports`.

## Click paths

- Sidebar **New analysis** or header Analyse (held ticker) → `/analyse?ticker=MSFT`.
- Page **reads** view `holdings` (prefill invested = qty × cost_per_share), `model_catalog` where `is_active`, `plans.allowed_model_ids`, `users` tax fields, `investor_profiles` rates if the row exists.
- **Continue** does **not** insert. It opens the clarify step on the same route.
- **Run analysis** or **Skip — record assumptions** is the button that calls RPC `thesis_accept_analysis`. That **writes** `analysis_requests` (`status = queued`) and `usage_events` (`kind = search`). Desk **Analyses this cycle** counts those `usage_events` for the family in the current billing month.
- Redirect to `/analyse/[id]`, which **reads** `analysis_requests.status`. Next.js does not start `apps/analysis-worker`, so the row stays `queued`. `/reports` **reads** `reports.name` only — no new ready note until the worker inserts a `reports` row.

## Holding gate (011)

- Unheld ticker: UI Continue disabled + link to `/portfolio?add=`. Crafted POST still hits `THS-HOLDING-001` before quota; no `usage_events`.
- Conflict `THS-RISK-001` and quota `THS-QUOTA-001` unchanged from 005.

## Not done this chunk

- Worker / LLM (P4-00). Do not fake `ready`.
- Report reader (P5).
- Git commit / push (user asked apply SQL only).

## Next

[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) **P4-00**.
