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

Co-located app code stays under `apps/`; **all Python tests live here**.

## Run

```bash
uv sync
uv run pytest tests/unit -q
./tools/test/run_tests.sh
./tools/test/run_tests.sh --integration
```

## Adding tests

1. New Python module in `apps/` or `packages/` → `tests/unit/<service>/`.
2. New HTTP route → `tests/integration/<service>/`.
3. New SQL migration → `tests/unit/tools/test_migration_NNN.py`.
4. Edge cases required: see `.cursor/rules/testing.mdc`.
