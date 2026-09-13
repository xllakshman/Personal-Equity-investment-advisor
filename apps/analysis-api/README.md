# Analysis API (`apps/analysis-api`)

FastAPI service that accepts analysis requests, enforces quota and the risk/CAGR rule, and returns job/report payloads (`HANDOFF.md` §14).

**Not implemented yet.** Language locked only after §3b (FastAPI vs Hono).

## Planned layout

```
src/analysis_api/
├── main.py
├── api/routes/
├── domain/          # quota, conflict 422, refine refusal classifier
└── schemas/
```

Local port **8091**. Worker, not this process, calls the LLM.

See `.cursor/rules/analysis-api.mdc`.
