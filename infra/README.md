# Infra

Platform and deployment assets — how services are built, run, and wired.

| Path | Purpose |
|------|---------|
| [`docker/`](docker/) | Dockerfiles, compose for analysis-api + worker |

Application source lives under `apps/`; this folder holds **how to run it**, not business logic.

**Prod secrets:** gitignored [`.env.prod`](../.env.prod.example) (P0-04). Local `.env` is DEV.

**PROD Next.js (P10-01):** Vercel `prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4` · `https://v0.app/lakshman-projects/equity-investment-advisor-prod`. Root: `apps/web`. Production env from `.env.prod`: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

**PROD FastAPI / worker (P10-02):** not Vercel. Compose here with `env_file: .env.prod`. Host still unnamed.
