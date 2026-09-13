# Session 2026-09-13 — repo bootstrap

**Status:** Folder layout + Cursor rules landed. **No SQL applied** to `https://cmksomahsfmsjufakryw.supabase.co`.

## What shipped

- `.cursor/rules/` adapted from invoice-processing (structure, testing, RLS, billing, LLM cache, do-not-break). Product-specific OptimAI rules (Profit Pulse, IOM, MCP, GST validation) were **not** copied.
- Monorepo: `apps/`, `packages/`, `infra/`, `supabase/`, `tools/`, `tests/`, `docs/`.
- `HANDOFF.md` §3 locked from `docs/mock-ui/Thesis.dc.html`. §3b is the blocker list.
- Mock zip extracted to `docs/mock-ui/`.
- `packages/python/thesis_platform` config/db helpers (no default DB host).
- `tools/db/run_migration_001.sh` refuses unless `CONFIRM_APPLY=1` and a `001_*.sql` exists (still exits 1 until wired to psql).

## Mock screens (Thesis.dc.html)

`login`, `signup`, `reset`, `home`, `build`, `portfolio`, `clarify`, `report`, `library`, `usage`, `billing`, `admin`, `arch`.

Marketing: `Home.dc.html`.

Framework draft: `uploads/Investment Framework Prompt - May 2026.txt` (personal book inside that file is **not** SaaS seed).

## Explicitly not done

- No `001_*.sql`
- No `apps/web` Next.js app
- No FastAPI routes
- No secrets in git (`*.rtf` and `.env` gitignored)

## Next agent

1. Get answers to `HANDOFF.md` §3b.
2. Read-only inspect the Supabase project once keys exist.
3. Draft migrations in git, wait for apply confirmation.
