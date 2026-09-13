# Test suite

Industry-standard layout (unit → integration → optional live DB).

## Layout

```
tests/
├── conftest.py
├── fixtures/
├── unit/
│   ├── analysis_api/
│   ├── analysis_worker/
│   ├── thesis_platform/
│   └── tools/
└── integration/
    ├── analysis_api/
    ├── analysis_worker/
    └── web/
```

Co-located app code stays under `apps/`; **all Python tests live here**. Web display/meter helpers are `apps/web/lib/**/*.test.ts` (`npm test` in `apps/web`).

## Run

```bash
uv sync
uv run pytest tests/unit -q
./tools/test/run_tests.sh
./tools/test/run_tests.sh --integration
cd apps/web && npm test
```

Integration tests skip when Next (3100), analysis-api (8091), or `SUPABASE_DB_PASSWORD` is missing. They must not write `usage_events` or refine as Maya unless the test rolls back.

## Adding tests

1. New Python module in `apps/` or `packages/` → `tests/unit/<service>/`.
2. New HTTP route → `tests/integration/<service>/`.
3. New SQL migration → `tests/unit/tools/test_migration_NNN.py`.
4. **Three test-fix passes** per ROADMAP chunk and at phase wrap-up — see `.cursor/rules/testing.mdc`.
5. Categories that must appear for analysis/billing chunks:
   - **RLS UI vs API:** viewer cannot `POST` refine; other `family_id` is 404; UI uses RLS (`auth.uid()`), API copies `user_can_read_family` / `user_can_write_family`.
   - **Usage vs plan:** Desk KPI, `thesis_family_meter_count`, and `thesis_consume_quota_for_provider` share `search` + `refine` + `refine_gate`.
   - **Store / retrieve:** column the RPC writes is the table the screen selects (`holding_lots` → view `holdings`; `analysis_requests` → wait panel; `reports` → `/reports`).
   - **Display:** formatted money, empty states, wait copy vs `analysis_requests.status`. Never fake `ready`.
