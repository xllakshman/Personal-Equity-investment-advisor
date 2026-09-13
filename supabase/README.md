# Supabase

Database schema, RLS policies, storage bucket config, and seed data for Thesis.

## What lives here

| Path | Purpose |
|------|---------|
| `migrations/` | Ordered SQL migrations **001–009** |
| `seed/` | Demo data (synthetic Maya desk only — never the author's personal book) |

## Key rules

- **Owner boundary:** `family_id` on all business rows (v1 is one owner member; later Family accounts add rows to `family_members` — do not add `user_id` as tenant on reports)
- Enable RLS in the same wave as the tables (007)
- Application code must not live here — only SQL
- **Status:** 001–009 + Maya seed on DEV — see HANDOFF §6

**Next migration:** [`migrations/NEXT_MIGRATION.md`](migrations/NEXT_MIGRATION.md)
