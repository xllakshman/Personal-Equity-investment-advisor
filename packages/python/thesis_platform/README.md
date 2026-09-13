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
| `OPENROUTER_API_KEY` | worker | OpenRouter v1 completions (D39) |
| `ANTHROPIC_API_KEY` | worker later | Placeholder — unused until a native Claude chunk |
| `OPENAI_API_KEY` | worker later | Placeholder — unused until a native OpenAI chunk |
| `XAI_API_KEY` | worker later | Placeholder — unused until a native Grok chunk |
| `DEEPSEEK_API_KEY` | worker later | Placeholder — unused until a native DeepSeek chunk |

Copy from `.env.example` at repo root. **No default DB host** — missing URL/host is an error.

## What lives here

| Module | Purpose |
|--------|---------|
| `config.py` | `Settings`, `resolve_db_host()` |
| `db.py` | PostgreSQL helpers via psycopg2 — `connect()`, `db_cursor()` |
