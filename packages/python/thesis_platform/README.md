# thesis_platform (Python package)

Cross-cutting infrastructure used by Python apps — database access, configuration, and (later) LLM / market-data clients.

## Environment variables

| Variable | Required by | Notes |
|----------|-------------|-------|
| `SUPABASE_URL` | host derivation, API clients | `https://cmksomahsfmsjufakryw.supabase.co` |
| `SUPABASE_DB_HOST` | optional | Defaults from `SUPABASE_URL` → `db.<ref>.supabase.co` |
| `SUPABASE_DB_PASSWORD` | worker, `tools/db/*` | Direct Postgres password |
| `SUPABASE_SERVICE_KEY` | worker, admin scripts | Auth admin / storage |
| `SUPABASE_ANON_KEY` | future Next.js | JWT client |
| `OPENAI_API_KEY` | worker, FastAPI refine | OpenAI chat completions (D39) |
| `ANTHROPIC_API_KEY` | worker, FastAPI refine | Anthropic Messages (D39) |
| `XAI_API_KEY` | worker, FastAPI refine | xAI chat completions (D39) |
| `DEEPSEEK_API_KEY` | worker, FastAPI refine | DeepSeek chat completions (D39) |

Copy from `.env.example` at repo root. **No default DB host** — missing URL/host is an error.

## What lives here

| Module | Purpose |
|--------|---------|
| `config.py` | `Settings`, `resolve_db_host()` |
| `native_llm.py` | Native lab payloads (OpenAI / Anthropic / xAI / DeepSeek) |
| `db.py` | PostgreSQL helpers via psycopg2 — `connect()`, `db_cursor()` |
