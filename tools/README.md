# Tools

Developer and operator scripts — **not imported by production apps at runtime**.

| Path | Purpose |
|------|---------|
| [`db/`](db/) | Migration apply scripts |
| [`test/`](test/) | `run_tests.sh` |
| [`setup/`](setup/) | One-time Auth user setup (later) |

## vs `apps/` and `supabase/`

- **`supabase/migrations/`** — SQL schema source of truth
- **`tools/`** — scripts that *apply* or *validate* that SQL
- **`apps/`** — long-running services

If you are writing production Python logic, put it in `apps/` or `packages/`, not here.
