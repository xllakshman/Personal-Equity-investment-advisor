#!/usr/bin/env bash
# Apply 001–008 then Maya seed. CONFIRM_APPLY=1 required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ "${CONFIRM_APPLY:-}" != "1" ]]; then
  echo "Refusing. Set CONFIRM_APPLY=1" >&2
  exit 2
fi
for n in 001 002 003 004 005 006 007 008; do
  "${ROOT}/tools/db/run_migration.sh" "$n"
done
"${ROOT}/tools/db/run_seed_001_maya.sh"
