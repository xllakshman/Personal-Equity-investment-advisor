#!/usr/bin/env bash
# P10-02: copy Thesis to the OptimAI droplet and start analysis-api + worker.
# Does not recreate ActivePieces / MCP / validation. Does not bind host 80/443.
#
# Run from this laptop (SSH to 157.245.102.243 must work from YOUR network):
#   ./tools/deploy/droplet_p10_02.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${DROPLET_HOST:-157.245.102.243}"
SSH_KEY="${DROPLET_SSH_KEY:-$HOME/.ssh/id_ed25519_optimai}"
REMOTE="${DROPLET_REMOTE_DIR:-/opt/eqveste}"
SSH=(ssh -o BatchMode=yes -o IdentitiesOnly=yes -i "$SSH_KEY" -o ConnectTimeout=20 "root@${HOST}")
RSYNC=(rsync -az --delete
  -e "ssh -o BatchMode=yes -o IdentitiesOnly=yes -i ${SSH_KEY} -o ConnectTimeout=20"
  --exclude .git
  --exclude .venv
  --exclude node_modules
  --exclude apps/web/.next
  --exclude .env
  --exclude apps/web/.env.local
  --exclude __pycache__
  --exclude .cursor
)

if [[ ! -f "${ROOT}/.env.prod" ]]; then
  echo "Missing .env.prod" >&2
  exit 1
fi
if [[ ! -f "$SSH_KEY" ]]; then
  echo "Missing SSH key $SSH_KEY" >&2
  exit 1
fi

echo "=== rsync repo → root@${HOST}:${REMOTE} ==="
"${SSH[@]}" "mkdir -p '${REMOTE}'"
"${RSYNC[@]}" "${ROOT}/" "root@${HOST}:${REMOTE}/"
echo "=== copy .env.prod (not printed) ==="
scp -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=20 -i "$SSH_KEY" "${ROOT}/.env.prod" "root@${HOST}:${REMOTE}/.env.prod"

echo "=== docker compose thesis (no host 80/443) ==="
"${SSH[@]}" "bash -s" <<REMOTE
set -euo pipefail
cd "${REMOTE}"
docker compose -p thesis -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.droplet.yml up -d --build
CADDY=\$(docker ps --format '{{.Names}}' | grep -E 'caddy' | head -n1)
if [[ -z "\${CADDY}" ]]; then
  echo "No Caddy container found" >&2
  exit 1
fi
NET=\$(docker inspect "\${CADDY}" --format '{{range \$k, \$v := .NetworkSettings.Networks}}{{println \$k}}{{end}}' | head -n1)
echo "Caddy=\${CADDY} net=\${NET}"
docker network connect "\${NET}" thesis-analysis-api 2>/dev/null || echo "api already on \${NET}"
CF=\$(docker inspect "\${CADDY}" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
if [[ -z "\${CF}" ]]; then
  echo "Could not find Caddyfile mount" >&2
  exit 1
fi
if ! grep -q 'api.eqveste.com' "\${CF}"; then
  printf '\napi.eqveste.com {\n  reverse_proxy thesis-analysis-api:8091\n}\n' >> "\${CF}"
  echo "Appended api.eqveste.com to \${CF}"
else
  echo "Caddyfile already has api.eqveste.com"
fi
docker exec "\${CADDY}" caddy reload --config /etc/caddy/Caddyfile
echo "=== thesis containers ==="
docker ps --filter name=thesis --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "=== free ==="
free -h | head -2
REMOTE

echo "Done on droplet. Health after DNS: curl -s https://api.eqveste.com/health"
