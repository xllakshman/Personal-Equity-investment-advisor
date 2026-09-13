# Apps

Deployable runtimes — each subdirectory is a standalone service you can run, containerize, or ship independently.

| App | Purpose | Entry |
|-----|---------|-------|
| [`web/`](web/) | Next.js desk — marketing, auth, analyse, reports, billing, admin | `cd apps/web && npm run dev` → **http://127.0.0.1:3100/** |
| [`analysis-api/`](analysis-api/) | FastAPI — enqueue analysis, quota, refine classifier, report reads | Docker via `infra/docker/` |
| [`analysis-worker/`](analysis-worker/) | Batch / queue consumer — Step 0 + LLM + PDF | `uv run python apps/analysis-worker/src/analysis_worker/main.py` |

Stack is **Next.js App Router** + FastAPI (`HANDOFF.md` D23).

## Rules

- **No shared business logic here** — import from `packages/python/thesis_platform/` for DB, config, and clients.
- **One concern per app** — HTTP API, UI, or worker; not all three in one folder.
- **Layer inside `src/`** — `api/` (HTTP), `domain/` (rules), `schemas/` or `types/` (DTOs).

See `.cursor/rules/repo-structure.mdc` and `HANDOFF.md` §5 for placement rules.
