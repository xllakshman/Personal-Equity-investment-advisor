# DB tools (`tools/db`)

Scripts for applying migrations and seeds.

## Typical usage

```bash
# After the user confirms the file name and project
./tools/db/run_migration_001.sh
```

Requires `SUPABASE_DB_PASSWORD` and `SUPABASE_URL`.

- **DEV (default):** repo-root `.env`.
- **PROD:** gitignored `.env.prod`. Default is a **read-only dry-run** (DEV `.env` vs PROD `.env.prod`): `schema_migrations`, public tables/views/functions/enums/RLS, `storage.buckets`, and row counts. Maya seed is never in the apply list.

```bash
./tools/db/apply_prod.sh              # dry-run / parity (no writes)
./tools/db/apply_prod.sh --dry-run    # same
CONFIRM_APPLY=1 ./tools/db/apply_prod.sh --apply   # writes pending git files only
```

`--apply` runs the dry-run first and **refuses** if DEV is missing git files, or PROD has extra `schema_migrations` ids / public tables/views that DEV does not. It does **not** run `supabase/seed/001_maya_desk.sql`. Single file: `CONFIRM_APPLY=1` then `set -a; source .env.prod; set +a; ./tools/db/run_migration.sh 001`.

Never echo the password. Never source `.env.prod` into `npm run dev`.
