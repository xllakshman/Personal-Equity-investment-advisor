# DigitalOcean (example host for P10-02)

This is the named example host for FastAPI + worker. **Do not create a droplet or apply prod SQL until the user names prod this turn.**

## What runs where

| Piece | Host |
|-------|------|
| Next.js `apps/web` | Vercel `prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4` · public **https://eqveste.com** |
| `analysis-api` port **8091** | DigitalOcean droplet (Docker compose in this folder) |
| `analysis-worker` | Same droplet, long-running |
| Postgres | Prod Supabase `https://ndgvglcrkbygovlszxze.supabase.co` |

## Droplet (when prod is named)

1. Ubuntu 24.04 droplet, Docker + compose plugin.
2. Copy the repo (or pull the **dev** branch SHA you promoted).
3. Place gitignored `.env.prod` on the droplet (never commit it).
4. `THESIS_CORS_ORIGINS=https://eqveste.com,https://www.eqveste.com`
5. From repo root: `docker compose -f infra/docker/docker-compose.yml up -d --build`
6. Health: `curl -s https://<api-host>/health` → `{"status":"ok"}`

Vercel Production env stays **only** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_PASSWORD`, or `OPENROUTER_API_KEY` on Vercel.

When the desk browser calls refine/PDF, set `NEXT_PUBLIC_ANALYSIS_API_URL` (or server `ANALYSIS_API_URL`) to the droplet URL. Until then, `/analyse/[id]` keeps polling `analysis_requests` via the anon client.

Local port **3100** keeps using DEV `.env`.
