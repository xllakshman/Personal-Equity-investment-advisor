# Proposed schema (not applied)

Draft for `HANDOFF.md` §8. No file in `supabase/migrations/` yet. Column types freeze after §3b.

Amounts: `numeric(20,6)` + `native_currency char(3)`. FX conversion is display-only.

Primary keys: `uuid` default `gen_random_uuid()`. Timestamps: `timestamptz` not null default `now()`.

## Enums (001)

| Enum | Values (from mock) |
|------|---------------------|
| `tax_residency` | `us`, `india`, `uae`, `nri` |
| `app_role` | `desk_owner`, `platform_admin` |
| `request_status` | `queued`, `gathering`, `drafting`, `checking`, `rendering`, `ready`, `failed`, `rejected` |
| `usage_kind` | `search`, `refine`, `pdf`, `prompt_extract_attempt` |
| `analysis_intent` | TBD from builder (open question 16) |
| `risk_band` / `cagr_band` | TBD — server 422 matrix in domain code, bands stored as text/enum |

## Tables

### `users` (or `profiles` — §3b)

Mirrors `auth.users.id`.

- `id uuid pk references auth.users(id)`
- `email citext unique not null`
- `name text not null`
- `phone_cc text`, `phone text`
- `tax_residency tax_residency not null`
- `tax_slab text`
- `role app_role not null default 'desk_owner'`
- `plan_id uuid references plans(id)`
- `wallet_cents` may live on `wallets` instead (prefer separate table)

### `plans`

- `id`, `slug`, `name`, `price_cents`, `currency`, `interval`, `monthly_analysis_limit`, `allowed_model_ids text[]`, `who_copy`, `why_copy`, `is_active`

### `plan_notice_thresholds`

- `plan_id`, `pct int` (60/80/90/100), `message`

### `model_catalog`

- `id text pk`, `label`, `provider`, `provider_model_id` (lab native), `openrouter_model_id`, `openrouter_only`, `vendor_class`, `thesis_class` (`frontier`|`quick`), `is_refine_gate`, `cost_cents_per_run`, `min_plan_slug`, `is_active`
- Worker (D39) sends `provider_model_id` to the lab named in `provider` (OpenAI / Anthropic / xAI / DeepSeek). See [`MODEL-CATALOG.md`](MODEL-CATALOG.md). `openrouter_model_id` / `openrouter_only` remain from 009 unused.

### `wallets`

- `user_id pk`, `balance_cents int not null default 0`

### `wallet_topups` / `invoices`

- `user_id`, `amount_cents`, `currency`, `provider` (`upi` / `card`), `provider_ref`, `status`

### `portfolios`

- `user_id`, `display_currency char(3)`, `fx_usd_inr_override numeric` (display only)

### `holdings`

- `user_id`, `portfolio_id`, `ticker`, `exchange`, `company_name`, `cost_per_share numeric`, `qty numeric`, `native_currency char(3)`
- unique `(user_id, ticker, exchange)` unless we allow lots — **open**: lots vs one row per ticker

### `portfolio_import_rows`

- staging for CSV parse: `accepted bool`, `reject_reason`, raw columns

### `analysis_requests`

- mock columns plus `status`, `error_text`, `accepted_at`, `provider_started_at` (quota double-check)

### `analysis_evidence`

- `request_id`, `step0_number int`, `query`, `source_url`, `excerpt`, `retrieved_at`  
  Step 0 citations; never includes prompt body

### `reports`

- mock columns; `prompt_version_id` not raw text; `sections jsonb`, `charts jsonb`
- **no update** on `verdict` / `sections` after insert (revoke update or trigger)

### `refinements`

- mock columns; `was_refused bool`, `refusal_reason`

### `usage_events`

- mock columns; insert via service role only

### `prompt_versions`

- `id`, `semver`, `body text` (no authenticated select), `promoted_at`, `promoted_by`, `superseded_at`

### `prompt_version_approvals`

- maker/checker: `prompt_version_id`, `submitted_by`, `approved_by`, `diff`

### `audit_log`

- `actor_id`, `target_user_id`, `action`, `metadata jsonb`, `created_at`  
  impersonation start/end required

### `support_access_grants`

- `user_id`, `admin_id`, `expires_at`, `scope` (`holdings_read`)

## RLS sketch

Matches mock Isolation model. `FORCE ROW LEVEL SECURITY` on all above except possibly `plans` (public read of active plans) and `model_catalog`.

## Storage

Bucket `report-pdfs` private. Object key = `reports.pdf_key`. Signed GET only for owner.

## RPCs (proposed)

| RPC | Who | Does |
|-----|-----|------|
| `analysis_accept_request(...)` | authenticated | insert request if quota ok; 422 conflict |
| `analysis_consume_quota(...)` | service_role | second check before provider |
| `report_rename(id, name)` | owner | updates name + storage filename |
| `impersonation_open/close` | platform_admin | audit rows; no write grants on holdings |
