# Session 2026-10-03 — Analyse builder + elite persist

Header **Analyse** (ticker in the top search) loads `/analyse` or `/analyse?ticker=…`. That is the same page as nav **Analyse a stock**: six steps, then **Submit for analysis**. It does not insert `analysis_requests` until Submit. `thesis_accept_analysis` inserts `analysis_requests` (`queued`) and `usage_events.kind = search` for owner/member. The worker `apps/analysis-worker` is not started by Next.js. Until that process runs, `/analyse/[id]` stays queued and `reports` does not gain a row.

**022** adds `elite_investor_books` (authenticated cache, no `family_id`) and `analysis_requests.run_qty` / `run_cost_per_share`. Elite **Refresh this book** upserts `elite_investor_books`. Confirm scan on `/research/managers` writes `manager_holdings_snapshots` for a watch that matches the twenty-name catalog. CUSIP lines open `/analyse?ticker=` when SEC `company_tickers.json` maps the issuer.

DEV: **001–021** applied; **022** with `CONFIRM_APPLY=1 ./tools/db/run_migration.sh 022`. PROD: **001–019**; **020–022** via `apply_prod.sh --apply` when named. Maya seed not run on prod.
