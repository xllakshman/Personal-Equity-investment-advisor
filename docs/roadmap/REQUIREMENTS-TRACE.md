# Requirements trace — design prompt × framework × mock × ROADMAP

Living companion to [`ROADMAP.md`](ROADMAP.md). Framework **structure** is in; Maya’s $150k book, named tickers, and 14.3%/34.3% rates are **not** product defaults — they belong on the user’s profile / tax tables.

Sources:

- Original Claude Design brief (user message 2026-09-13)
- `/Users/lakshmanyeluri/Downloads/Investment Framework Prompt — May 2026.txt` (same text as `docs/mock-ui/uploads/…`)
- Mock: `docs/mock-ui/Thesis.dc.html`, `Home.dc.html`
- OptimAI observability: `activePieces-docker/invoice-processing/docs/roadmap/OPTIMAI-OBSERVABILITY.md`

---

## Design brief → coverage

| # | Brief | Mock | ROADMAP | Gap |
|---|--------|------|---------|-----|
| 1 | Signup/login/reset; **show password if they choose**; name, tax residency, email, phone + **IN/US/UAE** codes | Toggle + those fields | P1-02 success row 6 | Covered |
| 2.1 | Optional CSV ticker, name, cost, total purchased | `/portfolio` | P2-00 | Covered |
| 2.2 | Header **search** + lenses: fundamental, technical, macro, news, **comprehensive** | Header Analyse + four ticks; comprehensive = all four | P1-03b + P3-00 | Covered |
| 2.3 | Invested, book size, %; swing vs long-term; average down; 4 risk bands; 4 CAGR; **conflict messages** | Builder + unused-risk slack | P3-00 conflict **and** slack | Covered |
| 2.4 | LTCG/STCG India **or** US; non-residents; slabs | Residency-conditional copy | P1-05 months/rates; builder copy | Covered once 009 exists |
| 5 | Model picker; charge by model | Model rail | P3-00 Frontier/Quick; P4-00a + **009 applied**; worker **native labs** D39 | `/analyse` reads `model_catalog` labels |
| 6 | Clarify then run | Clarify screen | P3-02 | Covered |
| 7 | Arrange **tables + graphs**; **support dynamic HTML the model returns** | Fixed report tabs + SVG | P5-02 no innerHTML; **P5-04 allowlist (locked)** | Brief HTML rejected; charts jsonb only |
| Sub | Trial, Basic, Professional, **Professional +**; X searches **configurable in admin**; wallet USD; 60/80/90; trial sample PDFs | Plans + wallet + samples; mock also Ultra | P6 dual meter; P7-01; five rows including **Ultra** | Covered — Ultra kept as fifth tier |
| 8 | Refine / double-down | Refine thread | P4-04, P5-02 | Covered |
| 9 | Save to DB; retrieve; **PDF in storage**; **rename** | Library + rename | P5-00/01/03 | Covered |
| 10 | Download PDF **preserving charts/tables** | PDF buttons | P4-03, P5-03 | Renderer still blocked |
| 11 | USD ↔ INR changes displayed values | Header chip | P2-03 | Covered (display-only) |
| Admin | “Admin view with access to all customer accounts” | Admin **inside the desk** if email matches | **P7-00 `/admin/login`** (mock weaker) | Separate login locked; observability P7-05…P7-08; email skipped |
| R1 | Never hardcode; defaults + override | Mostly | P1-05 `investor_profiles` | Covered once 009 exists |
| R2 | RLS; users cannot see each other | Isolation copy | 007 + P8-01 | Covered |
| R2.1 | Prompt via **file upload** | Prompt registry + two-person | P7-02 | Covered |
| R3 | Deny prompt extraction | Refine refusals | P4-04 | Covered |

---

## Framework (structure only) → coverage

Do **not** seed AMZN 53%, $150k, MELI monitoring strings, or 14.3% LTCG as platform defaults.

| Mechanism | Configurable home | Mock | ROADMAP | Gap |
|-----------|-------------------|------|---------|-----|
| Investor book, outside assets, location, cannot trade US options | Profile | Not a settings screen | Missing | **P1-05** |
| Horizon, monitor frequency, target CAGR, sizing 3–15%, 4-tranche **percentages**, cash-reserve % | Profile + builder | Builder has CAGR/risk/intent only | Partial | **P1-05** |
| Known weaknesses (unprompted flags) | Profile flags | Marketing “we tell you without being asked” | Missing on Desk | **P1-06** |
| Step 0 × 7 | Worker | Implied in report | P4-01 | Covered |
| Dual adherence twice | Worker | Copy on marketing | Mention only | Add to P4-02 success |
| F1 moat + sector metric | Report section | Quality table (partial) | P5-02 tabs ≠ F1–F6 | **Required `sections` keys** |
| F2 seven questions + bear between Q5/Q6 | Report | Verdict/evidence | Partial | Same |
| F3 tranches + thesis check on −15% | Execution plan | Execution table | Partial | Covered if F3 keys required |
| F4 profit booking / 15% cap | Report + Desk flag | Sizing copy | Missing Desk flag | **P1-06** |
| F5 max 15 names, sleeve weights | Profile + Desk | Marketing rulebook 05 | Missing enforcement | **P1-06** |
| F6 Track A/B | Intent = swing | Intent enum | Not in report schema | Add section key |
| Runaway / upward-average 7 questions | Worker when intent needs it | — | Missing | P4-02 direction |
| Monthly monitoring searches per holding | Job | Marketing “every login we re-check” | **P8-03** confirm + billed `search`; **no** auto LLM on login | Covered (overrides marketing auto-spend) |
| Weekly digest for holdings | `/billing` toggle; table `weekly_digests` | `/` `#weekly` waitlist (no-op today) | **P8-02** + D41 | Covered (was stub) |
| Crash letter | Profile artifact | — | **P9-00** | Covered |
| Managers / 13F clone rule | Optional research pack | — | **P9-01** | Covered |
| India LRS, blackout windows | Profile | — | **P1-05** | Covered |

