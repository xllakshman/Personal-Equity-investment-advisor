#!/usr/bin/env bash
# Prod schema apply. Default is a read-only DEV vs PROD dry-run (no writes).
#
#   ./tools/db/apply_prod.sh              # dry-run / parity
#   ./tools/db/apply_prod.sh --dry-run    # same
#   CONFIRM_APPLY=1 ./tools/db/apply_prod.sh --apply   # write pending git files only
#
# Never applies supabase/seed/001_maya_desk.sql.
# Sources gitignored .env.prod only for --apply. Refuses if URL is not prod.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="dry-run"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
elif [[ "${1:-}" == "--dry-run" || -z "${1:-}" ]]; then
  MODE="dry-run"
else
  echo "Usage: ./tools/db/apply_prod.sh [--dry-run | --apply]" >&2
  exit 1
fi

export PYTHONPATH="${ROOT}/packages/python${PYTHONPATH:+:$PYTHONPATH}"

if command -v uv >/dev/null 2>&1; then
  PY=(uv run python)
elif [[ -x "${ROOT}/.venv/bin/python" ]]; then
  PY=("${ROOT}/.venv/bin/python")
else
  PY=(python3)
fi

echo "=== Dry-run: DEV (.env) vs PROD (.env.prod) schema parity (read-only) ==="
set +e
"${PY[@]}" "${ROOT}/tools/db/prod_dry_run.py"
DRY_STATUS=$?
set -e

if [[ "${MODE}" == "dry-run" ]]; then
  exit "${DRY_STATUS}"
fi

if [[ "${CONFIRM_APPLY:-}" != "1" ]]; then
  echo "Dry-run finished. Refusing writes. After review:" >&2
  echo "  CONFIRM_APPLY=1 ./tools/db/apply_prod.sh --apply" >&2
  exit 2
fi

if [[ "${DRY_STATUS}" -ne 0 ]]; then
  echo "Dry-run gate failed (exit ${DRY_STATUS}). Not applying." >&2
  exit "${DRY_STATUS}"
fi

PENDING=()
while IFS= read -r _pending_line; do
  [[ -n "${_pending_line}" ]] && PENDING+=("${_pending_line}")
done < <("${PY[@]}" "${ROOT}/tools/db/prod_dry_run.py" --print-pending)
if [[ "${#PENDING[@]}" -eq 0 ]]; then
  echo "PROD already has every git migration. Nothing to apply. No Maya seed."
  exit 0
fi

ENV_FILE="${ROOT}/.env.prod"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env.prod. cp .env.prod.example .env.prod and paste keys." >&2
  exit 1
fi

unset SUPABASE_URL SUPABASE_DB_HOST SUPABASE_DB_PASSWORD SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY
set -a
# shellcheck disable=SC1091
source "${ENV_FILE}"
set +a

if [[ "${SUPABASE_URL:-}" != "https://ndgvglcrkbygovlszxze.supabase.co" ]]; then
  echo "REFUSING: .env.prod SUPABASE_URL is not prod ndgvglcrkbygovlszxze" >&2
  exit 3
fi

echo "Applying ${#PENDING[@]} pending file(s) to ${SUPABASE_DB_HOST:-db.ndgvglcrkbygovlszxze.supabase.co}. No Maya seed."
for fname in "${PENDING[@]}"; do
  num="${fname%%_*}"
  CONFIRM_APPLY=1 "${ROOT}/tools/db/run_migration.sh" "${num}"
done

echo "Verify:"
echo "  select id, name from schema_migrations order by id;"
echo "  select count(*) from holdings;  -- expect 0"
echo "  select id from storage.buckets where id = 'report-pdfs';"
