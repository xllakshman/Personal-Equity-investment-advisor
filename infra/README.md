# Infra

Platform and deployment assets — how services are built, run, and wired.

| Path | Purpose |
|------|---------|
| [`docker/`](docker/) | Dockerfiles, compose for analysis-api + worker |

Application source lives under `apps/`; this folder holds **how to run it**, not business logic.

**Prod secrets:** gitignored [`.env.prod`](../.env.prod.example) (P0-04). Local `.env` is DEV.

**PROD Next.js (P10-01):** Public site **`https://eqveste.com`**. Vercel `prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4`. Root: `apps/web`. Production env from `.env.prod`: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

Compose: `infra/docker/docker-compose.yml` (`analysis-api` **8091**, `analysis-worker`). Example host write-up: [`docker/digitalocean.md`](docker/digitalocean.md). Do not create a droplet until prod is named.