---

## Mock extras that are **better** — keep

| Mock extra | Why keep | ROADMAP |
|------------|----------|---------|
| Risk/CAGR **slack** (unused risk budget), not only conflict | Matches “cannot exist” with the inverse warning | P3-00 success |
| Original verdict immutable; refine **billed** (user lock D28, overrides mock “free”) | Safer than rewriting; pass-through model cost | P4-04, D4, D28 |
| Two-person prompt promote | Brief only said “file upload” | P7-02 |
| Trial **sample** notes not counting quota | Brief asked for pre-uploaded PDFs | P5-00 |
| Architecture/handoff screen | Engineering | `/admin/architecture` after separate admin login |
| Expert mode | Density of the note | **P5-02** (keep) |
| Header ticker search | Brief item 2.2 | **P1-03b** |
| 14-day trial CTA | Signup copy | P1-02 copy; plan = `trial` |
| Weekly email is **your** holdings | Better than a blast newsletter | **P8-02** — drop mock “new names worth a look”; 3 vs 15 name cap |

Mock weaker than your ask: admin is the **same** login with a hidden nav item. ROADMAP now uses a **separate admin account**.

---

## Platform admin (locked this session)

- Separate Auth user. Separate entry: `/admin/login` (not the research-desk `/login`).
- Desk session **cannot** open `/admin/*`. Admin session **cannot** call `thesis_accept_analysis` or write `holding_lots`.
- Admin sees **user metadata** (email, residency, plan, usage, last active) and **observability** (OptimAI-shaped: events, minute buckets, watch limits, who used which product, APIs, latency, **Customer Feedback** from `analysis_feedback`). **No** red-watch email in v1 (P7-09 skipped).
- Admin does **not** see `holding_lots` unless `support_access_grants` (already P7-04).
- No MCP/Connectors tabs (Thesis has no MCP). Watch kinds mapped to Analyse, Refine, Auth, Worker jobs, Billing webhooks.

### OptimAI → Thesis observability

Copy **shape**, not GST/IOM/Profit Pulse/MCP.

| OptimAI | Thesis |
|---------|--------|
| `/admin/observability` | same path after `/admin/login` |
| Overview, Watch limits, APIs, Latency, Who used which product, Customer Feedback | P7-06 … P7-08 + **P7-10**; email = P7-09 skipped |
| Connectors / MCP tab | **omit** |
| `observability_events` / `_minute_buckets` / `_thresholds` / `_alert_events` / `_settings` | P7-05 migration **011** (after 009 catalog + 010 profiles) |
| Products (upload, profit pulse, MCP…) | `auth`, `desk`, `analyse`, `portfolio`, `reports`, `refine`, `billing`, `worker` |
| Never store bodies / invoice JSON / tokens | Never store prompt body, `reports.sections`, lot qty, JWT |

**UI today:** no `/admin/*` app, no observability tables. Capture starts only after P7-05. Admin promote is still SQL `tools/db/promote_platform_admin.sql` — no button.

---

## Locked 2026-09-13 (gap review)

| Topic | Decision |
|-------|----------|
| Model HTML | Allowlisted `charts` jsonb; never `innerHTML` (D30, P5-04) |
| Admin host | Same Next app, `/admin/login` (D27) |
| Observability | Overview + Watch limits + APIs + Latency + Who used which product + Customer Feedback (D32, P7-10). **No email** until P7-09 un-skipped |
| Analysis CSAT | `/reports/[id]` after completed Analyse; helpful Yes/No mandatory; five dims + comment optional; `analysis_feedback`; admin tab only (D42, P5-05, P7-10) |
| Plan names | Five rows; Professional + = `premium`; **Ultra** kept (D31) |
| Expert mode | Keep on `/reports/[id]` (D29, P5-02) |
| Crash letter / 13F / LRS | P9-00, P9-01, P1-05 |
| Holdings re-check | Last-checked age on `/desk` only. Button + confirm (ticker count, model, searches or wallet USD) then `usage_events`. Same confirm rule for refine. Login does not spend (D28, P8-03, P4-04) |
| Weekly holdings email | Opt-in `/billing`. Quick model. 3 names unless Professional + / Ultra. Not Analyse. Cost logged, searches not consumed (D41, P8-02) |
| LLM transport | **Native labs** (D39): OpenAI / Anthropic / xAI / DeepSeek. Gemini and Kimi are not on `/analyse`. |
