# Packages

Shared libraries imported by apps — **not** deployable on their own.

| Package | Language | Used by |
|---------|----------|---------|
| [`python/thesis_platform/`](python/thesis_platform/) | Python | `analysis-api`, `analysis-worker`, `tools/db` |
| [`typescript/thesis-types/`](typescript/thesis-types/) | TypeScript | `apps/web` (when scaffolded) |

## Rules

- No HTTP servers, CLI entrypoints, or cron schedules in `packages/`
- No imports from `apps/` — dependency flows **apps → packages**, never reverse

When adding shared code, ask: *“Will more than one app use this?”* If yes → package. If no → keep it in the app.
