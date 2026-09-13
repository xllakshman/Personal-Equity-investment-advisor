#!/usr/bin/env bash
# Apply one numbered migration. Usage: ./tools/db/run_migration.sh 001
# Requires CONFIRM_APPLY=1 and SUPABASE_DB_PASSWORD (+ URL or HOST).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NUM="${1:-}"
if [[ -z "${NUM}" ]]; then
  echo "Usage: CONFIRM_APPLY=1 ./tools/db/run_migration.sh 001" >&2
  exit 1
fi
NUM="$(printf '%03d' "$((10#$NUM))" 2>/dev/null || printf '%s' "$NUM")"

if [[ "${CONFIRM_APPLY:-}" != "1" ]]; then
  echo "Refusing to apply. Set CONFIRM_APPLY=1 after reviewing the SQL." >&2
  exit 2
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD" >&2
  exit 1
fi

FILE="$(ls -1 "${ROOT}/supabase/migrations/${NUM}"_*.sql 2>/dev/null | head -n1 || true)"
if [[ -z "${FILE}" ]]; then
  echo "No supabase/migrations/${NUM}_*.sql" >&2
  exit 1
fi

HOST="${SUPABASE_DB_HOST:-}"
if [[ -z "${HOST}" && -n "${SUPABASE_URL:-}" ]]; then
  HOST="db.$(echo "${SUPABASE_URL}" | sed -E 's|https://([^.]+)\..*|\1|').supabase.co"
fi
if [[ -z "${HOST}" ]]; then
  echo "Set SUPABASE_DB_HOST or SUPABASE_URL" >&2
  exit 1
fi

echo "Applying $(basename "$FILE") to ${HOST}..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "host=${HOST} port=${SUPABASE_DB_PORT:-5432} dbname=${SUPABASE_DB_NAME:-postgres} user=${SUPABASE_DB_USER:-postgres} sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$FILE"
echo "OK $(basename "$FILE")"
