# Thesis — Exhaustive Agent Handoff

> **Version:** 0.1 · **Date:** 2026-09-13  
> **Workspace:** `/Users/lakshmanyeluri/Documents/personalEquity_Advisor`  
> **Reference layout:** `/Users/lakshmanyeluri/Documents/activePieces-docker/invoice-processing`  
> **Roadmap (progress):** [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) — **Build next: P1-05**  
> **Latest session:** [`docs/handoff/SESSION-2026-09-13-p2-portfolio.md`](docs/handoff/SESSION-2026-09-13-p2-portfolio.md)  
> **Mock UI:** [`docs/mock-ui/`](docs/mock-ui/README.md)  
> **GitHub (empty):** `xllakshman/Personal-Equity-investment-advisor` · branch `main`

---

## STATUS (snapshot — sync after each session)

| Component | State |
|-----------|--------|
| Folder layout + Cursor rules | ✅ Scaffolded 2026-09-13 |
| `HANDOFF.md` + session note | ✅ This file |
| Stack | ✅ Next.js App Router + FastAPI analysis-api/worker |
| Tenancy | ✅ `family_id` from day one (v1 = one owner; Family accounts add members later — no report rewrite) |
| Auth | ✅ Email+password (v1). Google/Phone off until dashboard. Keys in `.env`. |
| Holdings | ✅ `holding_lots` write path + `holdings` average-cost view |
| SQL 001–008 in git | ✅ Drafted + **applied** 2026-09-13 on `cmksomahsfmsjufakryw` |
| SQL 009 model catalog | ✅ **applied** 2026-09-13 — OpenRouter slugs; Maya `opus5`/`gpt56`/`gpt56m` kept |
| Maya seed | ✅ `maya@thesis.demo` · 5 lots · 2 reports (1 sample) |
| Storage bucket `report-pdfs` | ✅ private |
| Analysis API / worker | ⬜ README placeholders only |
| Next.js desk | ✅ **P2-03** 2026-09-13 — `/portfolio` CSV, holdings grid, manual add, display FX. **P1-05** next |
| Weekly holdings email | ⬜ **P8-02** / D41 — spec locked; no table, no cron, no send |
| Analysis CSAT | ⬜ **P5-05** form + **P7-10** admin tab — spec locked; no table |
| Requirements vs mock/brief | ✅ Gap review 2026-09-13 — D27–D42 |

**Build next:** [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) **P1-05** investor profile (migration **010**). Phase 2 (P2-00…P2-03) shipped 2026-09-13.

---

## START HERE (next agent)

1. Read [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) **Current** (only that chunk).
2. Read [`SESSION-2026-09-13-p1-02-to-p1-04-desk.md`](docs/handoff/SESSION-2026-09-13-p1-02-to-p1-04-desk.md) then **§3**.
3. **Do not re-ask** locked mock rules in §3 unless the user contradicts them.
4. **Do not apply SQL** unless the user names the migration file and `CONFIRM_APPLY=1`.
5. **Do not** treat the May 2026 personal holdings in the framework prompt as SaaS seed data.

**Bootstrap prompt:**
```
Read docs/roadmap/ROADMAP.md Current chunk only. Then HANDOFF.md §3.
Do not start the next ROADMAP id. User revises ROADMAP.md to change order.
```

---

## Table of contents

