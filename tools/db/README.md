# DB tools (`tools/db`)

Scripts for applying migrations and seeds.

## Typical usage

```bash
# After the user confirms the file name and project
./tools/db/run_migration_001.sh
```

Requires `SUPABASE_DB_PASSWORD` and `SUPABASE_URL` in repo-root `.env`. Never echo the password.
