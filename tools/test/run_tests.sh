#!/usr/bin/env bash
# Run pytest with sensible defaults for this monorepo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if command -v uv &>/dev/null; then
  RUN=(uv run python -m)
else
  PY="${ROOT}/.venv/bin/python"
  [[ -x "$PY" ]] || PY=python3
  if ! "$PY" -c "import pytest" 2>/dev/null; then
    echo "Install deps: uv sync"
    exit 1
  fi
  RUN=("$PY" -m)
fi

if [[ "${1:-}" == "--integration" ]]; then
  shift
  if [[ -f "${ROOT}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT}/.env"
    set +a
  fi
  exec "${RUN[@]}" pytest tests/unit tests/integration "$@"
fi

if [[ "${1:-}" == "--cov" ]]; then
  shift
  exec "${RUN[@]}" pytest tests/unit tests/integration --cov --cov-report=term-missing "$@"
fi

exec "${RUN[@]}" pytest tests/unit "$@"
