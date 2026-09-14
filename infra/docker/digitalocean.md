# FastAPI + worker host (named: existing OptimAI droplet)

P10-02 needs an always-on process. **Do not create a second droplet.** Thesis `analysis-api` (port **8091**) and `analysis-worker` run as extra Docker services on the same DigitalOcean box that already runs ActivePieces, OptimAI validation, MCP, and Caddy.

Layout and SSH live in `/Users/lakshmanyeluri/Documents/activePieces-docker` (invoice-processing `infra/deploy/prod`). Do **not** copy GST / IOM / Profit Pulse tables into Thesis (D19). Do **not** merge Thesis into OptimAI’s compose `env_file`.

## What runs where

| Piece | Host |
|-------|------|
| Next.js `apps/web` | Vercel `prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4` · public **https://eqveste.com** |
| `analysis-api` container port **8091** | Same droplet as OptimAI. Public HTTPS via **Caddy**, not a host bind on 80/443. |
| `analysis-worker` | Same droplet. No public port. Claims `analysis_requests` on prod Postgres. |
| Thesis Postgres | Prod Supabase `https://ndgvglcrkbygovlszxze.supabase.co` — **not** the ActivePieces `postgres` container. |

## Droplet (from activePieces-docker)

| Fact | Value |
|------|--------|
| IP | `157.245.102.243` (`optimai-ap-prod`) |
| SSH | `ssh -i ~/.ssh/id_ed25519_optimai root@157.245.102.243` or `ssh optimai-vps` |
| Size (terraform default) | `s-2vcpu-4gb` |
| Compose on box | `/opt/optimai/Invoice-working-capital-prod` → `invoice_processing/infra/deploy/prod/docker-compose.yml` |
| Already on 80/443 | Caddy (`prod-caddy-1`) |
| Already internal | ActivePieces, AP postgres, Redis, `validation:8090`, `embed-worker`, `mcp:3100` |
| Hostnames already used | `ap.optimai.in` → ActivePieces; `api.optimai.in` → validation **8090**; `mcp.optimai.in` → MCP **3100** |

Do **not** reuse `api.optimai.in` for Thesis. Add a new name, e.g. **`api.eqveste.com`**, A record → `157.245.102.243`. Keep apex `eqveste.com` on Vercel.

## Why this works

1. `/analyse` on Vercel inserts `analysis_requests` (`status = queued`) via the anon client. Next.js does not start the worker.
2. `analysis-worker` on the droplet polls prod Postgres, sets `gathering` / `ready` / `failed`, inserts `reports` / `analysis_evidence`, writes PDF objects to `report-pdfs`.
3. Desk wait panel on `https://eqveste.com/analyse/[id]` polls `analysis_requests` until status changes. Refine / PDF later call `ANALYSIS_API_URL` → `https://api.eqveste.com` (set on Vercel **only** when a browser route `fetch`es it).
4. FastAPI CORS allowlist stays `https://eqveste.com` and `https://www.eqveste.com`. OptimAI CORS / MCP OAuth are unchanged.

## What must not share

| Must stay separate | Why |
|--------------------|-----|
| Gitignored `.env.prod` (Thesis) vs OptimAI `.env` / `mcp.env` | Different Supabase projects and keys. Never `env_file` the invoice-processing `.env`. |
| Thesis compose project name | Do not add services into OptimAI `docker-compose.yml`. Second file: `infra/docker/docker-compose.yml` + `docker-compose.droplet.yml`. |
| ActivePieces Postgres | Thesis tables live on prod Supabase. AP postgres is for ActivePieces only. |
| Host ports 80 / 443 | Caddy already binds them. Thesis must `expose: "8091"` only and let Caddy reverse-proxy. |
| Internal 8090 / 3100 | Validation and MCP. Thesis stays on **8091**. |

## RAM

Playwright Chromium in `Dockerfile.worker` plus ActivePieces + MCP + validation on **4 GB** is tight. After `docker compose up`, check `free -h` on the box. If the worker OOM-kills, resize the droplet (e.g. `s-4vcpu-8gb`) — do not strip Chromium; PDF generation needs it.

## When you name **prod** this turn (operator, no desk button)

1. Prod schema must already exist (`P10-00`). Worker against empty prod does nothing useful.
2. Copy this repo to the droplet (or pull the SHA you named). Place gitignored `.env.prod` on the box (never commit). The lab key for the selected `model_catalog.provider` must be non-empty or LLM steps stay `failed`.
3. `THESIS_CORS_ORIGINS=https://eqveste.com,https://www.eqveste.com`
4. From repo root on the droplet:

   ```bash
   docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.droplet.yml up -d --build
   ```

5. Attach Thesis API to Caddy’s Docker network, then add the site block in `Caddyfile.eqveste.snippet` to the **existing** OptimAI Caddyfile on the VPS (`{$AP_HOST}` / `{$API_HOST}` / `{$MCP_SITE}` stay as they are). Reload Caddy only — do not recreate AP/MCP containers.
6. Porkbun/Vercel DNS: `api.eqveste.com` A → `157.245.102.243`.
7. Health: `curl -s https://api.eqveste.com/health` → `{"status":"ok"}`.

Vercel Production env stays **only** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` until a desk route `fetch`es the API; then add `ANALYSIS_API_URL=https://api.eqveste.com` (server) or `NEXT_PUBLIC_ANALYSIS_API_URL` if the browser calls it. Never `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_PASSWORD`, or lab LLM keys on Vercel.

Until the worker process runs against prod, `https://eqveste.com/analyse/[id]` still shows `queued` and `/reports` gains no new ready row.

Local port **3100** keeps using DEV `.env`. Do not retarget it.
