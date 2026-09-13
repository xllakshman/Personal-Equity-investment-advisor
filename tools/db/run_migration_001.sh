#!/usr/bin/env bash
exec "$(cd "$(dirname "$0")" && pwd)/run_migration.sh" 001 "$@"
