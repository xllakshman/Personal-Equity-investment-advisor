# Analysis worker (`apps/analysis-worker`)

Queue consumer. Next.js does **not** start this process.

```
uv run python apps/analysis-worker/src/analysis_worker/main.py
```

Loop: `select … from analysis_requests where status = 'queued' for update skip locked` → `thesis_consume_quota_for_provider` → Yahoo previous close (D40) into `analysis_evidence` step 0 #1 → OpenRouter completion (D39) → `reports` insert → Playwright PDF into `report-pdfs/{family_id}/{report_id}.pdf`.

Requires repo-root `.env` on this laptop (DEV). Prod host (P10-02) loads `.env.prod`.

Comprehensive runs (all four core lenses) fail until Step 0 items 2–7 have a vendor. Fundamental+technical only needs the Yahoo close.
