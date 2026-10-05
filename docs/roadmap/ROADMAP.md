# Thesis — product roadmap

**This file is the progress tracker and the execution contract.** `HANDOFF.md` stays the lock for architecture. The mock remains the visual spec (`docs/mock-ui/`). You revise this file whenever scope or order should change; agents must not silently reorder or mark chunks done.

**Process (locked unless you edit this section):**

1. **One chunk at a time.** Do not start N+1 while N is ⬜ or 🟡.
2. **Scope is the chunk body only.** No drive-by screens, restyles, or extra tables.
3. **Success criteria are the gate.** Automated tests plus the listed click/SQL checks. Browser smoke when the chunk has a route. Three test-fix passes (see process item 7) must pass before Status ✅.
4. **You sign off** (or explicitly skip) before the next chunk. Skipping is written here as `skipped — <reason>`.
5. **After a chunk:** set Status, date, and a one-line note. Mirror one line in `HANDOFF.md` STATUS. Write a session file only if behaviour is user-visible.
6. **If this file and HANDOFF disagree on what to build next, this file wins for order; HANDOFF §3 wins for architecture.**
7. **Three test-fix passes** per chunk, then again when the phase wraps. Pass 1: RLS UI vs API (viewer cannot write; FastAPI join = `user_can_read_family` / `user_can_write_family`) and usage kinds vs `thesis_family_meter_count`. Pass 2: empty/null, invalid enums, quota at 100%, store/retrieve (column written = table the screen reads), FX display must not write back. Pass 3: formatted display, wait copy vs `analysis_requests.status`, prompt leak in HTTP/`error_text`. Fix bugs before the next pass. Contract: [`.cursor/rules/testing.mdc`](../../.cursor/rules/testing.mdc).

Status: ⬜ not started · 🟡 in progress · ✅ done · ❌ skipped

---

## Current

| Field | Value |
|-------|--------|
| **Build next** | **P6-03** — merchant unnamed (blocked) |
| Last done | **P11-11** — `/desk` portfolio vs NASDAQ/S&P trend (display Yahoo chart). **027** applied on DEV only. |
| Blocked on you | P6-03 merchant. Step 0 items 2–7 unnamed. P8-02 email **send** needs a provider. Apply **027** on **PROD** only when you name prod + file + `CONFIRM_APPLY=1`. |
| Mock | `docs/mock-ui/App.dc.html` (desk), `Thesis.dc.html` (login), `Home.dc.html` (marketing) |
| Trace | [`REQUIREMENTS-TRACE.md`](REQUIREMENTS-TRACE.md) — design prompt × framework × mock vs this file |
| DEV DB | `https://cmksomahsfmsjufakryw.supabase.co` — migrations **001–027** applied |
| PROD DB | `https://ndgvglcrkbygovlszxze.supabase.co` — **001–026 applied 2026-10-04**. `holdings` = 0. Maya seed not run. **027 not applied.** |
| PROD web | **`https://eqveste.com`** — Vercel Next.js. FastAPI/worker **`https://api.eqveste.com`** on droplet `157.245.102.243`. |

---

## How a chunk is written

Every chunk names:

| Field | Meaning |
|-------|---------|
| Direction | Exact files, route, RPC, and what the user clicks |
| Writes | Table/view that changes |
| Reads | Table/view the screen uses |
| Who | Role that may do it |
| UI today | button / list-only / RPC-only / seed-only / does not exist |
| Success | Observable checks. If a step never runs, say what the user still sees |
| Testing | Three test-fix passes (testing.mdc) before Status ✅. Phase wrap repeats them across every id in the phase. |

---

## Phase 0 — Foundation

Schema and repo. No product UI.

### P0-00 — Monorepo and Cursor rules

- **Status:** ✅ 2026-09-13
- **Direction:** Top-level `apps/`, `packages/`, `infra/`, `supabase/`, `tools/`, `tests/`, `docs/`, `.cursor/rules/`, `HANDOFF.md`.
- **Writes / reads:** none.
- **Who:** developer.
- **UI today:** does not exist.
- **Success:** Folder READMEs exist; `uv run pytest tests/unit -q` passes; no secrets in git.

### P0-01 — Schema 001–008

- **Status:** ✅ 2026-09-13
- **Direction:** Apply with `CONFIRM_APPLY=1 ./tools/db/apply_foundation.sh`. Tenant is `family_id`. Lots + `holdings` view. RLS in 007. Bucket `report-pdfs`.
- **Writes:** `schema_migrations` 1–8 plus all public tables in those files.
- **Reads:** `HANDOFF.md` §25.
- **Who:** operator (`postgres` via `tools/db`). No button.
- **UI today:** no button; operator runs the shell script.
- **Success:** `select id, name from schema_migrations order by id` returns 1–8; `report-pdfs` bucket exists.

### P0-02 — Synthetic Maya seed

- **Status:** ✅ 2026-09-13
- **Direction:** `supabase/seed/001_maya_desk.sql`. Never the May 2026 personal book.
- **Writes:** `auth.users`, `users`, `families`, `holding_lots`, `analysis_requests`, `reports`, `usage_events`.
- **Reads:** view `holdings`; `reports`.
- **Who:** operator script. Role after seed: `desk_owner`.
- **UI today:** seed-only.
- **Success:** `maya@thesis.demo` exists; 5 lots; `holdings` shows 5 tickers; 2 reports (one `is_library_sample`); 1 `usage_events` row `kind = search`.

### P0-03 — Auth dashboard and keys

