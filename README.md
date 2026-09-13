# Thesis — Personal Equity Advisor

SaaS research desk: an institutional-grade AI agent that underwrites a stock for **one investor's book** — live price, bear case, four-slice entry, written exit — then saves an immutable PDF.

**This repo is greenfield.** Folder layout and Cursor rules follow [invoice-processing](../activePieces-docker/invoice-processing). **No schema has been applied** to Supabase.

---

## What it does

| Stage | Description |
|-------|-------------|
| **Profile** | Tax residency, risk band, CAGR target, optional holdings CSV |
| **Request** | Ticker + lenses + model picker; server rejects risk/CAGR conflict |
| **Run** | Queued job (40–90s): Step 0 evidence → frameworks F1–F6 → PDF |
| **Store** | Supabase Postgres + Storage; RLS per user; prompt version stamped on the report |
| **Refine** | Append-only; original verdict never rewritten |
| **Bill** | Plans (monthly analysis cap) or wallet; UPI collect / card |

Canonical screens: [`docs/mock-ui/`](docs/mock-ui/README.md) (`Home.dc.html` marketing, `Thesis.dc.html` app).

---

## Repository layout

```
personalEquity_Advisor/
├── apps/                 # Deployable services (web, analysis-api, analysis-worker)
├── packages/             # Shared libraries (thesis_platform, thesis-types)
├── infra/                # Docker, deployment config
├── supabase/             # SQL migrations and seeds
├── tools/                # Dev/ops scripts (not production code)
├── docs/                 # Mock UI, session handoffs, ADRs
├── tests/                # Central unit + integration tests
├── HANDOFF.md            # Canonical handoff — decisions, DB status, next steps
└── .cursor/rules/        # Agent conventions
```

| Folder | README | Role |
|--------|--------|------|
| [`apps/`](apps/README.md) | Deployable runtimes | Next.js desk, FastAPI enqueue, analysis worker |
| [`packages/`](packages/README.md) | Shared code | DB helpers, config, shared types |
| [`infra/`](infra/README.md) | Platform | Docker compose |
| [`supabase/`](supabase/README.md) | Database | Schema, RLS, seeds |
| [`tools/`](tools/README.md) | Scripts | Migration runners — not production code |
| [`docs/`](docs/README.md) | Extra docs | Mock UI + session notes (`HANDOFF.md` stays canonical) |
| [`tests/`](tests/README.md) | Test suite | One CI entrypoint |

---

## Quick start

### 1. Environment

```bash
cp .env.example .env
# Fill SUPABASE_URL, keys, DB password (never commit .env)
```

Named DEV project: `https://cmksomahsfmsjufakryw.supabase.co` — migrations **001–009** + Maya seed applied. Do not apply more SQL until you name the file.

### 2. Python (uv + `.venv`)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # once
uv sync
uv run pytest tests/unit -q
```

### 3. Database

**Do not apply migrations** until `HANDOFF.md` §3b is answered and you confirm the file name. Next number is **001**. See [`supabase/migrations/NEXT_MIGRATION.md`](supabase/migrations/NEXT_MIGRATION.md).

---

## Where to look first

1. [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) — **Build next** chunk + success criteria
2. [`HANDOFF.md`](HANDOFF.md) — locked mock decisions
3. [`docs/handoff/SESSION-2026-09-13-foundation-schema.md`](docs/handoff/SESSION-2026-09-13-foundation-schema.md)
4. [`docs/mock-ui/README.md`](docs/mock-ui/README.md)
5. `.cursor/rules/` — especially `roadmap.mdc`
