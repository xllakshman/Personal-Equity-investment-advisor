# DB tools (`tools/db`)

Scripts for applying migrations and seeds.

## Typical usage

```bash
# After the user confirms the file name and project
./tools/db/run_migration_001.sh
```

Requires `SUPABASE_DB_PASSWORD` and `SUPABASE_URL`.

- **DEV (default):** repo-root `.env`.
- **PROD:** gitignored `.env.prod`. Only after you name **prod** + the file + `CONFIRM_APPLY=1`:

```bash
set -a
# shellcheck disable=SC1091
source .env.prod
set +a
CONFIRM_APPLY=1 ./tools/db/run_migration.sh 001
```

Never echo the password. Never source `.env.prod` into `npm run dev`.
