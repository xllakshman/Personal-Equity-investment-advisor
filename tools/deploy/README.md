# Deploy scripts

Run only after you name **prod** in chat.

| Script | What |
|--------|------|
| [`../db/apply_prod.sh`](../db/apply_prod.sh) | `CONFIRM_APPLY=1 --apply` — pending git files to prod Supabase. No Maya seed. |
| [`porkbun_eqveste_dns.py`](porkbun_eqveste_dns.py) | Apex/www A → Vercel `76.76.21.21`. |
| [`porkbun_eqveste_api.py`](porkbun_eqveste_api.py) | A `api.eqveste.com` → droplet `157.245.102.243`. Does not change apex/www. |
| [`droplet_p10_02.sh`](droplet_p10_02.sh) | rsync to `/opt/eqveste`, compose API+worker, Caddy `api.eqveste.com`. Run from a network that can `ssh optimai-vps`. |
| [`vercel_prod.sh`](vercel_prod.sh) | Set Vercel Production `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only, then `vercel deploy --prod`. |
| [`supabase_prod_auth_urls.py`](supabase_prod_auth_urls.py) | Default dry-run. `--apply` sets prod Site URL `https://eqveste.com` + redirect allowlist. Needs `SUPABASE_ACCESS_TOKEN` in `.env.prod` (account PAT, not service role). |

DigitalOcean FastAPI/worker: [`../../infra/docker/digitalocean.md`](../../infra/docker/digitalocean.md).
