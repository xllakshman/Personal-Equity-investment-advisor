#!/usr/bin/env bash
# Apply supabase/seed/001_maya_desk.sql (synthetic Maya, never the author's book).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export CONFIRM_APPLY="${CONFIRM_APPLY:-1}"
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD" >&2
  exit 1
fi
HOST="${SUPABASE_DB_HOST:-}"
if [[ -z "${HOST}" && -n "${SUPABASE_URL:-}" ]]; then
  HOST="db.$(echo "${SUPABASE_URL}" | sed -E 's|https://([^.]+)\..*|\1|').supabase.co"
fi
SQL="${ROOT}/supabase/seed/001_maya_desk.sql"
echo "Applying Maya seed to ${HOST}..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "host=${HOST} port=${SUPABASE_DB_PORT:-5432} dbname=${SUPABASE_DB_NAME:-postgres} user=${SUPABASE_DB_USER:-postgres} sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"
echo "Maya seed OK (maya@thesis.demo / ThesisMaya!2026)"
