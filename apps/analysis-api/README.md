# Analysis API (`apps/analysis-api`)

FastAPI on **http://127.0.0.1:8091**. Does not complete Analyse jobs — the worker does.

```
uv run uvicorn analysis_api.main:app --app-dir apps/analysis-api/src --port 8091
```

| Method | Path | Writes |
|--------|------|--------|
| GET | `/health` | none |
| GET | `/analysis/{id}` | none — `analysis_requests.status` |
| GET | `/reports/{id}/pdf` | none — signed URL for `reports.pdf_key` |
| POST | `/reports/{id}/refine-gate` | `usage_events.kind = refine_gate` (after confirm) |
| POST | `/reports/{id}/refine` | `refinements` + `usage_events.kind = refine` or `prompt_extract_attempt` |

Desk JWT `Authorization: Bearer`. Sample reports (`is_library_sample`) cannot refine. Prompt body is never in responses.

Local process loads repo-root **`.env` (DEV)**. Prod (P10-02) loads **`.env.prod`** on a non-Vercel host.