- **Status:** ✅ 2026-09-13 — anon + service keys in repo-root `.env`. Desk auth is **Email+password only**. Google and Phone OTP stay off until you turn them on in Authentication → Providers.
- **Depends on:** P0-01
- **Direction:** Keys live in gitignored `.env` (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`). Never paste them in chat. `apps/web/.env.local` is copied in P1-00 (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only). Rotate the password that lived in `readme.rtf` (file still present — operator).
- **Writes:** `.env` (gitignored). Dashboard: Email provider ON.
- **Reads:** none in-app until P1-00.
- **Who:** project owner.
- **UI today:** no product login yet (P1-02).
- **Success:** `.env` has URL, DB password, anon, service (verified present, values not logged). P1-02 uses email+password for `maya@thesis.demo`. Google button in P1-02 may show and must fail with an explicit “Google is not enabled” — do not implement a second password store.
- **Note:** Phone in Supabase is OTP. We do not add a second password table.

### P0-04 — Prod secrets file (`.env.prod`)

- **Status:** ✅ 2026-09-14 — template in git. You paste keys locally; nothing deploys.
- **Depends on:** P0-03
- **Direction:** Gitignored **`.env.prod`** is how you give prod URL + keys. Template: [`.env.prod.example`](../../.env.prod.example). `cp .env.prod.example .env.prod` then paste from [prod API settings](https://supabase.com/dashboard/project/ndgvglcrkbygovlszxze/settings/api). Local `.env` and `apps/web/.env.local` stay on DEV `cmksomahsfmsjufakryw`. `npm run dev` on **3100** must not read `.env.prod`. Agents source `.env.prod` only when you name **prod** this turn. Never paste keys in chat. Never `NEXT_PUBLIC_` a service role.
- **Writes:** `.env.prod` on disk (gitignored).
- **Reads:** none in the running desk until P10-01 / P10-02.
- **Who:** project owner.
- **UI today:** no button.
- **Success:**
  1. `.env.prod.example` is in git with `SUPABASE_URL=https://ndgvglcrkbygovlszxze.supabase.co` and empty key fields.
  2. `git check-ignore -v .env.prod` matches.
  3. You can open `.env.prod` and paste anon, service_role, DB password, and native lab keys. Port 3100 still talks to DEV.

---

## Phase 1 — Desk shell and auth

Visual lock: paper desk (Newsreader + IBM Plex) for authenticated routes. Marketing home is the dark glass page. Do not mix palettes on one route.

### P1-00 — Next.js scaffold

- **Status:** ✅ 2026-09-13
- **Depends on:** P0-01 (P0-03 unblocks real login in P1-02)
- **Direction:** Scaffold `apps/web` App Router, TypeScript, `lib/supabase/` browser + server clients. `NEXT_PUBLIC_*` = URL + anon only. Copy `apps/web/.env.example`. Do not import `docs/mock-ui/support.js`.
- **Writes:** none.
- **Reads:** none.
- **Who:** developer.
- **UI today:** `/` is a Thesis title page (not the mock marketing home). Login is P1-02.
- **Success:**
  1. `cd apps/web && npm run build` passes.
  2. `npm run dev` served a Thesis title, not the default Next welcome. (Port moved to **3100** in P1-01.)
  3. No service-role key in any `NEXT_PUBLIC_*` or client component.

### P1-01 — Marketing home

- **Status:** ✅ 2026-09-13
- **Depends on:** P1-00
- **Direction:** Unauthenticated `/` from `Home.dc.html` (rules, why us, plans copy, waitlist email). CTAs: Log in → `/login`, Create account → `/signup`. Waitlist is a client no-op (success copy only — **no** `marketing_enquiries` table). **Logged-in `/` redirects to `/desk`.** Dev server port **3100**.
- **Writes:** none in this chunk.
- **Reads:** Auth session via `getOptionalUser()` (anon key). No product tables.
- **Who:** anon (desk JWT bounces to `/desk`).
- **UI today:** `/` is the dark-glass marketing page. `/login` and `/signup` are not built yet (P1-02). `/desk` is not built yet (P1-03).
- **Success:**
  1. `/` matches the marketing mock sections (hero, four decisions, seven checks, six rulebooks, plans).
  2. Logged-in visit to `/` **redirects to `/desk`**.
  3. Desktop and a ~390px viewport: CTAs remain usable.

### P1-02 — Login, signup, reset

- **Status:** ✅ 2026-09-13
- **Depends on:** P1-00, P0-03
- **Direction:** `/login`, `/signup`, `/reset`. Supabase Auth email+password. Signup fields: name, tax residency (US / India / UAE / NRI), email, phone with **predefined** country codes **+91 / +1 / +971** only. Password: **Show/Hide control** (visibility off by default, choice never persisted). Min 12 characters. Google button `signInWithOAuth`. Reset: 30-minute link; sessions revoked. Trigger `handle_new_auth_user` creates `users` + `families` + `wallets` + `portfolios`. **This is the research-desk login.** Platform admin uses `/admin/login` (P7-00) — do not put an Admin link here.
- **Writes:** `auth.users` (Auth API); trigger writes `users`, `families`, `family_members`, `wallets`, `portfolios`.
- **Reads:** session via `auth.uid()` → `users`.
- **Who:** anon → `desk_owner`.
- **UI today:** `/login`, `/signup`, `/reset` exist. `/admin/login` is a separate stub (not this form).
- **Success:**
  1. `maya@thesis.demo` / `ThesisMaya!2026` lands on `/desk`.
  2. New email signup creates one `families` row and one `family_members` owner (SQL: `select count(*) from family_members where user_id = auth.uid()` = 1).
  3. Wrong password shows a banner, not a silent fail.
  4. Sign out returns to `/login`.
  5. Google button visible; Google is **off** in this project — error must be explicit (“Google sign-in is not enabled”), not a blank fail. Phone OTP is not a login method in P1-02.
  6. **Show password** reveals the field; reload does not restore visible mode.

### P1-03 — App shell

- **Status:** ✅ 2026-09-13
- **Depends on:** P1-02
- **Direction:** Authenticated **desk** layout (not admin). Sidebar + topbar from mock. Nav only: Desk, New analysis, Portfolio, Reports, Usage, Plans & wallet. **No Admin console, no Handoff notes** on this shell — those are `/admin/*` after `/admin/login`. Header: ticker search + Analyse (P1-03b). Usage meter may show `—` until P6-00. USD/INR chip until P2-03 can no-op visually.
- **Writes:** none.
- **Reads:** `users.role`, `users.full_name` (JWT + `users` row).
- **Who:** `desk_owner` / family member. Platform admin uses a different login.
- **UI today:** authenticated paper shell on `/desk` and the five sibling routes. No Admin nav item. `/admin` → `/admin/login`.
- **Success:**
  1. Maya sees no Admin console and `/admin` redirects to `/admin/login`.
  2. All six desk links render and 404 with a Thesis empty state (not the Next default) until later chunks fill them.
  3. Nav labels match the mock desk. No extra items.

### P1-03b — Header ticker search

- **Status:** ✅ 2026-09-13 — reads view `holdings` (seed lots). Manual add still P2-02.
- **Depends on:** P1-03, P2-01
- **Direction:** Topbar “Search a ticker to analyse”. Uppercase ticker. **Does not enqueue.** If that ticker exists on view `holdings` for this `family_id`, Analyse goes to `/analyse?ticker=MSFT`. If it does **not**, stay on desk/search and send the user to `/portfolio?add=TSM` with copy: add this name to the book before analysis (D33). Empty search does not call `thesis_accept_analysis`.
- **Writes:** none.
- **Reads:** `holdings`.
- **Who:** signed-in desk user.
- **UI today:** mock searches any ticker — **do not copy free search**.
- **Success:** Maya `tsm` + Analyse opens `/analyse?ticker=TSM`. Ticker `ZZZZ` (not in lots) never opens a runnable builder; `/portfolio` add path is shown. Empty search inserts 0 `analysis_requests`.

### P1-05 — Investor profile (framework knobs, not Maya’s book)

- **Status:** ✅ 2026-09-13 — `/settings/profile` + **010** applied on DEV. Persist smoke (LTCG months 18) not re-run this session.
- **Depends on:** P1-02. Needs migration **010** (`investor_profiles` on `family_id`).
- **Direction:** `/settings/profile` (or Desk “Profile”). Defaults the worker uses when the prompt file must **not** hardcode: cannot_trade_us_options (default true for India residency), monitor_per_week, horizon_years, cash_reserve_pct_min/max, concentration_cap_pct (default 15), trim_to_pct (default 12), tranche_t1..t4 percents (default 35/25/25/15), position_size_min/max_pct (default 3/15), ltcg_holding_months (India 24, US 12 — **user can override**), ltcg_rate_bps / stcg_rate_bps (defaults from residency table, **user can override**), outside_book jsonb (cash/gold/house/unlisted — optional). **India extras (locked 2026-09-13):** `lrs_enabled` (default true when residency is India), `lrs_annual_cap_usd` (user override; no Maya dollar amount as product default), `blackout_windows` jsonb (earnings / filing dates the owner types — empty by default). **No `max_positions`.** **Never** copy the May 2026 AMZN weights into defaults.
- **Writes:** `investor_profiles`.
- **Reads:** same; worker reads this row in P4-02 variable pack.
- **Who:** family owner.
- **UI today:** header **Profile** → `/settings/profile`. **Save profile** upserts `investor_profiles` after **010** is applied. No extra sidebar item.
- **Success:**
  1. Changing `ltcg_holding_months` to 18 persists; reload shows 18.
  2. `prompt_versions.body` in git/bootstrap has no `$150,000` as a required value.
  3. India default LTCG months = 24; US = 12; user override 18 saves.
  4. India residency shows LRS fields; US residency hides them. Saving a blackout window persists on reload.

### P1-06 — Unprompted desk flags (F4/F5)

- **Status:** ✅ 2026-10-04
- **Depends on:** P1-04, P1-05, P2-01
- **Direction:** Desk banner list, no click required: cash reserve below profile min; any `holdings` weight > concentration cap. Copy from marketing “we tell you without being asked”. No live price required (use cost×qty weights). No position-count cap (`max_positions` was dropped).
- **Writes:** none.
- **Reads:** `holdings`, `investor_profiles`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Raise Maya’s largest holding weight above `concentration_cap_pct` (SQL or a large lot) → Desk shows the concentration flag. Maya seed at 5 names under 15% each shows no that flag. No over-diversified / max-positions banner.

### P1-04 — Desk home (read)

- **Status:** ✅ 2026-09-13
- **Depends on:** P1-03
- **Direction:** `/desk`. KPIs from SQL for `family_id` of the session: portfolio value is **not** stored — do not fake LTP. Show position **count** from `holdings`, analyses this cycle from `usage_events` (`kind = search`, `billing_period = date_trunc('month', now())`), recent `reports.name`. Per-ticker **last checked** age from latest `analysis_evidence` / `reports` (read-only; “never” if none). **Do not** call a model or insert `usage_events` on this load (D28 / P8-03). “New analysis” → `/analyse`. “Upload portfolio” → `/portfolio`. Re-check button is **P8-03**, not this chunk.
- **Writes:** none.
- **Reads:** `holdings`, `usage_events`, `reports`, `families.plan_id` → `plans`.
- **Who:** family member (`user_can_read_family`).
- **UI today:** `/desk` KPIs from `holdings` / `usage_events` / `reports`. No live price. No model call on load.
- **Success:**
  1. Maya sees 5 positions and 1 analysis used this cycle (seed).
  2. Recent notes list includes `MSFT — accumulate on weakness`.
  3. A second Auth user cannot see Maya’s rows (open two browsers).
  4. Do **not** display live prices in this chunk (no market-data vendor yet). Copy may say last cost, not last.

---

## Phase 2 — Portfolio

CSV columns locked: `ticker, company_name, cost_per_share, total_purchased`. Rejected rows shown, never silently dropped. Native currency on the lot; FX is display-only.

### P2-00 — CSV import

- **Status:** ✅ 2026-09-13 — `/portfolio` Upload CSV → `portfolio_import_rows` then `holding_lots` (`source = csv`). Default append.
- **Depends on:** P1-04
- **Direction:** `/portfolio` Upload CSV. Parse client-side for preview; commit via server action/API that inserts `portfolio_import_rows` then `holding_lots` (`source = csv`, `qty = total_purchased / cost_per_share`). Guess currency from exchange (NSE → INR, else USD) with an override control. Rows we cannot parse stay in `portfolio_import_rows.accepted = false`.
- **Writes:** `portfolio_import_rows`, `holding_lots`.
- **Reads:** same, plus view `holdings` after commit.
- **Who:** family owner/member (`user_can_write_family`).
- **UI today:** button — Upload CSV / Save to workspace (replace is an opt-in checkbox).
- **Success:**
  1. A 5-row valid CSV for a **new** family creates 5 lots; `holdings` has 5 rows.
  2. A row with blank ticker is rejected and listed; no lot inserted for it.
  3. Re-upload does not silently replace lots unless you confirm in-chunk (default: **append** lots).
  4. Converted INR is never written into `cost_per_share`.

### P2-01 — Holdings table

- **Status:** ✅ 2026-09-13 — grid reads view `holdings`; Last / Value / P&L are **—**; weight from cost×qty.
- **Depends on:** P2-00
- **Direction:** Same page. Grid columns from mock: ticker, company, qty, cost, (last price optional/omitted), value if last omitted skip, P&amp;L skip or “—” , weight from cost×qty / sum. Data from view `holdings`.
- **Writes:** none.
- **Reads:** `holdings`.
- **Who:** family read.
- **UI today:** table on `/portfolio`.
- **Success:** Maya’s seeded lots render; qty and average cost match the view (SQL vs screen). Two lots of the same ticker (if you add a second MSFT lot in SQL) collapse to one grid row with `lot_count = 2`.

### P2-02 — Manual add lot

- **Status:** ✅ 2026-09-13 — “Add position” inserts `holding_lots` (`source = manual`). `/portfolio?add=` prefills ticker.
- **Depends on:** P2-01
- **Direction:** “Or enter manually” / Add position. Insert one `holding_lots` row (`source = manual`). This is the path when header search finds a ticker **not** on the book (P1-03b `?add=`). After save, user may open `/analyse?ticker=`.
- **Writes:** `holding_lots`.
- **Reads:** `holdings`.
- **Who:** family write.
- **UI today:** button — Add position. Header search still routes unknown tickers here.
- **Success:** Add `GOOG` qty 1 cost 100 USD → view gains a row; Desk position count becomes 6 for Maya. After that, `/analyse?ticker=GOOG` is allowed (D33).

### P2-03 — Display currency

- **Status:** ✅ 2026-09-13 — writes `portfolios.display_currency` / `fx_usd_inr_override`; converts only in the renderer.
- **Depends on:** P2-01
- **Direction:** Store `portfolios.display_currency` and optional `fx_usd_inr_override`. Convert **only in the renderer**. Never `UPDATE holding_lots.cost_per_share` from the FX control.
- **Writes:** `portfolios.display_currency`, `portfolios.fx_usd_inr_override`.
- **Reads:** `portfolios`, `holdings`.
- **Who:** family write.
- **UI today:** button on `/portfolio` plus header chip (same `portfolios` row).
- **Success:** Toggle USD ↔ INR changes labels; reload still has original USD `cost_per_share` on lots (SQL check).

---

## Phase 3 — Request builder (enqueue, no LLM)

RPC `thesis_accept_analysis` already exists. Conflict: `risk in (low, medium) AND cagr in (high, extreme)` → 422 / SQL exception `THS-RISK-001`.

### P3-00 — Builder form

- **Status:** ✅ 2026-09-13 — `/analyse?ticker=` form. Continue does not call the RPC.
- **Depends on:** P1-03, P2-01
- **Direction:** `/analyse`. Ticker must already exist on view `holdings` for this family (D33). Prefill from lots; do not offer a free-text ticker that is not held — send to `/portfolio` add. Lenses: fundamental, technical, macro, news. **Comprehensive** = all four ticked (mock behaviour). Tax lens optional extra. Position: invested + portfolio size → derived allocation. Intent + avg-down enums. Risk/CAGR radios. **Conflict** when risk is low or medium **and** CAGR is high or extreme (disable Continue). **Slack** when risk is high/extreme **and** CAGR is low (warning, still runnable). Tax residency + slab (residency-conditional copy; rates from `investor_profiles` once P1-05 exists). **Model picker:** `model_catalog` where `is_active`, gated by `plans.allowed_model_ids`. Group **Frontier** then **Quick** (`thesis_class`); under each group show provider + `label` + `vendor_class` (Opus, Flash, Luna, …). Selected `id` is what `thesis_accept_analysis` stores. Continue disabled on conflict, zero lenses, ticker not held, or no model. Upgrade copy when a Frontier row is visible but not on the plan.
- **Writes:** none yet (form state only).
- **Reads:** `model_catalog`, `plans`, `holdings` (required; also prefill invested).
- **Who:** family write.
- **UI today:** button — Continue on `/analyse` (disabled on conflict / unheld ticker / zero lenses / locked model).
- **Success:** Prefill MSFT invested from lots; Continue enabled. Open `/analyse?ticker=ZZZZ` with no lot → Continue disabled and add-to-portfolio CTA. Switching risk/cagr to low + high CAGR shows Incompatible pair and disables Continue. Switching to high risk + low CAGR shows Unused risk budget and **allows** Continue. Ticking Comprehensive checks all four lenses. Picker lists Frontier and Quick; Maya on Professional can select `opus5`; trial cannot select `gpt6a`.

### P3-01 — Server conflict and quota

- **Status:** ✅ 2026-09-13 — Run analysis calls `thesis_accept_analysis`; **011** adds `THS-HOLDING-001`.
- **Depends on:** P3-00
- **Direction:** Call `thesis_accept_analysis` from a server action. Map `THS-RISK-001`, `THS-QUOTA-001`, and **`THS-HOLDING-001`** (ticker not on `holdings` for `family_id`) to banners. Extend the RPC in a **named migration in this chunk** if 005 does not already reject missing lots. Client check is a mirror only. Each accepted run inserts `usage_events.kind = search` (counts on the plan / wallet meter).
- **Writes:** `analysis_requests`, `usage_events` (`kind = search`).
- **Reads:** `plans.monthly_analysis_limit`, `usage_events`, `holdings`.
- **Who:** family write. Quota is family-scoped.
- **UI today:** button — **Run analysis** / **Skip — record assumptions** on the clarify step. Server action maps `THS-RISK-001`, `THS-QUOTA-001`, `THS-HOLDING-001`.
- **Success:**
  1. Compatible Maya MSFT run inserts one `analysis_requests` row `status = queued` and increments search count.
  2. Forcing conflict via crafted POST (bypass UI) still 422; no row.
  3. Crafted POST for ticker not in `holdings` → `THS-HOLDING-001`; no `usage_events`.
  4. After 20 search events in the month (Professional = 20), the 21st is refused; Reports still lists old notes.

### P3-02 — Clarifying questions

- **Status:** ✅ 2026-09-13 — Request builder → Continue → clarify → Run analysis.
- **Depends on:** P3-01
- **Direction:** `/analyse/[requestId]/clarify` **or** a step before accept — pick one. **Default:** collect clarifications **before** `thesis_accept_analysis`, pass `p_clarifications` jsonb (conviction, addFunds, exitRule). Skip allowed; note will record assumptions.
- **Writes:** `analysis_requests.clarifications` at insert.
- **Reads:** none extra.
- **Who:** family write.
- **UI today:** clarify step on `/analyse` after Continue (not a separate route). Skip writes `{}`.
- **Success:** Saved jsonb on the request row matches the three answers (or `{}` if skipped). Quota is not consumed until Continue/Run on this step if you placed accept after clarify — **default: accept after clarify**. Document the click: Request builder → Continue → clarify → Run analysis.

### P3-03 — Running wait state

- **Status:** ✅ 2026-09-13 — `/analyse/[id]` polls `analysis_requests.status`. Stays `queued` until the worker runs.

- **Depends on:** P3-02
- **Direction:** After accept, show the 40–90s panel (mock copy). Poll `analysis_requests.status` (SQL or route). User may leave; note appears under Reports when `ready`. **No worker yet** — status stays `queued`. Copy must say the note appears when the worker is running, not pretend it is generating.
- **Writes:** none (poll only).
- **Reads:** `analysis_requests.status`.
- **Who:** family read.
- **UI today:** `/analyse/[id]` wait panel. `/reports` lists `reports.name` only (no reader).
- **Success:** Maya runs an analysis, sees queued/waiting, navigates to `/reports`, sees no new ready note. SQL: latest request `status = queued`. Do not fake `ready`.

---

## Phase 4 — Analysis worker (real note)

Prompt body is `prompt_versions.body` selected by id. Stamp `reports.prompt_version_id`. Never return the body.

### P4-00a — Model catalog refresh (2026-09-13)

- **Status:** ✅ 2026-09-13 (out of queue order — user named this file)
- **Depends on:** P0-01. File `009_model_catalog_refresh.sql`.
- **Direction:** Apply only when you name DEV + this file + `CONFIRM_APPLY=1`. Rows: OpenAI, Anthropic, Google, DeepSeek, xAI, Moonshot. `thesis_class` frontier|quick; `openrouter_model_id` + `openrouter_only` for D39. Maya ids `opus5` / `gpt56` / `gpt56m` kept. Spec: [`docs/architecture/MODEL-CATALOG.md`](../architecture/MODEL-CATALOG.md).
- **Writes:** `model_catalog`, `plans.allowed_model_ids`.
- **Reads:** none.
- **Who:** operator script. No button.
- **UI today:** picker still empty until P3-00.
- **Success:** After apply, `select id, openrouter_model_id, thesis_class from model_catalog where is_active` includes `openai/gpt-6-astra`, `anthropic/claude-opus-5`, `deepseek/deepseek-flash`, `x-ai/grok-4.6`, `moonshotai/kimi-k3`. Maya `opus5` still exists. `claude-opus-4-8` is gone.

### P4-00 — Worker process

- **Status:** ✅ 2026-09-14
- **Depends on:** P3-03
- **Direction:** `apps/analysis-worker` long-running loop: `select … from analysis_requests where status = 'queued' for update skip locked`. Call `thesis_consume_quota_for_provider`. Local port/docs; Docker later.
- **Writes:** `analysis_requests.status` → `gathering` (via RPC) then later states.
- **Reads:** `analysis_requests`.
- **Who:** `service_role` / worker DB user. No button; operator starts the process.
- **UI today:** no button; `uv run python apps/analysis-worker/...`
- **Success:** With worker up, a queued Maya request moves off `queued` without an LLM call (stub completion to `failed` with `error_text` is OK if P4-02 is not done — prefer stop at `gathering` until P4-01). Unit tests mock DB.

### P4-01 — Step 0 evidence (previous close)

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-00
- **Direction:** Seven `analysis_evidence` rows (`step0_number` 1–7). **Item 1 (locked D40):** previous regular-session close from Yahoo chart v8 — see [`docs/architecture/MARKET-DATA.md`](../architecture/MARKET-DATA.md). No API key. Cache one close per Yahoo symbol per day. Never call this on `/desk` load. **Do not estimate** a price. Empty/429/unknown exchange → job `failed`, no `reports`. Items 2–7 (news, earnings, bear, competitor, sector) still have **no vendor** — comprehensive run must fail with `error_text` listing which Step 0 numbers are missing; do not invent them from the close.
- **Writes:** `analysis_evidence`; optional `eod_quotes` in this chunk’s migration if you add a cache table.
- **Reads:** Yahoo HTTP as above.
- **Who:** worker.
- **UI today:** no button.
- **Success:** Maya MSFT gather stores a numeric close and currency on evidence row 1 from Yahoo `MSFT`, not from `holding_lots.cost_per_share`. A forced empty Yahoo response inserts no `reports`. `/desk` load adds zero Yahoo HTTP.

### P4-02 — Framework completion

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-01
- **Direction:** OpenRouter adapter (D39) keyed by `analysis_requests.model_id` → `model_catalog` row. HTTP to `https://openrouter.ai/api/v1/chat/completions` with `model` = `openrouter_model_id`, `provider.allow_fallbacks: false`, `provider.only: [openrouter_only]`. Copy OpenRouter `usage` into `usage_events.cost_cents` when present. Never substitute Luna/Haiku/Flash; never `openrouter/auto`. Missing `OPENROUTER_API_KEY` or a response `model` that does not match the slug → `failed` with `error_text`, no `reports` row. Static prompt prefix from `prompt_versions` (promoted row) then **variable pack**: ticker, evidence, `holding_lots`, clarifications, **`investor_profiles`**, and on refine the user **enrichment** text. Never embed Maya’s personal book. Refuse to complete if ticker is not on `holdings`. Dual adherence check twice inside the worker; any NO redoes that section before insert. Output `sections` jsonb. **Required keys on a comprehensive run:** `step0`, `moat` (F1), `pre_buy` (F2 including `bear_case` before variant perception), `sizing` (F3), `profit_booking` (F4), `construction` (F5), `dual_sleeve` (F6 if intent is swing), `verdict`. Insert `reports` (immutable) with the **same** `model_id`. Set request `ready`. Never recommend US options if `cannot_trade_us_options`.
- **Writes:** `reports`, `analysis_requests.status`, `analysis_requests.completed_at`.
- **Reads:** `prompt_versions` (service role), `holding_lots`, `analysis_evidence`, `model_catalog`.
- **Who:** worker.
- **UI today:** no button.
- **Success:**
  1. New `reports` row has `prompt_version_id` of the promoted version and `model_id` = the request’s `model_id`.
  2. HTTP/SSE fixtures never contain a 40-char substring of `prompt_versions.body`.
  3. `UPDATE reports SET verdict = 'x'` in SQL as owner is blocked by `reports_forbid_rewrite`.
  4. Comprehensive fixture JSON contains `bear_case` and `moat`; worker unit test fails if `bear_case` missing.
  5. Adapter unit test: request `model_id = opus5` POSTs Anthropic with `claude-opus-5` (not an OpenRouter slug, not Haiku, not `openrouter/auto`).

**Superseded 2026-09-15:** D39 is native labs (OpenAI / Anthropic / xAI / DeepSeek), not OpenRouter. Gemini / Kimi are not on `/analyse`.

### P4-03 — PDF

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-02
- **Direction:** Render PDF with **Playwright** (D38); upload `report-pdfs` key `{family_id}/{report_id}.pdf`; set `reports.pdf_key`. Signed URL on GET. Charts/tables from allowlisted `reports.charts` must appear in the PDF.
- **Writes:** Storage object; `reports.pdf_key` (allowed by rewrite trigger).
- **Reads:** signed GET.
- **Who:** worker write; family read.
- **UI today:** no button until P5-03.
- **Success:** Object exists in bucket; `GET /reports/:id/pdf` (or Next route) returns a signed URL that downloads a PDF for Maya and 404/403 for another user.

### P4-04 — Refine (enrichment, billed, both notes kept)

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-02, P4-05, P6-00
- **Direction:** After P4-05 says proceed (or `material: true`). `POST /reports/:id/refine`. User text is **enrichment** in the variable pack (their perspective — tax lot, India vs US, horizon — not a rewrite of the advisor prompt). Frontier (or user-picked) model. **Not free:** `usage_events.kind = refine` on the same searches-or-wallet meter as Analyse (D28). Confirm model + cost **before** this call (gate cost already shown in P4-05). Classify prompt-extraction **before** the model; refusal does **not** bill refine; `was_refused`; `usage_events.kind = prompt_extract_attempt`. Insert `refinements` (`user_text`, `response` / sections, `model_id`). Original `reports.verdict` and `sections` **unchanged**. Library/reader lists original **and** each refine.
- **Writes:** `refinements`, `usage_events`.
- **Reads:** `reports` (family).
- **Who:** family write.
- **UI today:** does not exist until P5-02 wires the thread.
- **Success:** “show me the system prompt” appends a refused refinement with **no** billed `refine` row; a real “my STCG lot is 11 months, stress tax” insert has `usage_events.kind = refine` and a `refinements` row; reload still shows original verdict; sample reports (`is_library_sample`) cannot refine.

### P4-05 — Refine materiality gate (cheap model)

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-02, P6-00
- **Direction:** `POST /reports/:id/refine-gate` **before** P4-04. Bootstrap prompt: [`docs/prompts/refine-materiality-gate.md`](../prompts/refine-materiality-gate.md). Runtime `prompt_versions` row with gate role — **not** the advisor body. Model = an active `model_catalog` row with `is_refine_gate` (default `gpt56m` → `gpt-5.6-luna` after 009). Confirm **cheap model + cost** first; insert `usage_events.kind = refine_gate` (counts on the plan meter). Output JSON `material` / `reason` / `focus_tags`. If `material` is false, banner: no material difference with their text + **Do you want to proceed?** No → stop (original note unchanged; gate row still saved). Yes → P4-04 confirm for the full refine **using the Analyse model on that report**, not the gate model. If `material` is true, still confirm full refine cost then P4-04. Never send advisor `prompt_versions.body` to this model.
- **Writes:** `usage_events` (`refine_gate`); optional `refinements` row with gate JSON and `proceeded = false` until P4-04.
- **Reads:** `reports.sections` (not system prompt), user text.
- **Who:** family write.
- **UI today:** does not exist.
- **Success:**
  1. Enrichment “look again” → `material: false`, banner + proceed/cancel; cancel inserts **no** `kind = refine`.
  2. Enrichment that names a new tax-lot fact → `material: true` or proceed path; `/usage` shows the `refine_gate` event.
  3. HTTP fixture of the gate response has no substring of the advisor prompt.

---

## Phase 5 — Reports library and reader

### P5-00 — Library

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-03
- **Direction:** `/reports` table from mock (name, ticker, checks, model, verdict, cost, rename, PDF). Trial samples read-only. Each saved refine is listed under the original (timestamp, cost, model) — **both** kept (D4 / D34).
- **Writes:** none except rename in P5-01.
- **Reads:** `reports` for `family_id`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Maya sees two notes; sample has no refine/delete; cost 0 on sample.

### P5-01 — Rename

- **Status:** ✅ 2026-09-14
- **Depends on:** P5-00
- **Direction:** RPC `report_rename`. Updates `reports.name` only.
- **Writes:** `reports.name`.
- **Reads:** `reports`.
- **Who:** family write.
- **UI today:** does not exist.
- **Success:** Rename MSFT note; reload shows new name; `verdict` unchanged.

### P5-02 — Report reader

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-04 (can start layout on seed JSON before worker)
- **Direction:** `/reports/[id]` tabs aligned to mock **and** framework keys: verdict, evidence (Step 0), moat/quality (F1), execution/tranches (F3), scenarios, tax, news, refine. Seed Maya note uses stub `sections` jsonb until worker fills real structure. Do not invent extra nav. **Do not render arbitrary `innerHTML` from the model in this chunk.** Header **Expert / Beginner** toggle (mock): Expert shows denser tables and extra section keys; Beginner hides them. Preference may live in `localStorage` this chunk; do not invent a table. Refine send is P4-04 (confirm + bill). Satisfaction survey is **P5-05**, not this chunk.
- **Writes:** none (refine is P4-04 / thread UI here).
- **Reads:** `reports`, `analysis_evidence`, `refinements`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Open Maya MSFT note; another user 404s. Tabs render without throwing on stub json. Expert toggle densifies tables; Beginner hides extra keys.

### P5-04 — Model charts (allowlist, not raw HTML)

- **Status:** ✅ 2026-09-14 **Locked:** allowlisted `charts` jsonb only. Types `line | bar | table | waterfall`. Renderer in `apps/web`. Reject unknown types. Raw HTML / `<script>` from the model is **not** executed.
- **Depends on:** P5-02
- **Direction:** Map `reports.charts` to the existing pictorial panels (price, RSI, peers, revenue/margin, tax waterfall).
- **Writes:** none (worker already stored jsonb in P4-02).
- **Reads:** `reports.charts`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** A fixture with `type=bar` renders; a fixture with `type=html` / a `<script>` string is dropped and logged, not injected.

### P5-03 — PDF download in UI

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-03, P5-00
- **Direction:** PDF action on library + reader. Signed URL. Rename in P5-01 does not require rewriting the object in this chunk unless you already store filename in metadata.
- **Writes:** none.
- **Reads:** Storage via signed URL.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Maya downloads; other account cannot use Maya’s key.

### P5-05 — Analysis satisfaction survey

- **Status:** ✅ 2026-09-14
- **Depends on:** P5-02
- **Direction:** After `analysis_requests.status = completed` and a `reports` row exists, `/reports/[id]` shows a **Satisfaction** panel (same page; no new desk nav). **Mandatory:** “Is the analysis provided helpful?” **Yes** or **No** (radio; Submit disabled until chosen). **Optional (1–5, blank allowed):** five dimensions below. **Optional:** open text (max 2000 characters). Submit calls RPC `thesis_submit_analysis_feedback`. One row per `reports.id` (unique). Not shown on `is_library_sample`. Failed jobs have no report → no form. Refine does **not** open a second form (no new `reports` row). Closing the tab without Submit inserts **nothing**; a banner stays on that note until they submit. They can read the note first. Copy must not claim this is billed or that it changes the verdict (`reports` stay immutable).
  **Optional dimensions (locked labels):**
  1. Were the facts and sources clear enough?
  2. Did the note help you decide what to do with this position?
  3. Was the downside / bear case treated seriously?
  4. Were the next steps specific enough?
  5. Did it use your holdings, tax residency, and risk/CAGR as you entered them?
- **Writes:** `analysis_feedback` (migration next unused number when this chunk starts): `id`, `family_id`, `report_id` unique references `reports`, `user_id` (`auth.uid()`), `ticker` (copy from `reports.ticker` for admin list without joining sections), `model_id`, `helpful` boolean not null, `dim_evidence` / `dim_decision` / `dim_bear` / `dim_next_steps` / `dim_personal_fit` smallint null check 1–5, `comment` text null, `created_at`. RLS: family insert/select own; **no** update/delete for `authenticated`. Admin read via P7-10. Never store `reports.sections`, lot qty, or prompt body on this row.
- **Reads:** `/reports/[id]` reads whether a row exists for this `report_id` (show form vs “Thanks”).
- **Who:** family member with `user_can_write_family` submits. Platform admin does not submit from the desk.
- **UI today:** does not exist.
- **Success:**
  1. Maya opens seed MSFT sample (`is_library_sample`): **no** form, **zero** `analysis_feedback` rows.
  2. Submit with neither Yes nor No: RPC refuses; table unchanged.
  3. Submit Yes only: one row, five dim columns null, `comment` null; reload shows Thanks, no second insert.
  4. Another family JWT cannot insert for Maya’s `report_id`.
  5. `/admin/observability` without P7-10 still has no Customer Feedback tab (desk form does not add admin nav).

---

## Phase 6 — Usage and billing

Allowances are `plans` / `plan_notice_thresholds` rows. 100% blocks new **model** calls; saved notes stay readable.

**Locked (2026-09-13):** every request that reaches the LLM adapter is billed to the family (searches count **or** wallet USD). The screen that triggers it must show model + cost **before** the call. Opening `/desk` or listing holdings is not a model call and must not insert `usage_events` for search/refine.

### P6-00 — Usage page and meter

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-03
- **Direction:** `/usage` + shell meter. Counts `usage_events` for the family, current `billing_period`, kinds **`search` + `refine` + `refine_gate`**. Mode is **searches** (plan limit) **or** **wallet USD** (`wallets` vs sum of `cost_cents`) depending on `families` billing mode. Notices at 60/80/90 from `plan_notice_thresholds` for **either** meter. Not a client-only counter.
- **Writes:** none.
- **Reads:** `usage_events`, `plans`, `plan_notice_thresholds`, `wallets`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Maya shows 1 / 20 if still on Professional after seed; after P3-01 extra runs the meter matches `count(*)`.

### P6-01 — Plan grid

- **Status:** ✅ 2026-09-14
- **Depends on:** P6-00
- **Direction:** `/billing` plan cards from `plans`. **Five paid/trial rows (locked):** Trial, Basic, Professional, **Professional +** (display for slug `premium`), **Ultra** (own display name, slug `ultra`). Current plan from `families.plan_id`. Choosing a plan does **not** charge until P6-03. Copy recommends upgrade when last runs used a frontier model the current plan cannot select.
- **Writes:** none in this chunk (or a `pending_plan_id` only if you add a column — **do not** without migration).
- **Reads:** `plans`, `families`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Five plans render; Maya highlighted Professional; card titled **Professional +** is the `premium` row; card titled **Ultra** is the `ultra` row.

### P6-02 — Wallet display

- **Status:** ✅ 2026-09-14
- **Depends on:** P6-01
- **Direction:** Wallet card from `wallets.balance_cents`. Top-up form UI only; no provider call.
- **Writes:** none.
- **Reads:** `wallets`.
- **Who:** family read.
- **UI today:** does not exist.
- **Success:** Maya balance 0 unless you seeded otherwise; form visible, submit shows “UPI not connected” rather than decrementing.

### P6-03 — UPI collect / subscribe

- **Status:** ⬜ **placeholder** — 2026-09-13; no merchant. Do not start real collect.
- **Depends on:** P6-01
- **Direction:** `/billing` may show UPI/card **copy and disabled checkout**. Submit must not insert a paid `invoices` row or change `families.plan_id`. Seeded `plans.price_cents` stay. Un-skip when you name the merchant and put credentials in `.env` (never `NEXT_PUBLIC_*`).
- **Writes:** none until un-skipped.
- **Reads:** `plans` for display only.
- **Who:** family sees placeholder; operator later.
- **UI today:** `/billing` Subscribe inserts `invoices` (`status = pending`, `provider = upi`). It does **not** change `families.plan_id`. Resend emails `lakshmaneluri@gmail.com`. `/admin/accounts` Activate/Deactivate calls `thesis_admin_set_family_plan` after **025**. Merchant collect still unnamed.
- **Success:** Until un-skipped: Maya cannot complete a payment; SQL `invoices` count unchanged after clicking Pay.

---

## Phase 7 — Platform admin (separate login) + observability

**Locked:** Admin is **not** a nav item on the research desk. Seed/promote `users.role = platform_admin`. Entry is `/admin/login`. Same Auth project, different route + middleware. Desk JWT hitting `/admin/*` → `/admin/login`. Admin JWT hitting `/desk` or `thesis_accept_analysis` → 403.

Observability follows OptimAI (`/admin/observability`): capture API + page + worker; **never** store prompt body, report sections, lot qty, or tokens. No Connectors/MCP tabs. **v1 tabs:** Overview, Watch limits, APIs, Latency, Who used which product, **Customer Feedback (P7-10)**. Red-watch **email is not v1** (P7-09 skipped until you name a provider and un-skip).

Promote still: `tools/db/promote_platform_admin.sql` (no self-serve button).

### P7-00 — Separate admin login + accounts

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-00, P0-03
- **Direction:** `/admin/login` (email+password; Google optional). Success → `/admin/accounts`. Table: email, name, residency, plan, searches used / limit, MTD $ , last active. **Not** `holding_lots`. Maya’s `/login` never lands here. First admin user: promote SQL then this login.
- **Writes:** none (read). Auth session cookie scoped; middleware `requirePlatformAdmin`.
- **Reads:** `users`, `families`, `plans`, `usage_events` aggregates; `reports_admin_meta`.
- **Who:** `platform_admin` only.
- **UI today:** mock embeds admin in the desk — **do not copy that**.
- **Success:**
  1. `maya@thesis.demo` on `/admin/login` is rejected (not `platform_admin`).
  2. Promoted admin opens `/admin/accounts`, sees Maya’s email and plan, not lot qty.
  3. That admin session on `/desk` is 403 or bounced to `/admin/accounts`.
  4. Maya session on `/admin/accounts` redirects to `/admin/login`.

### P7-01 — Plans and limits

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-00
- **Direction:** `/admin/plans`. Edit `plans.monthly_analysis_limit`, `allowed_model_ids`, `plan_notice_thresholds` (60/80/90/100), trial sample count. Copy: next billing cycle. This is the “X is configurable on the admin account” from the brief.
- **Writes:** `plans`, `plan_notice_thresholds`.
- **Reads:** same.
- **Who:** `platform_admin`.
- **UI today:** does not exist.
- **Success:** Change Basic limit 5 → 6; SQL matches; Maya’s Professional unchanged.

### P7-02 — Prompt registry

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-00
- **Direction:** `/admin/prompt`. File upload staged `prompt_versions`; two-person `prompt_version_approvals`. Never send `body` to a desk client. Admin server action only.
- **Writes:** `prompt_versions`, `prompt_version_approvals`.
- **Reads:** `prompt_versions_meta`.
- **Who:** `platform_admin` × two people for promote.
- **UI today:** does not exist.
- **Success:** Single admin cannot approve their own upload. List shows semver, not prompt text.

### P7-03 — Read-only impersonation

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-00
- **Direction:** From `/admin/accounts` View as. `impersonation_open` / `close`. Banner on a **read-only preview** of desk chrome, not a writable desk session. Block `thesis_accept_analysis`, lot writes, billing.
- **Writes:** `audit_log` only.
- **Reads:** `reports_admin_meta`; not lots unless P7-04.
- **Who:** `platform_admin`.
- **UI today:** mock banner on the same shell — preview must still be admin-origin.
- **Success:** Cannot click Run analysis; `audit_log` has open+close; lots query returns 0 without grant.

### P7-04 — Support grant for holdings

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-03
- **Direction:** Family owner toggle on `/portfolio` “Allow support to see holdings” → `support_access_grants`. Admin then may SELECT lots.
- **Writes:** `support_access_grants`.
- **Reads:** `holding_lots` via `admin_has_holdings_support_access`.
- **Who:** family owner grants; admin reads.
- **UI today:** does not exist.
- **Success:** Without grant, admin sees no lots. With unexpired grant, lots visible. After expiry, hidden.

### P7-05 — Observability schema (OBS-0/1)

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-00. Migration **011** (after 009 catalog + 010 profiles).
- **Direction:** Port OptimAI shape, Thesis names: `observability_events`, `observability_minute_buckets`, `observability_thresholds`, `observability_alert_events`, `observability_settings`. Products catalog: `auth`, `desk`, `analyse`, `portfolio`, `reports`, `refine`, `billing`, `worker`. **Never stored:** prompt body, `reports.sections`, ticker lots, JWT. RPCs: `observability_record_event`, admin list/upsert threshold, minute buckets. Page ping `POST /api/observability/page-view`. Worker and analysis-api record status + duration.
- **Writes:** those tables (service role / authenticated own family for capture).
- **Reads:** `/admin/observability` later.
- **Who:** capture = any session; read = `platform_admin`.
- **UI today:** no button.
- **Success:** Static SQL tests for table/RPC names. After a Maya `/desk` ping, `observability_events` has a row with `product_id = desk` and **no** `sections` key.

### P7-06 — Observability Overview + Watch limits

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-05
- **Direction:** `/admin/observability` Overview (calls, failed, by product, slow wait) + Watch limits form. Time filters: 15m / 1h / 24h / 7d / 30d. English labels, IST display, UTC store. Seeded watches: failed %, slow Analyse (ms), sign-in failures, worker jobs stuck queued/failed, no successful analyse in 24h after yesterday’s traffic. Colours from `observability_thresholds`. v1 is **colours on this screen only** — do not HTTP 429 the desk because a watch is red; do not send email in this chunk. Customer Feedback tab is **P7-10**, not this chunk.
- **Writes:** `observability_thresholds` via upsert RPC.
- **Reads:** `observability_minute_buckets`, `observability_thresholds`.
- **Who:** `platform_admin`.
- **UI today:** does not exist.
- **Success:** Admin changes Analyse slow-alert ms; refresh shows new number. Maya cannot open the page.

### P7-07 — Observability APIs + Latency

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-06
- **Direction:** Tabs APIs (route, count, fail, last) and Latency (wait distribution) like OptimAI OBS-4/5. Details column may show `THS-*` codes **after** an English reason.
- **Writes:** none.
- **Reads:** `observability_minute_buckets`, drill `observability_events` (7-day default).
- **Who:** `platform_admin`.
- **UI today:** does not exist.
- **Success:** A failed `thesis_accept_analysis` shows on APIs tab with English copy, not the prompt text.

### P7-08 — Who used which product

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-06
- **Direction:** Tab usage: one row per person + family + product in the period. Highlight: signed up but never analysed; plan exhausted still posting (should not happen if quota RPC works — red if it did).
- **Writes:** none.
- **Reads:** `observability_minute_buckets` + `observability_events`.
- **Who:** `platform_admin`.
- **UI today:** does not exist.
- **Success:** Maya’s desk pings appear as Maya + desk; admin login does not appear as a desk user.

### P7-10 — Customer Feedback (observability)

- **Status:** ✅ 2026-09-14
- **Depends on:** P7-06, P5-05
- **Direction:** `/admin/observability` tab **Customer Feedback** (after Who used which product). Table from `analysis_feedback` joined to `users.email`, `families.plan_id` / `plans.slug`, `reports_admin_meta` (ticker, model, cost — **not** `sections`). Columns: submitted at (IST, UTC store), email, plan, ticker, model, Helpful (Yes/No), five dimension scores or “—”, comment. Filters: date range (same 15m / 1h / 24h / 7d / 30d as Overview), helpful, ticker, model. Header counts: n responses, % Yes. Maya’s `/login` session cannot open this tab. Do not write comments into `observability_events`. No MCP tab.
- **Writes:** none (read-only).
- **Reads:** `analysis_feedback`, `users`, `plans`, `reports_admin_meta`.
- **Who:** `platform_admin` only. Desk JWT → `/admin/login`.
- **UI today:** does not exist. P7-06…P7-08 must keep existing tabs; this chunk **adds** one tab only.
- **Success:**
  1. After Maya submits Yes on a non-sample note, admin sees one row: Maya’s email, ticker, Helpful Yes, no lot qty, no `sections` in the network payload.
  2. Maya on `/admin/observability` redirects to `/admin/login`.
  3. Empty state when `analysis_feedback` has 0 rows: “No responses yet”, other observability tabs unchanged.

### P7-09 — Red watch email

- **Status:** ❌ skipped — 2026-09-13 — v1 observability is on-screen watches only; un-skip when you name an email provider
- **Depends on:** P7-06
- **Direction:** Cron `/api/cron/observability-alerts`. Recipients: every `platform_admin` + `observability_settings` extras. Cooldown per watch kind. Provider TBD (Resend in OptimAI).
- **Writes:** `observability_alert_events`.
- **Reads:** thresholds + buckets.
- **Who:** cron + `service_role`.
- **UI today:** no button.
- **Success:** Defined when you un-skip and name email. Do not start.

---

## Phase 8 — Family accounts and hardening

### P8-00 — Invite a family member

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-02
- **Direction:** Owner invites email → `family_members` (`member` or `viewer`). Viewer cannot call `thesis_accept_analysis`. **This is the Family account you asked not to rewrite reports for.**
- **Writes:** `family_members`.
- **Reads:** same family `reports` / `holdings`.
- **Who:** owner invites; member/viewer per role.
- **UI today:** does not exist.
- **Success:** Second user sees Maya’s MSFT report (`family_id` unchanged). Viewer Run analysis is forbidden. No new `reports.family_id`.

### P8-01 — RLS and prompt leak tests

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-02
- **Direction:** `tests/integration/` with two JWTs. Cross-family holdings 0 rows. Prompt body absent from analysis-api responses. Admin JWT cannot `thesis_accept_analysis`. Per-chunk three-pass tests (RLS UI vs API, meter kinds, display) started in `.cursor/rules/testing.mdc`; this chunk is still the two-JWT CI gate.
- **Writes:** none in product.
- **Reads:** integration DB.
- **Who:** CI.
- **UI today:** n/a.
- **Success:** `./tools/test/run_tests.sh --integration` fails if RLS is dropped; unit tests already cover SQL files. Two distinct desk JWTs: family A sees 0 rows of family B `holdings`.

### P8-02 — Weekly holdings email (Quick model, 3 names unless Professional +)

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-00, P4-02, P6-01, P1-04. Email **send** also needs a named provider in HANDOFF §3b (same blocker as P7-09). In-app card does not.
- **Direction:** Sunday digest for families that opted in on `/billing` (toggle **Weekly email**, default **off**). Not the marketing `/` waitlist (that stays a no-op until this chunk, then copy-only). Not a full Analyse: worker job in `apps/analysis-worker`, lab Batch **allowed** later. Model = active `model_catalog` row with `thesis_class = 'quick'` and `is_refine_gate = true` (009: `gpt56m`). If that row is missing or Frontier → job `failed`, **no** email, **no** `reports` insert. Prompt: [`docs/prompts/weekly-digest.md`](../prompts/weekly-digest.md) → `prompt_versions` role `weekly_digest`. One completion per `family_id` per ISO week (all N tickers in that one call).
  **Tickers:** from view `holdings` for that `family_id`. Cap = `plans.weekly_digest_ticker_limit` (seed: `trial` / `basic` / `professional` = **3**; `premium` Professional + and `ultra` = **15**). Rank by `qty * cost_per_share` converted with the same **display** FX as the header chip (P2-03); never write converted amounts. Fewer holdings → send fewer names. Copy on `/billing` Professional + card: more than 3 names requires slug `premium` or `ultra`. No recommended tickers the family does not hold (drop mock “new names worth a look”).
  **Email body per name:** (1) What changed this week — cited Step 0 facts only; if items 2–7 have no vendor, say so and still allow Yahoo week-over-week close from D40 when P4-01 exists. (2) Impact on **your** position — qty, average cost, % of book, last `reports.verdict` if any. (3) Next steps — Hold / Watch / “open `/analyse?ticker=` for a full note”. Not a broker; do not enqueue Analyse. Unsubscribe link sets opt-in false.
  **Enable confirm (D28 analog):** turning the toggle **on** names Quick model, N-cap for this plan, “does not use your monthly Analyse searches; we still record cost.” Off = no job. Quota at 100% does **not** block the digest. Login / `/desk` load does **not** run this job.
- **Writes:** migration (next unused number when this chunk starts): `families.weekly_digest_opt_in` (boolean, default false); `plans.weekly_digest_ticker_limit`; `usage_kind` value `weekly_digest`; table `weekly_digests` (`family_id`, `week_start`, `ticker_ids`, `body` jsonb, `model_id`, `prompt_version_id`, `cost_cents`, `sent_at`, unique `(family_id, week_start)`). Worker inserts `usage_events.kind = weekly_digest` (observability + `cost_cents`; **`thesis_assert_quota` ignores this kind**). Owner `users.email` only until P8-00.
- **Reads:** `holdings`, `plans`, `families`, last `reports` per ticker (verdict + date only), optional `eod_quotes` / `analysis_evidence`. `/desk` reads the latest `weekly_digests` row for the family. Admin metadata may see `sent_at` / cost, not `body`.
- **Who:** family owner toggles on `/billing`. Worker cron Sunday **07:00 Asia/Kolkata** until `investor_profiles.timezone` exists (P1-05). `service_role` writes digest + usage. No Analyse button is involved.
- **UI today:** `/` section `#weekly` is waitlist copy only (P1-01: client no-op, no table). No `/billing` toggle. No cron. No `weekly_digests` table.
- **Success:**
  1. Maya Professional, 5 lots, toggle off: Sunday job inserts **zero** `weekly_digests` and **zero** `usage_events` of kind `weekly_digest`.
  2. Toggle on without confirm insert: **zero** rows. Confirm on: `weekly_digest_opt_in = true`.
  3. Job with opt-in: one `weekly_digests` row, **3** tickers (largest cost basis), `model_id = gpt56m`, **no** new `reports`, `usage_events.kind = weekly_digest` count +1 and Maya’s Analyse meter on `/usage` unchanged (still 1/20 from seed search).
  4. Same week rerun: still one row (idempotent unique).
  5. Switch family to `premium`, next week: up to **15** names (Maya still has 5).
  6. Force Frontier catalog id on the job: `failed`, no email, no digest row.
  7. `/desk` shows that week’s card from `weekly_digests.body`. Email HTTP only after you name a provider; until then `sent_at` is null and the card still renders.

### P8-03 — Holdings re-check (opt-in, billed model calls)

- **Status:** ✅ 2026-09-14
- **Depends on:** P4-01, P4-02, P1-05, P6-00
- **Direction:** `/desk` shows last `analysis_evidence` age per ticker from `holdings`. Watch queries come from `investor_profiles` / `holding_watch_queries` (user-editable), **not** the MELI/BKNG strings in the May 2026 file. **Do not** enqueue LLM jobs on login or first desk load. Control: **Re-check** per ticker or **Re-check all**. Before send, a confirm names: N tickers, model from `model_catalog`, searches (or wallet USD) that will be consumed, remaining quota. Confirm calls the same accept path as Analyse (`thesis_accept_analysis` or a `thesis_accept_holding_watch` RPC that still inserts `usage_events.kind = search`). 100% quota → button disabled, same as Analyse. Market-data HTTP with **no** LLM is not a search; the moment the worker calls the adapter, a billed row must already exist.
- **Writes:** `analysis_requests`, `usage_events`, then `analysis_evidence` / `reports` as for a normal run.
- **Reads:** `holdings`, `usage_events`, `plans`.
- **Who:** family owner/member (`user_can_write_family`) after confirm. Worker runs the job.
- **UI today:** marketing claims auto re-check; **do not copy that auto-spend**. Desk has no button yet.
- **Success:**
  1. Maya opens `/desk` with 5 names: **zero** new `usage_events`, **zero** new `analysis_requests`.
  2. Re-check all without confirm does not insert rows.
  3. Confirm “5 names, Professional model, 5 searches” inserts 5 `usage_events.kind = search`; `/usage` meter matches.
  4. At 100% quota the confirm never reaches the provider.

---

## Phase 9 — Framework extras (not Maya’s book)

Structure from the May 2026 file. **Never** seed AMZN weights, named manager letters as required reading, or dollar amounts from that file. User content is this family’s `holdings` + `investor_profiles`.

### P9-00 — Crash letter

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-05, P2-01, P5-03 (PDF if they download)
- **Direction:** `/settings/crash-letter` (or Desk “Crash letter”). Template the owner edits: names, last cost × qty from `holdings`, written rules (do not abandon F1–F6 in a 30%+ decline). Save to `crash_letters` (new table, `family_id`, body, `pdf_key` optional). **Draft with model** is optional and uses P4-04/P8-03 billing: confirm model + cost, then `usage_events`. Desk banner if they open `/analyse` during a large drawdown: “Read your crash letter first” → this page. No live price required for v1 (use cost basis + last saved letter).
- **Writes:** `crash_letters` (migration named in this chunk, next free after 009/010).
- **Reads:** `holdings`, `crash_letters`.
- **Who:** family owner writes; family reads.
- **UI today:** does not exist.
- **Success:** Maya saves a letter that lists her 5 seed tickers from `holdings`, not AMZN 53%. Opening `/desk` does not call a model. “Draft with model” without confirm inserts nothing.

### P9-01 — Managers and 13F clone

- **Status:** ✅ 2026-09-14
- **Depends on:** P1-04, P3-00
- **Direction:** `/research/managers` (desk nav only if you add it here — **one** item: Managers). Owner picks a list (defaults empty; optional catalog of names from the framework as **suggestions**, not required). Store `manager_watches`. **Scan** (13F / letters) is a button: confirm model-or-vendor cost first. Clone rule in SQL/UI: 3+ watched managers overlapping on a ticker the family does not hold → Desk flag “F1+F2 trigger” with Analyse → `/analyse?ticker=`. 13F is labelled **idea generation only, 45 days stale, not for timing**. Do not auto-scan on login (same as P8-03).
- **Writes:** `manager_watches`, optional `manager_holdings_snapshots`; `usage_events` when a model is used.
- **Reads:** same; Desk reads overlap vs `holdings`.
- **Who:** family owner.
- **UI today:** does not exist. Adding this nav item is allowed **in this chunk only**.
- **Success:** Empty list shows no clone flags. After three watches share a ticker Maya does not own, Desk shows the flag. Scan without confirm inserts no `usage_events`. Login does not scan.

---

## Phase 10 — Production hosts (Vercel + FastAPI)

Local `.env` stays DEV. Prod secrets live in gitignored `.env.prod` (P0-04). Do not start these while **Build next** is a product chunk unless you point **Build next** here.

### P10-00 — Apply schema to prod Supabase

- **Status:** ✅ 2026-09-15
- **Depends on:** P0-01 … P0-04, P1-05 (010), P3-01 (011). **012** only if P4-01 cache table is already in git and you name that file.
- **Direction:** Default is read-only: `./tools/db/apply_prod.sh` (DEV `.env` vs PROD `.env.prod` — `schema_migrations`, public objects, `storage.buckets`, row counts). Writes only when you name **prod** + `CONFIRM_APPLY=1 ./tools/db/apply_prod.sh --apply`. That sources **`.env.prod`** (not `.env`) and applies **pending** git files (`001`–`018` today) to `https://ndgvglcrkbygovlszxze.supabase.co`. Create private bucket `report-pdfs`. **Do not** run `supabase/seed/001_maya_desk.sql` unless you name that seed. Auth on prod: Email+password ON; Google/Phone off until you say otherwise.
- **Writes:** `schema_migrations` 1–18 on prod; `report-pdfs` bucket. Dry-run writes nothing.
- **Reads:** HANDOFF §25 against prod (expect empty book, not Maya). Dry-run also reads DEV `schema_migrations` 1–18.
- **Who:** operator. No button.
- **UI today:** Prod Postgres has Thesis tables. `https://eqveste.com` `/login` still talks to whatever Vercel env is set until **P10-01**.
- **Success:** Dry-run lists pending files and refuses Maya seed. After `--apply`: on prod `select id from schema_migrations order by id` returns 1–18; `report-pdfs` exists; `select count(*) from holdings` is 0 unless you named the Maya seed.

### P10-01 — Vercel Production (Next.js)

- **Status:** 🟡 2026-09-15 — Production env + deploy on Vercel. `eqveste.com` DNS not pointing yet.
- **Depends on:** P0-04, P1-01, P10-00
- **Direction:** Vercel project **`prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4`**. Public site **`https://eqveste.com`** (also `https://www.eqveste.com` if you attach www). Host project: `https://v0.app/lakshman-projects/equity-investment-advisor-prod`. Root directory **`apps/web`**. From `.env.prod`, set **Production** env only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do **not** set `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_PASSWORD`, or lab LLM keys on Vercel. On prod Supabase Authentication → URL configuration: Site URL `https://eqveste.com`; redirect allowlist that origin. After env change, redeploy. Desk login uses prod Auth (`users` / `families` via `handle_new_auth_user` on prod). `/analyse` can queue on prod only after P10-00; the wait panel stays `queued` until P10-02 worker runs.
- **Writes:** Vercel Production env (host, not git).
- **Reads:** browser uses anon key → prod PostgREST. `/desk` reads view `holdings` and `usage_events` on **prod**.
- **Who:** project owner. You name **prod** this turn before `vercel env` / deploy.
- **UI today:** Production env is anon URL+key only. `https://eqveste.com` and `https://www.eqveste.com` return HTTPS 200 (Thesis Next.js). Prod Auth Site URL is `https://eqveste.com`; redirect allowlist includes eqveste.com, www, and the Vercel alias. Local **3100** still DEV.
- **Success:**
  1. Open **`https://eqveste.com`**: marketing `/` loads; `/login` talks to `ndgvglcrkbygovlszxze` (Network: `*.supabase.co` host is prod, not `cmksomahsfmsjufakryw`).
  2. Vercel env list has no service-role name.
  3. Local **3100** still uses DEV (`.env` unchanged).

### P10-02 — FastAPI analysis-api + worker host

- **Status:** ✅ 2026-10-04
- **Depends on:** P0-04, P4-00, P10-00, P10-01. **Host named (2026-09-15):** existing OptimAI DigitalOcean droplet `157.245.102.243` (`ssh optimai-vps`). Same box as ActivePieces, validation `:8090`, MCP `:3100`, Caddy on 80/443. Not Vercel. Do not create a second droplet.
- **Direction:** `infra/docker` compose (plus `docker-compose.droplet.yml`): `analysis-api` (container **8091**) and `analysis-worker` (long-running). `env_file: .env.prod` — **not** OptimAI’s `.env`. FastAPI CORS allowlist `THESIS_CORS_ORIGINS` = `https://eqveste.com` and `https://www.eqveste.com`. Public URL **`https://api.eqveste.com`** via existing Caddy (`Caddyfile.eqveste.snippet`); do not reuse `api.optimai.in`. Worker: native lab keys (D39), `thesis_consume_quota_for_provider`, Yahoo previous close, Playwright Chromium. Thesis Postgres is prod Supabase, not ActivePieces postgres. Next.js does not start these processes. If the desk calls the API, add `NEXT_PUBLIC_ANALYSIS_API_URL` on Vercel **only** when a browser route actually `fetch`es it (refine / PDF). Until then, wait panel keeps polling `analysis_requests` via the anon client. Droplet default size is `s-2vcpu-4gb`; resize if Chromium OOMs.
- **Writes:** `analysis_requests.status`, `analysis_evidence`, `reports`, `report-pdfs` objects — on **prod** Postgres/storage.
- **Reads:** same tables the worker already uses on DEV.
- **Who:** operator starts compose on the named host. No desk button.
- **UI today:** `thesis-analysis-api` / `thesis-analysis-worker` on `/opt/eqveste`. Caddy `api.eqveste.com` → container **8091**. `/analyse` **Submit** on eqveste.com still inserts `analysis_requests` (`queued`) via `thesis_accept_analysis`; the droplet worker then writes `analysis_evidence` / `reports`. No desk button starts those processes.
- **Success:**
  1. `GET https://api.eqveste.com/health` returns `{"status":"ok"}`.
  2. A prod-queued `analysis_requests` row leaves `queued` (at least to `gathering` / `failed`) without changing DEV rows.
  3. Host env has `SUPABASE_URL=https://ndgvglcrkbygovlszxze.supabase.co`. Vercel still has no service role.

---

## Phase 11 — Note layout and desk/admin fixes (named 2026-10-04)

One chunk at a time. Do not start N+1 while N is ⬜ or 🟡. Typeset Eqveste’s own LAYER 1 note (cover, KEY DATA, headings). Do not invent FY tables. Do not `innerHTML` the model (D30). **Build next** is **P6-03** (merchant unnamed). **P11-11** is done.

### P11-01 — Typeset note + PDF download

- **Status:** ✅ 2026-10-04
- **Depends on:** P5-02, P5-03, P4-03
- **Direction:** `/reports/[id]` and `/analyse/[id]` (when `analysis_requests.status = ready`) show **one** document: cover (ticker, verdict, date), KEY DATA from `reports` + `analysis_evidence` step 0 (close if present), body typeset from `reports.sections.plain_language` (escaped headings/paragraphs — never model HTML). Remove Beginner/Expert and empty section tabs from the main read. Refine stays below as an append (`refinements`). **Download PDF:** `downloadReportPdf` must `redirect` to the signed URL from `GET /reports/:id/pdf` on `https://api.eqveste.com` (desk JWT). Do not catch Next.js `redirect()`. Playwright `render_pdf_html` uses the same cover + KEY DATA + typeset body (not a Georgia `<pre>` dump).
- **Writes:** none on Postgres. Re-upload PDF only if the worker is redeployed and a job re-renders; existing `reports.pdf_key` objects stay until a new run.
- **Reads:** `reports.sections`, `reports.charts`, `analysis_evidence`, Storage `report-pdfs`.
- **Who:** owner/member (viewer can read + PDF).
- **UI today:** tabbed `<pre>` dump; Download click is swallowed by `try/catch` around `redirect()`.
- **Success:**
  1. Open a `ready` note: one scrolling document with THE BOTTOM LINE as a heading, not a `.txt` dump. No empty Moat/Tax tabs.
  2. **Download PDF** opens a signed `report-pdfs/...pdf` (not “analysis-api is not running on 8091”).
  3. PDF HTML contains heading tags for THE BOTTOM LINE and no `<script>` from sections.
- **Testing:** typeset unit tests (empty prose, script tags escaped, heading split). PDF HTML test. Pass 3: formatted display.

### P11-02 — Prompt list: archive old rows + plain labels

- **Status:** ✅ 2026-10-04
- **Depends on:** P11-01, P7-02
- **Direction:** `/admin/prompt`. “Currently used by Analyse” shows human copy, e.g. **Stock notes — in use since 4 Oct 2026** and **Follow-up check — in use since 14 Sep 2026** (map `advisor` / `refine_gate`). **Remove** on Previous / Not promoted rows: RPC archives or deletes only if `promoted_at` is null or `superseded_at` is set **and** the row is not the live Analyse/gate prompt. In-use row cannot be removed (append-only lock: never delete the promoted advisor body). Button exists; `platform_admin` only.
- **Writes:** `prompt_versions` archive/delete of superseded rows. Not `prompt_versions.body` of the live row.
- **Reads:** `prompt_versions_meta`.
- **Who:** `platform_admin` at `/admin/login`.
- **UI today:** Review + Download only.
- **Success:** In-use blurb has no `semver · advisor · promoted UTC` dump. Remove on an old row hides it from the list. Remove on the in-use row is refused.

### P11-03 — Admin chrome: operator language

- **Status:** ✅ 2026-10-04
- **Depends on:** P11-02
- **Direction:** Every `/admin/*` page: replace table/RPC jargon in kickers, ledes, notices, and errors with what the operator does and what the desk then shows. Keep `code` table names only where the operator must run SQL. Do not restyle desk.
- **Writes:** none.
- **Reads:** existing admin queries.
- **Who:** `platform_admin`.
- **UI today:** mix of `plans.allowed_model_ids`, UTC stamps, role slugs.
- **Success:** Prompt, Plans, Accounts, Observability, login: a non-engineer can say what the button did without reading a table name in the headline.

### P11-04 — Review Portfolio: edit and delete a name

- **Status:** ✅ 2026-10-04
- **Depends on:** P11-03, P2-02
- **Direction:** `/portfolio` grid: Edit (qty, cost per share, company) and Delete on a ticker. Writes `holding_lots` (update/delete lots for that ticker+exchange+currency). View `holdings` is what the grid and Desk read. Owner/member; viewer cannot. Does not call Analyse.
- **Writes:** `holding_lots`.
- **Reads:** view `holdings`.
- **Who:** owner/member.
- **UI today:** CSV + add position only; no edit/delete on the grid.
- **Success:** Change qty → grid and Desk match `holdings`. Delete ticker → row gone. Viewer sees no write buttons.

### P11-05 — Desk typeface Calibri

- **Status:** ✅ 2026-10-04
- **Depends on:** P11-04
- **Direction:** Desk + report + Analyse builder face is Calibri, with Carlito (web) then `sans-serif`. `apps/web/lib/desk/font.ts` (today Inter). Marketing `/` and `/login` stay as they are.
- **Writes:** none.
- **Reads:** none.
- **Who:** any desk session.
- **UI today:** Inter on the desk shell.
- **Success:** `/desk`, `/analyse`, `/reports/[id]`, `/portfolio` computed font-family includes Calibri or Carlito. Login/marketing unchanged.

### P11-06 — Analyse steps 3–5 spacing

- **Status:** ✅ 2026-10-04
- **Depends on:** P11-05
- **Direction:** `/analyse` Step 3 (position), Step 4 (risk/return), Step 5 (tax): labels above fields, taller controls, gap between quantity / cost / portfolio / tax pair so dropdowns are not cramped (screenshot 2026-10-04).
- **Writes:** none.
- **Reads:** builder state only.
- **Who:** owner/member.
- **UI today:** dense `bld__pos` / `pf__row` on those steps.
- **Success:** Step 3–5: each control has visible padding; dropdown text is not clipped into the label.

### P11-07 — Desk typeface IBM Plex Sans

- **Status:** ✅ 2026-10-05
- **Depends on:** P11-05
- **Direction:** User rejected Calibri/Carlito. Desk shell (nav tabs, `/desk`, `/analyse`, `/reports`, `/portfolio`, `/billing`, `/settings/*`, account menu) and `/admin/*` console use **IBM Plex Sans** via `apps/web/lib/desk/font.ts` (`next/font/google`, `--font-ibm-plex-sans`). Do not restyle layout. Marketing `/` and `/login` `/signup` `/reset` stay SF Pro / Helvetica.
- **Writes:** none.
- **Reads:** none.
- **Who:** any desk or admin session.
- **UI today:** IBM Plex Sans on `.desk` (nav, account menu, settings).
- **Success:** Computed `font-family` on `/desk`, `/analyse`, `/portfolio`, `/settings/profile`, `/reports` includes IBM Plex Sans. No Calibri/Carlito on those routes. `/login` and marketing `/` still Helvetica/SF Pro.

### P11-08 — Desk visual lock to App.dc.html

- **Status:** ✅ 2026-10-05
- **Depends on:** P11-07
- **Direction:** User screenshots of `docs/mock-ui/App.dc.html`. Copy font, spacing, hover on `/desk`, `/analyse`, `/reports`, `/contact` plus shared chrome. Font is `-apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, sans-serif`. Header: name + plan line + avatar + always-visible Sign out. Nav labels: Portfolio / Reports (Saved notes) / Managers. Home kicker YOUR DESK, four KPI labels from the mock, privacy lock banner, empty-book three steps. Analyse title “What do you want to decide?”; **Run analysis** still `POST` via `acceptAnalysis` → `thesis_accept_analysis`. Reports cards + week/month chips. Contact topic chips + Send message. No new RPC. Gain or loss on Desk is still not a live price (D40).
- **Writes:** none (contact still `submitContact` / Resend).
- **Reads:** `/desk` view `holdings` + `reports` + `usage_events`; `/analyse` builder state; `/reports` `reports` + `analysis_requests`; `/contact` session name/email.
- **Who:** desk owner/member (viewer read-only on Analyse submit).
- **UI today:** button exists on each of those four routes.
- **Success:** `/desk` `/analyse` `/reports` `/contact` on port **3100** match App.dc.html type, hover (`translateX(3px)` nav, `translateY(-4px)` cards, Analyse pill lift), and copy. `thesis_accept_analysis` is still the Analyse submit.

### P11-09 — Typeset note: hierarchy, KEY DATA tables, hide machine JSON

- **Status:** ✅ 2026-10-05 — `/reports/[id]` and ready `/analyse/[id]` hide MACHINE-READABLE JSON; KEY DATA / slice / scorecard from `sections.machine`; labeled `reports.charts` `type=bar` renders; `type=html` dropped. No prompt change.
- **Depends on:** P11-01, P5-04
- **Direction:** Display-only on `/reports/[id]` (`ReportReader` → `ReportDocument`) and on `/analyse/[id]` when `analysis_requests.status = ready` (`ReportNoteBody` → same document). Typeset in **our** React/CSS from `reports.sections` JSON. **Forbidden:** `dangerouslySetInnerHTML` of model HTML, executing `<script>`, or a new `sections.html` column (D30 / P5-04). Do not edit `prompt_versions.body`, `/admin/prompt` upload, or advisor prompt text. Files: `apps/web/components/features/report/ReportDocument.tsx`, `ReportNoteBody.tsx`, `ReportReader.tsx`, `ReportCharts.tsx`; `apps/web/lib/reports/typeset.ts`, `sections.ts`, `charts.ts`; `apps/web/app/(desk)/desk.css` (`.note-doc*` only); Python twin `packages/python/thesis_platform/typeset.py` + `apps/analysis-worker` `render_pdf_html` so Download PDF matches. Clicks: open a ready note on `/reports/[id]`; wait page `/analyse/[id]` when ready; **Download PDF** still `GET /reports/:id/pdf` signed URL. Do not restyle Desk, Analyse builder, or library cards. Do not rewrite `reports.verdict` or `reports.sections` (D4).
  **Must hide:** the **MACHINE-READABLE BLOCK** string and its JSON from `/reports/[id]`, `/analyse/[id]`, and PDF HTML. Desk never shows the dump. `/admin` already reads `reports_admin_meta` (ticker/name/verdict) — do not dump `reports.sections` there. Keep using parsed `sections.machine` internally.
  **v1 now (from existing JSON, no prompt change):** KEY DATA as an HTML **table**; **slice** / tranche ladder as a table if `sections.machine.tables` (or known keys) already has those rows; **ROIC / Framework 1 scorecard** as a table if those rows exist; **price chart** only from allowlisted `reports.charts` (`line|bar|table|waterfall`) or a bar of existing scalars (cost vs close, invested vs market value). Never invent FY rows or a price time series. Strip leftover markdown markers (`**`, `*`) from displayed text; do not treat them as HTML.
  **Must typeset:** section headings visually larger/bolder than body (heading face vs 16px/400 body). KEY DATA from `reports` (`ticker`, `verdict`, `created_at`, `conviction`) plus `sections.machine` fields already stored and `analysis_evidence` step 0 close (`step0_number = 1` excerpt) when used today.
  **Do not invent** FY tables, price series, or scorecards the JSON does not contain. Worker `complete.py` today inserts `reports.charts = '{}'::jsonb` — empty plus no numeric pair means no graph. Prompt/schema change so the model emits new table arrays is **out of this chunk**.
- **Writes:** none on Postgres note jsonb (D4). No new tables. **Download PDF** `GET /reports/:id/pdf` Playwright-upserts the Storage object at `reports.pdf_key` from current `reports.sections`. Worker `attach_pdf` still writes `pdf_key` on new Analyse. Never write converted FX into lots. Never store `prompt_versions.body` in HTML, PDF, SSE, or `error_text`.
- **Reads:** `reports` (`name`, `ticker`, `verdict`, `conviction`, `sections`, `charts`, `created_at`, `is_library_sample`, `pdf_key`) for `family_id` of the session; `analysis_evidence` (`step0_number`, `query`, `excerpt`) for that `request_id`; `refinements` listed below the note (unchanged). Screen is `/reports/[id]` (and wait `/analyse/[id]` when ready).
- **Who:** desk owner/member. Viewer (`member_role = viewer`) **SELECT**s via `user_can_read_family` and may Download PDF. Viewer cannot POST refine. Platform admin does not read `reports.sections` from `/admin/*` (metadata only). Sample rows (`is_library_sample`) use the same typeset; still no refine / no CSAT form.
- **UI today:** button exists — open the note, Download PDF, Rename (writers), Follow-up (writers, not samples). One typeset document from `reports.sections.plain_language` (P11-01): escaped headings/paragraphs when a line matches ALL-CAPS markers; **markdown is not stripped**; the **MACHINE-READABLE BLOCK JSON is shown** as body text because `plain_language` is the full model blob and `typesetProse` only labels the heading. KEY DATA is KPI chips (Name / Rating / Price / As of), not a table. Slice / ROIC scorecard exist only if the model wrote them as prose — no table renderer. `ReportCharts` allowlist exists; worker always stores empty `reports.charts`, so **no graphs** on current prod notes (e.g. LLY Hold `942b1abd-96d9-4bcd-8ebf-78f9fa1c4f47`). PDF Playwright HTML typesets the same blob, including the machine JSON.
- **Success:**
  1. Open `/reports/[id]` for a ready family note: page source / visible copy has **no** `MACHINE-READABLE BLOCK` and **no** trailing `{ "ticker": … }` dump. `prompt_versions.body` is absent (no 40-char slice).
  2. Headings (THE BOTTOM LINE and other typeset h2/h3) are larger and bolder than body paragraphs. `**HOLD.**` / `*Tranche 1*` do not show raw asterisks.
  3. KEY DATA is a table (ticker, verdict, price/close if present, as-of date). Slice / tranche ladder and ROIC / Framework 1 scorecard are tables **only if** those rows already exist on `sections.machine` (typically `tables[]`) or allowlisted `charts`; otherwise omit those tables — do not invent rows. Price figure is allowlisted `reports.charts` or a bar of existing cost/close or invested/market-value numbers only; empty `charts` `{}` plus no pair → no graph.
  4. Fixture `reports.charts` `type=bar` renders; `type=html` / `<script>` is dropped (P5-04). Empty `charts` `{}` renders no chart section.
  5. `/analyse/[id]` when `analysis_requests.status = ready` uses the same document. **Download PDF** HTML from `render_pdf_html` matches: no machine dump, heading tags, KEY DATA table, no model `<script>`. Another family’s JWT 404s. Library sample typesets the same way and still cannot refine.
- **Testing:** three passes (testing.mdc) before Status ✅.
  - Pass 1: other family 0 rows / 404; viewer reads, cannot refine; FastAPI PDF join still `user_can_read_family`; no prompt body in HTML/PDF/`error_text`.
  - Pass 2: empty `plain_language`, missing `machine`, `{}` charts, invalid chart type, sample `is_library_sample`, store/retrieve = same `reports.sections` keys the screen reads (no new write).
  - Pass 3: formatted money/dates; wait copy still tracks `analysis_requests.status`; machine JSON hidden; headings ≠ body weight.

### P11-10 — Desk pass: CSV, Home book, credits, plans, Change Plan, light chrome

- **Status:** ✅ 2026-10-05 — user-named this turn. Do not start P6-03.
- **Depends on:** P11-04, P11-08, P11-09, P6-01
- **Direction:** One pass, items in order. `/portfolio` CSV actually inserts `holding_lots` (fix the real upload bug) plus **Download CSV template** matching parser columns `ticker,company_name,cost_per_share,total_purchased`. `/desk` shows view `holdings` read-only (same book as Review Portfolio); remove Home Add stock / CSV; no Yahoo P&L on Desk load (D40). Notes widget: latest non-sample `reports` row (`created_at` desc, limit 1); **All Reports** → `/reports`. `/analyse` agent dropdown: hide `$`; Frontier **1.5 credits**, Quick **1 credit**. Ultra / Professional / Professional+ (`premium`) can select Quick and Frontier; Trial stays off Frontier. Mid-month Choose must match real checkout (`invoices` pending; `families.plan_id` unchanged until Admin Activate) — do not claim next-month if the schema cannot defer. Rename user-visible **Upgrade Plan** / **Upgrade plan** to **Change Plan**. Account menu liquid-glass hover. Desk background light / closer to white with readable ink (retune `.note-doc*` if the page lightens).
- **Writes:** `holding_lots` and `portfolio_import_rows` from `/portfolio` CSV/manual (owner/member). Billing **Choose** still inserts `invoices` (`status = pending`) only. Quota 1.5 needs `supabase/migrations/027_*.sql` — **do not apply** until the user names DEV + file + `CONFIRM_APPLY=1`.
- **Reads:** `/desk` and `/portfolio` grid: view `holdings`. `/analyse` picker: `model_catalog` + `plans.allowed_model_ids` / plan slug. Desk KPI: `usage_events` kinds `search` / `refine` / `refine_gate` via `meterEventCount` (same as `thesis_family_meter_count`). Notes widget: `reports` for session `family_id`.
- **Who:** owner/member write lots and Analyse; viewer reads `holdings` / `reports`, cannot upload CSV or `thesis_accept_analysis`.
- **UI today:** `/portfolio` File upload + **Download CSV template**; `/desk` read-only `holdings`; agent dropdown credits (no `$`); **Change Plan** → `/billing`; light desk paper.
- **Success:**
  1. Owner/member on `/portfolio` downloads the four-column template and uploads a CSV that inserts `holding_lots`; grid reads `holdings`. Viewer has no upload. Empty file / bad header shows an error, not a crash. FX helpers do not write converted amounts.
  2. `/desk` holdings list is the same `holdings` rows as `/portfolio`. No Add stock / CSV on Home. No Yahoo fetch on Desk load.
  3. Home notes widget shows one latest own `reports` row; All Reports opens `/reports`.
  4. Agent dropdown has no `$`. Credit copy is 1.5 / 1. Live 1.5 consumption only after 027 is applied; until then each Analyse search still inserts one `usage_events` row counted as 1.
  5. Ultra / Professional / Professional+ can submit Quick and Frontier. Trial cannot submit Frontier. No Gemini/Kimi. HTTP `model` remains `model_catalog.provider_model_id`.
  6. `/billing` message matches Choose → pending `invoices`; plan column does not change until Activate.
  7. User-visible Upgrade Plan / Upgrade plan buttons read **Change Plan**; `/billing` hrefs still work.
  8–9. Name menu is liquid glass; desk chrome is light with dark ink; `/reports/[id]` typeset stays readable; Download PDF unchanged.
- **Testing:** three passes (testing.mdc). `npm test` in `apps/web`; `./tools/test/run_tests.sh` if Python/quota SQL is added; `npm run build` in `apps/web`. Browser smoke on port **3100**: `/desk` `/portfolio` `/analyse` `/reports` `/billing`.

### P11-11 — Home: portfolio trend vs NASDAQ and S&P

- **Status:** ✅ 2026-10-05 — user named Home trend this turn (D40 display-only override). **027** applied on DEV. Do not start P6-03.
- **Depends on:** P11-10
- **Direction:** `/desk` widget: Daily / Weekly / Monthly / Yearly tabs. Portfolio series = current rows in view `holdings` (qty × Yahoo daily closes, display FX only). Compare to NASDAQ Composite (`^IXIC`) and S&P 500 (`^GSPC`). Fetch on the Next.js server (`lib/market/yahoo-chart.ts`), not the browser. No new paid vendor. Gain/loss KPI stays **—**. Book of record stays `/portfolio` → `holding_lots`; Home SELECT view `holdings` only. Empty book = empty chart / **—**. Unknown exchange skipped (no guess). In-progress session bar dropped. Frontier Analyse search = **1.5** credits after 027; Quick = **1**. Desk “Analyses this month” sums `usage_events.quantity` for kinds `search` / `refine` / `refine_gate` (same as `thesis_family_meter_count` / `thesis_assert_quota`). Ultra `plans.monthly_analysis_limit` = 80. Do not bill `prompt_extract_attempt` as search. `usage_events.quantity` is numeric 1 or 1.5 — not prompt text.
- **Writes:** none on `/desk` (no `holding_lots` / `holdings` / `eod_quotes` insert). Analyse **Run analysis** still RPC `thesis_accept_analysis`, which inserts `analysis_requests` (`queued`) and `usage_events` (`kind = search`, `quantity` 1 or 1.5).
- **Reads:** `/desk` SELECT view `holdings` for session `family_id`; `usage_events.kind` + `quantity` (retry without `quantity` if the column is missing; each meter-kind row then counts as 1); Yahoo chart v8 for lot symbols + `^IXIC` + `^GSPC`. `/portfolio` still writes lots.
- **Who:** owner/member/viewer with `user_can_read_family` see the family book and trend. Viewer cannot upload CSV or call `thesis_accept_analysis`.
- **UI today:** `/desk` trend card with period tabs; empty book **—**.
- **Success:**
  1. Logged-in `/desk` shows the trend widget. Empty `holdings` → **—** / add-on-Review-Portfolio copy; no invented P&L.
  2. With lots, server fetches Yahoo 1y daily closes; chart indexes portfolio vs NASDAQ vs S&P; % and dates formatted. Home does not INSERT/UPDATE `holding_lots`.
  3. Desk KPI and `/usage` meter match `sum(quantity)` of search/refine/refine_gate. Frontier search writes `quantity = 1.5` after 027. Extract/pdf not summed.
  4. CSV on `/portfolio`, one recent note + All Reports, Change Plan, light desk, Download PDF unchanged.
- **Testing:** three passes (testing.mdc). Pass 1: family_id isolation; viewer read-only; meter kinds + quantity. Pass 2: empty book; unknown exchange skipped; FX display does not write back. Pass 3: formatted % / dates; Gain/loss still **—**; no prompt body in quantity. `npm test` in `apps/web`; `./tools/test/run_tests.sh`; live quota if `.env` has DB password; `npm run build` in `apps/web`. Browser `/desk` on **3100** if already up.

---

## Out of scope until you add a chunk

- Brokerage / order routing / US options advice
- Live last-price on Desk without a named vendor (P4-01 / P1-04)
- Charging money without a named UPI/card provider (P6-03)
- Copying OptimAI GST / inventory / Profit Pulse / **MCP Connectors tabs**
- Using the May 2026 personal AMZN/MSFT book as seed
- Wrapping `Thesis.dc.html` as the app
- Auto LLM on login (forbidden by P8-03 / D28)
- Executing raw HTML from the model (rejected unless you override P5-04)

---

## Sign-off log

| Chunk | Date | Result |
|-------|------|--------|
| P0-00 | 2026-09-13 | ✅ repo + rules |
| P0-01 | 2026-09-13 | ✅ 001–008 on DEV |
| P0-02 | 2026-09-13 | ✅ Maya seed |
| P0-03 | 2026-09-13 | ✅ keys in `.env`; Email+password only |
| P0-04 | 2026-09-14 | ✅ `.env.prod.example`; gitignored `.env.prod` for prod keys |
| P4-00a | 2026-09-13 | ✅ 009 on DEV — OpenRouter slugs; Maya ids kept |
| P1-00 | 2026-09-13 | ✅ `apps/web` Next.js; `/` title Thesis; anon-only env |
| P1-01 | 2026-09-13 | ✅ `/` marketing home from `Home.dc.html`; CTAs `/login` `/signup`; waitlist no-op; port **3100** |
| P1-02 | 2026-09-13 | ✅ `/login` `/signup` `/reset`; Maya lands `/desk`; Sign out → `/login` |
| P1-03 | 2026-09-13 | ✅ six desk nav items; `/admin` → `/admin/login`; no Admin on desk |
| P1-03b | 2026-09-13 | ✅ header Analyse: held ticker → `/analyse?ticker=`; else `/portfolio?add=` |
| P1-04 | 2026-09-13 | ✅ Desk: 5 positions, 1 search this cycle, `MSFT — accumulate on weakness` |
| P2-00 | 2026-09-13 | ✅ `/portfolio` CSV → `portfolio_import_rows` + `holding_lots`; append default |
| P2-01 | 2026-09-13 | ✅ holdings grid from view `holdings`; P&L/Last **—** |
| P2-02 | 2026-09-13 | ✅ Add position; `?add=` prefills ticker |
| P2-03 | 2026-09-13 | ✅ display FX on `portfolios`; lots keep native cost |
| P1-05 | 2026-09-13 | ✅ `/settings/profile`; **010** applied on DEV |
| P3-00 | 2026-09-13 | ✅ `/analyse` builder; Continue does not call RPC |
| P3-01 | 2026-09-13 | ✅ `thesis_accept_analysis` + **011** `THS-HOLDING-001` |
| P3-02 | 2026-09-13 | ✅ Continue → clarify → Run analysis |
| P3-03 | 2026-09-13 | ✅ `/analyse/[id]` queued wait; `/reports` list-only |
| P7-09 | 2026-09-13 | ❌ skipped — on-screen watches only; no email until a provider is named |
| P4-00 | 2026-09-14 | ✅ worker claim loop; 012 on DEV |
| P4-01 | 2026-09-14 | ✅ Yahoo close on gather; desk does not call Yahoo |
| P4-02 | 2026-09-14 | ✅ OpenRouter complete → reports |
| P4-03 | 2026-09-14 | ✅ Playwright PDF + signed GET |
| P4-04 | 2026-09-14 | ✅ POST /reports/:id/refine; pack loads holdings |
| P4-05 | 2026-09-14 | ✅ POST /reports/:id/refine-gate |
| P5-00 | 2026-09-14 | ✅ /reports table from reports |
| P5-01 | 2026-09-14 | ✅ report_rename |
| P5-02 | 2026-09-14 | ✅ /reports/[id] reader + Expert toggle |
| P5-04 | 2026-09-14 | ✅ allowlisted charts; html dropped |
| P5-03 | 2026-09-14 | ✅ PDF button → analysis-api signed URL |
| P5-05 | 2026-09-14 | ✅ 013 analysis_feedback + survey |
| P6-00 | 2026-09-14 | ✅ /usage + shell meter = thesis_family_meter_count |
| P6-01 | 2026-09-14 | ✅ /billing five plans; Professional + = premium |
| P6-02 | 2026-09-14 | ✅ wallet card; top-up does not decrement |
| P7-00 | 2026-09-14 | ✅ /admin/login → /admin/accounts; Maya rejected |
| P7-01 | 2026-09-14 | ✅ /admin/plans |
| P7-02 | 2026-09-14 | ✅ /admin/prompt; self-approve disabled |
| P7-03 | 2026-09-14 | ✅ View as preview; impersonation_open/close |
| P7-04 | 2026-09-14 | ✅ support_access_grants on /portfolio |
| P7-05 | 2026-09-14 | ✅ 014 observability + page-view ping |
| P7-06 | 2026-09-14 | ✅ /admin/observability Overview + watches |
| P7-07 | 2026-09-14 | ✅ APIs + Latency tabs |
| P7-08 | 2026-09-14 | ✅ Who used which product tab |
| P7-10 | 2026-09-14 | ✅ Customer Feedback tab |
| P8-00 | 2026-09-14 | ✅ /settings/family invite RPC |
| P8-01 | 2026-09-14 | ✅ unit RLS/meter lock; live two-JWT still skips without DB |
| P8-02 | 2026-09-14 | ✅ 016 weekly_digests; no email send |
| P8-03 | 2026-09-14 | ✅ Desk re-check confirm → thesis_accept_analysis |
| P9-00 | 2026-09-14 | ✅ /settings/crash-letter |
| P9-01 | 2026-09-14 | ✅ /research/managers nav item |
| P10-00 | 2026-09-15 | ✅ 002–018 on prod (`001` already present). `schema_migrations` 1–18. `holdings` = 0. `report-pdfs` bucket. No Maya seed. |
| P10-01 | 2026-09-15 | 🟡 Vercel Production env (anon URL+key only) + deploy READY. `eqveste.com` HTTPS 200. |
| 019 | 2026-09-15 | ✅ native labs catalog on DEV and PROD; Gemini/Kimi `is_active = false` |
| P10-01 | 2026-09-15 | 🟡 Vercel Production env (anon URL+key only) + deploy READY. `eqveste.com` 404 until Porkbun A → `76.76.21.21`. |
| P10-02 | 2026-10-04 | ✅ droplet compose `/opt/eqveste`; `GET https://api.eqveste.com/health` `{"status":"ok"}`. Prod `analysis_requests` META `3707dcc2` `queued` → `ready` + `reports` `8224385e`. DEV BRK.B `b2c3880a` stayed `queued`. Vercel Production env: anon URL+key, Resend, `ANALYSIS_API_URL` — no service role. |
| P11-01 | 2026-10-04 | ✅ typeset note + Download PDF on eqveste.com (`6399d3e`). User confirmed Download PDF. |
| P11-02 | 2026-10-04 | ✅ `/admin/prompt` plain in-use labels + Remove (`721a01b`, 026 on DEV and PROD). User confirmed Remove on prod. |
| P11-03 | 2026-10-04 | ✅ `/admin/*` operator language on eqveste.com (`c127448`). User confirmed. |
| P11-04 | 2026-10-04 | ✅ `/portfolio` Edit/Delete writes `holding_lots`; grid and Desk read view `holdings`. Viewer has no write buttons. User asked commit + **dev** + **prod**. |
| P11-05 | 2026-10-04 | ✅ Desk/report/Analyse face is Calibri, Carlito (web), sans-serif. Marketing `/` and `/login` unchanged. User asked **dev** + **prod**. |
| P11-06 | 2026-10-04 | ✅ `/analyse` steps 3–5: labels above fields, 46px+ controls, 28px gap. User asked remaining phases **dev** + **prod**. |
| P1-06 | 2026-10-04 | ✅ `/desk` flags from view `holdings` cost×qty vs `investor_profiles.concentration_cap_pct` and cash min. No max-positions banner. |
| P11-07 | 2026-10-05 | ✅ IBM Plex Sans on desk tabs, account menu, `/settings/profile`, `/analyse`, `/portfolio`. No Calibri/Carlito. `/login` and marketing `/` stay Helvetica/SF Pro. |
| P11-08 | 2026-10-05 | ✅ Desk chrome + `/desk` `/analyse` `/reports` `/contact` match App.dc.html (SF Pro stack, stroke-only e, no Earth). User named **dev** + **prod**. SHA `217f7cb` on GitHub `dev`; Vercel Production aliased to eqveste.com. |
| P11-09 | 2026-10-05 | ✅ `/reports/[id]` SELECT `reports` for session `family_id`; machine JSON hidden; KEY DATA / slice / scorecard tables from `sections.machine`. No prompt change. User asked commit + **dev** + **prod**. |
| P11-09 PDF | 2026-10-05 | ✅ Download PDF on `/reports/[id]` calls `GET /reports/:id/pdf`; analysis-api Playwright re-renders from current `reports.sections` and upserts Storage `report-pdfs` at `pdf_key`. Existing ready notes (stale objects) match the screen without Analyse again. D4: note jsonb unchanged. No prompt change. |
| P11-10 | 2026-10-05 | ✅ `/portfolio` CSV File + template; `/desk` read-only `holdings` (no Yahoo); notes widget + **Change Plan**; agent 1.5/1 credits copy; light desk. **027** in git, not applied. No commit/push. |
| P11-11 | 2026-10-05 | ✅ `/desk` portfolio vs NASDAQ/S&P (Yahoo chart display-only). **027** applied on DEV `cmksomahsfmsjufakryw` (not prod). Meter sums `usage_events.quantity`; prod SELECT retries without that column (1 credit per search/refine/refine_gate row). |


When you skip or split a chunk, add a row and a one-line reason. When you insert a chunk, give it an id (`P1-00a` or next free) and point **Build next** at it.