| § | Topic |
|---|--------|
| [1](#1-product--scope) | Product & scope |
| [2](#2-architecture) | Architecture |
| [3](#3-locked-decisions-do-not-re-litigate) | **Locked decisions** |
| [3b](#3b-open-questions-block-schema-apply) | **Open questions** |
| [4](#4-infrastructure--credentials) | Infrastructure |
| [5](#5-repository-file-tree) | File tree |
| [6](#6-database-status) | **DB status** |
| [7](#7-migration-plan) | Migration plan |
| [8](#8-proposed-schema) | Proposed schema |
| [9](#9-rls--auth) | RLS & auth |
| [10](#10-llm--prompt) | LLM / prompt |
| [14](#14-analysis-api) | Analysis API |
| [UI](#ui--screen-map) | Screen map |
| [17](#17-gotchas) | Gotchas |
| [18](#18-next-steps) | **Next steps** |
| [19](#19-roadmap) | Roadmap |
| [20](#20-out-of-scope-v1) | Out of scope |
| [21](#21-roles) | Roles |
| [25](#25-verification) | Verification SQL |
| [26](#26-what-we-cannot-include) | Missing credentials |

---

## 1. Product & scope

**What:** Multi-user (proposed: one desk per `auth.users` row; tenancy model is §3b) equity research SaaS. We do not rate stocks. We underwrite them for **this** book: evidence, bear case, four slices, written exit, tax-aware maths.

**Users:** Retail investor (desk owner), optional platform_admin.

**Not a broker.** No order routing. Holdings are user-uploaded CSV / manual rows.

**v1 surfaces:** marketing `/`, desk `/login` → `/desk`, portfolio CSV, request builder, clarifying questions, report (tabs), library + PDF, usage, plans/wallet. **Platform admin** is `/admin/login` → `/admin/accounts` + `/admin/observability` — not a desk nav item.

---

## 2. Architecture

```
Browser (apps/web, JWT)
    │
    ├─ Supabase Auth + RLS  ── Postgres (user-owned rows)
    │
    ├─ POST /analysis        ── analysis_requests (queued)
    │                              │
    │                              ▼
    │                         analysis-worker (service_role)
    │                              │ Step 0 tools + LLM
    │                              ▼
    │                         reports (immutable) + Storage PDF
    │
    └─ GET /reports/:id/pdf  ── signed URL
```

**Proposed vs mock:** the mock says Vite + Fastify/Hono. This repo **proposes** Next.js + FastAPI to match invoice-processing (tests, RLS session, Vercel). That is **not locked** — see §3b.

---

## 3. Locked decisions (do not re-litigate)

Taken from `Thesis.dc.html` Architecture & handoff + non-negotiables. Change only if the user explicitly contradicts.

| ID | Decision |
|----|----------|
| D1 | Queued analysis jobs; UI polls/subscribes. Frontier run 40–90s. User may leave the page; note appears under Reports. |
| D2 | One provider-agnostic LLM adapter. Prompt loaded by version id. Version id stamped on every `reports` row. |
| D3 | Prompt **never** returned by any API, error, or stream. Refine extraction → fixed server refusal, counted per account. 3 flags / session; 10 → rate limit not ban. |
| D4 | Reports **immutable** after save. Refinements append; they never rewrite the original verdict. |
| D5 | Quota enforced **twice** (accept + pre-provider). 100% blocks new analyses; saved notes remain readable. |
| D6 | Risk/CAGR conflict is a **server 422**. Client mirrors for immediacy only. |
| D7 | FX is **display-only**. Store amounts in native currency on the instrument. Never write a converted number back. |
| D8 | RLS on every user-owned table. Policy is the boundary. Holdings not readable by admins without a support-access grant. Impersonation is read-only and audit-logged. |
| D9 | Allowances and notice thresholds (60/80/90) are **rows**, not constants. |
| D10 | Trial includes three **read-only sample** analyses; they never count against allowance. |
| D11 | CSV import: `ticker, company_name, cost_per_share, total_purchased`. Rejected rows shown, never silently dropped. |
| D12 | PDFs in object storage keyed by report id, served via signed URLs. Rename updates file + row; version history kept. |
| D13 | Prompt uploads: staged, diffed, **second admin approval** before promotion. Rollback keeps prior version addressable by report. |
| D14 | Password visibility off by default and never persisted. Reset link 30 minutes; existing sessions revoked. Signup min 12 characters. |
| D15 | Tax residencies in mock: United States, India, UAE, NRI. Rates editable in the request builder. Not tax advice. |
| D16 | UPI collect for INR; card for non-INR. Wallet never expires. |
| D17 | System prompt file in git is a **bootstrap draft**. Runtime source is `prompt_versions`. Personal May 2026 book in that file is **not** product default data. |
| D18 | No new top-level folders without updating `.cursor/rules/repo-structure.mdc` and this §5. |
| D19 | Do not copy invoice-processing GST/IOM/Profit Pulse tables. |
| D20 | Apply SQL only with `CONFIRM_APPLY=1` and a named file. Never re-run 001–009 unless §25 says they are missing. |
| D21 | Tenant key is **`family_id`**, not `user_id`, on lots/requests/reports/usage/wallets. Signup creates a one-person family. Later Family accounts **insert `family_members`** — they must not copy or rewrite `reports`. |
| D22 | `users.id = auth.users.id` (`auth.uid()`). No separate `auth_user_id` mapping. |
| D23 | Stack: **Next.js App Router** (`apps/web`) + **FastAPI** `analysis-api` / `analysis-worker`. |
| D24 | Desk Auth v1 is **email+password only**. Phone is stored as an identifier, not a second password. Google OAuth stays off until you enable it in the dashboard. |
| D25 | `holding_lots` is the write path. `holdings` is a `security_invoker` view (average cost per ticker/exchange/currency). |
| D26 | DEV project is `https://cmksomahsfmsjufakryw.supabase.co`. Seed is synthetic **Maya** (`maya@thesis.demo`), never the May 2026 personal book. |
| D27 | Platform admin is a **separate Auth user** and a **separate entry** `/admin/login`. Desk JWT must not open `/admin/*`. Admin JWT must not call `thesis_accept_analysis` or write `holding_lots`. Admin sees account metadata + observability (OptimAI-shaped tables/tabs, **no** MCP/Connectors). Holdings stay hidden unless `support_access_grants`. Promote remains `tools/db/promote_platform_admin.sql` (no button). |
| D28 | **Every LLM adapter call is billed** to the family (plan searches **or** wallet USD). The triggering screen must show model + cost **before** send. Login / `/desk` load is not a model call. Prompt-extraction refusal (no provider call) is not billed. Mock “refine is free” is **overridden**. |
| D29 | Report reader keeps mock **Expert / Beginner** density toggle (P5-02). |
| D30 | Model output charts are allowlisted jsonb (`line`, `bar`, `table`, `waterfall`) only. Never execute HTML or `<script>` from the model (P5-04). |
| D31 | Five plan rows: Trial, Basic, Professional, Professional + (`premium`), Ultra (`ultra`). Admin edits X searches per plan on `/admin/plans` (P7-01). |
| D32 | Admin observability v1 = Overview + Watch limits + APIs + Latency + Who used which product + **Customer Feedback (P7-10)**. No MCP tab. No red-watch email until P7-09 is un-skipped. |
| D33 | Analyse only for a ticker already on view `holdings` for that `family_id`. Header search does not enqueue. Add the name on `/portfolio` first (`THS-HOLDING-001`). |
| D34 | Refine user text is variable-pack **enrichment**. Cheap `refine_gate` first; if `material` is false, **Do you want to proceed?** Full refine uses the report’s Analyse model and is a second billed call. Original `reports` plus each `refinements` row stay readable. |
| D35 | Git promotion is local commit → named **dev** push → named **prod**. Agents may ask; they must not push/deploy without the user naming that target this turn. See `.cursor/rules/git-deploy.mdc`. |
| D36 | Analyse/refine **use the selected catalog row**. Never swap to a cheaper model. Picker groups `thesis_class` **frontier** vs **quick**; `vendor_class` is the lab’s own label. Catalog: [`docs/architecture/MODEL-CATALOG.md`](docs/architecture/MODEL-CATALOG.md). **009 applied** on DEV 2026-09-13. |
| D37 | Job wait is **poll** of `analysis_requests.status` (Next route or `GET /analysis/:id`). Do not add Supabase Realtime until a later chunk you add. |
| D38 | PDF renderer is **Playwright** (P4-03). Charts/tables in the note must survive the PDF. |
| D39 | Worker LLM transport is **OpenRouter** (`OPENROUTER_API_KEY`). HTTP `model` = `model_catalog.openrouter_model_id`. Every call sets `provider.allow_fallbacks: false` and `provider.only` = that row’s `openrouter_only`. Missing OpenRouter key or a response `model` that does not match the slug → job `failed`, no `reports` insert. Forbidden: `openrouter/auto`, model fallback arrays. Native keys may sit in `.env` as placeholders (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`) — **do not call those APIs** until a ROADMAP chunk names a native path. |
| D40 | Step 0 **price** is **previous regular-session close** from Yahoo Finance chart v8 (no key). Spec: [`docs/architecture/MARKET-DATA.md`](docs/architecture/MARKET-DATA.md). Never estimate. Never fetch on `/desk` load. Items 2–7 of Step 0 are not this vendor. |
| D41 | Weekly holdings email (**P8-02**): opt-in on `/billing`, default off. Quick model only (`gpt56m` / refine-gate row). Not a full Analyse; no `reports` insert; no new tickers. Ticker cap from `plans.weekly_digest_ticker_limit` (3 on trial/basic/professional; 15 on `premium` / `ultra`). Rank by cost basis × qty with display FX. One OpenRouter call per family per ISO week. `usage_events.kind = weekly_digest` records cost and **does not** consume monthly Analyse searches. Login / `/desk` load does not send it. Email send waits on a named provider; `/desk` still reads `weekly_digests`. |
| D42 | After each completed Analyse (`reports` row, not samples, not refine), `/reports/[id]` asks CSAT (**P5-05**). Mandatory Yes/No: “Is the analysis provided helpful?” Five 1–5 dimensions + comment are optional. Table `analysis_feedback`, one row per `reports.id`. Admin reads it only on `/admin/observability` → Customer Feedback. Does not change `reports.verdict`. |

---

## 3b. Open questions (remaining)

Do not re-ask until the named chunk. Defaults locked 2026-09-13: poll (D37), Playwright (D38), OpenRouter (D39), Email+password only (D24). Catalog **009** applied on DEV. Weekly digest spec **D41** (P8-02); send still needs a provider. CSAT **D42** (P5-05 / P7-10).

| When | What I still need from you |
|------|----------------------------|
| P4-01 items 2–7 | News / earnings / bear / competitor / sector **source**. Close is Yahoo (D40). Without these, a comprehensive job must fail rather than invent text. |
| P6-03 | UPI/card **merchant** when you want real checkout. Placeholder UI only until then. |
| P8-02 / P7-09 | Email **provider** (Resend / Postmark / SES + from-address) before any Sunday send or red-watch mail. Digest **rows** and `/desk` card do not wait on this. |
| P4-02 | Paste **`OPENROUTER_API_KEY`** in gitignored `.env` (required before the worker). Optional native placeholders: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`. Catalog **009** is already on DEV. |
| Anytime | Push/deploy only when you name **dev** or **prod** this turn. |

Operator leftover: rotate or delete `readme.rtf` (password file still in the workspace). Google/Phone Auth: turn on in Authentication → Providers when you want them.

---

## 4. Infrastructure & credentials

| Item | Value |
|------|--------|
| Supabase URL | `https://cmksomahsfmsjufakryw.supabase.co` |
| DB host (derived) | `db.cmksomahsfmsjufakryw.supabase.co` |
| Region / project name in dashboard | **Unknown — ask** |
| Anon / service keys | **Present** in gitignored `.env` (2026-09-13). Values never pasted in chat or HANDOFF. |
| Local secrets file `readme.rtf` | Gitignored. **Rotate** — it was sitting in the workspace. |

Env template: [`.env.example`](.env.example).

---

## 5. Repository file tree

```
.
├── HANDOFF.md
├── README.md
├── pyproject.toml
├── .env.example
├── .cursor/rules/*.mdc
├── apps/
│   ├── README.md
│   ├── web/README.md
│   ├── analysis-api/README.md
│   └── analysis-worker/README.md
├── packages/
│   ├── python/thesis_platform/
│   └── typescript/thesis-types/
├── supabase/migrations/NEXT_MIGRATION.md
├── tools/db/ README + run_migration_001.sh (no-op until file exists)
├── tests/
└── docs/mock-ui/  Home.dc.html, Thesis.dc.html, framework prompt
```

---

## 6. Database status

**Applied on `cmksomahsfmsjufakryw` (DEV):** migrations **001–009** and seed `supabase/seed/001_maya_desk.sql` on 2026-09-13. **009** = `model_catalog` OpenRouter slugs (`openrouter_model_id`, `thesis_class`). Do not re-run unless §25 fails.

Demo desk: `maya@thesis.demo` / `ThesisMaya!2026` (Auth email+password). Google/Phone flags must still be turned on in the Supabase Auth dashboard.

Platform admin: **no button.** After that person signs up (desk `/signup` or a dedicated Auth user), run `tools/db/promote_platform_admin.sql` (updates `users.role` where email matches). They then use **`/admin/login`**, not `/login`. Observability tables do not exist until ROADMAP **P7-05**.

---

## 7. Migration plan

Proposed order (files not written until §3b):

| # | File (proposed) | Contents |
|---|-----------------|----------|
| 001 | `001_extensions_enums.sql` | pgcrypto, citext, enums (residency, role, request_status, usage_kind, …) |
| 002 | `002_users_profiles.sql` | `users` / `profiles` + auth trigger |
| 003 | `003_plans_billing.sql` | `plans`, thresholds, wallets |
| 004 | `004_portfolios_holdings.sql` | portfolios, holdings, import rejections |
| 005 | `005_analysis_reports.sql` | requests, reports, refinements, usage_events |
| 006 | `006_prompt_audit.sql` | prompt_versions (body not grantable to authenticated), audit_log, support grants |
| 007 | `007_rls.sql` | FORCE RLS + policies |
| 008 | `008_storage_report_pdfs.sql` | private bucket + signed URL policies |
| 009 | `009_model_catalog_refresh.sql` | OpenRouter slugs, `thesis_class`; Maya ids kept |

Exact names freeze when §3b is answered.

---

## 8. Proposed schema

Full column draft: [`docs/architecture/PROPOSED-SCHEMA.md`](docs/architecture/PROPOSED-SCHEMA.md).

Mock core tables (must exist in some form):

| Table | Key columns (mock) |
|-------|--------------------|
| `users` | email, name, phone_cc, phone, tax_residency, tax_slab, role, plan_id, wallet_cents |
| `holdings` | user_id, ticker, exchange, company_name, cost_per_share, qty, native_currency |
| `analysis_requests` | user_id, ticker, lenses[], invested_amount, portfolio_size, intent, avg_down, risk_band, cagr_band, tax_basis, model_id, clarifications jsonb, status |
| `reports` | request_id, name, verdict, conviction, sections jsonb, charts jsonb, pdf_key, prompt_version, token_cost_cents |
| `refinements` | report_id, user_text, focus_tags[], response, was_refused |
| `usage_events` | user_id, kind (search / refine / pdf), model_id, cost_cents, billing_period |
| `plans` · `prompt_versions` · `audit_log` | admin-managed |

Proposed extras (not in the mock table list, required to implement the screens): `portfolios`, `portfolio_import_rows`, `model_catalog` (`openrouter_model_id`, D39), `plan_notice_thresholds`, `wallets`, `wallet_topups`, `support_access_grants`, `prompt_version_approvals`, `analysis_evidence` (Step 0 citations), `investor_profiles` (**010**), `observability_*` (P7-05 / **011**), `analysis_feedback` (P5-05).

---

## 9. RLS & auth

See `.cursor/rules/security-tenancy.mdc`. `authenticated` never `SELECT` prompt body. Service role for worker writes to `usage_events`.

---

## 10. LLM & prompt

Worker completions go to **OpenRouter** (D39): `OPENROUTER_API_KEY`, `model_catalog.openrouter_model_id`, `allow_fallbacks: false`. Catalog: [`docs/architecture/MODEL-CATALOG.md`](docs/architecture/MODEL-CATALOG.md).

Bootstrap advisor text: `docs/mock-ui/uploads/Investment Framework Prompt - May 2026.txt`.

Strip personal profile / current holdings from the **product** prompt; those belong in `users` + `holdings` context packs.

Prompt caching: static version body first, variable research pack second (`.cursor/rules/llm-cost-optimization.mdc`).

---

## 14. Analysis API

Contract from mock — `.cursor/rules/analysis-api.mdc`. Implementation language blocked on §3b.

---

## UI — screen map

See `.cursor/rules/web-ui-maintenance.mdc`. Marketing vs desk palettes must not mix.

---

## 17. Gotchas

- `readme.rtf` in the project root contained account + DB passwords. Gitignored. Rotate.
- Mock `support.js` is the design-canvas runtime — **not** an app dependency.
- Invoice-processing Cursor rules for Profit Pulse / IOM / MCP were **not** copied; they would be false here.
- Default host in invoice-processing `config.py` pointed at another project; this repo's `thesis_platform.config` **requires** `SUPABASE_URL` or `SUPABASE_DB_HOST` (no silent fallback).
- Do not seed the author's real positions from the May 2026 prompt.
- Next.js listens on **3100**, not 3000 (`apps/web` `npm run dev`).

---

## 18. Next steps

Execute [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) **P1-05**. Needs named migration **010** (`investor_profiles`) before apply. Dev URL is **http://127.0.0.1:3100/** (not 3000). `/portfolio` writes `holding_lots` (CSV / Add position); the grid and Desk read view `holdings`. Display FX writes `portfolios.display_currency` only.

---

## 19. Roadmap

Canonical: [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md). You revise that file to change chunk order or success criteria. Cursor rule: `.cursor/rules/roadmap.mdc`.

---

## 20. Out of scope (v1)

- Brokerage / order execution / US options
- Copying OptimAI inventory, GST, or Profit Pulse
- ActivePieces email ingest
- MCP server / OptimAI Connectors tab
- Same-session admin nav on the research desk (use `/admin/login`)
- Using the May 2026 personal book as default seed
- Executing raw HTML from the model (D30)
- Calling the LLM on login or `/desk` load (D28)
- Weekly email that recommends tickers the family does not hold

---

## 21. Roles

| Role | Can |
|------|-----|
| `desk_owner` (authenticated) | Own profile, holdings, requests, reports, usage, billing for self |
| `platform_admin` | `/admin/login` only. Accounts metadata, plans, prompt registry, read-only impersonation, audit log, observability. **Cannot** `thesis_accept_analysis` or write lots |
| `service_role` | Worker writes, usage_events insert, PDF upload |

---

## 25. Verification

```sql
select id, name from schema_migrations order by id;
-- expect 1..9

select id, openrouter_model_id, thesis_class, is_active from model_catalog where is_active order by sort_order;

select slug, monthly_analysis_limit from plans order by sort_order;
select email, role from users;
select ticker, qty from holdings order by ticker;
select name, is_library_sample from reports;
select id from storage.buckets where id = 'report-pdfs';
```

Expected after Maya seed: 5 `holding_lots` rows, `holdings` view matches, 2 reports (one `is_library_sample`), 1 `usage_events` row of kind `search`.

---

## 26. What we cannot include

- Anon key, service role key, LLM keys, UPI merchant credentials
- Whether `cmksomahsfmsjufakryw` already has non-default tables (needs a SQL login)
- Production domain / Vercel project
