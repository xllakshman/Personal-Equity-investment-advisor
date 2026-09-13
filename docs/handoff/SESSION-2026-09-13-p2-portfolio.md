# Session 2026-09-13 — Phase 2 portfolio

**Chunks:** P2-00 ✅ · P2-01 ✅ · P2-02 ✅ · P2-03 ✅  
**URL:** **http://127.0.0.1:3100/portfolio**  
**Who:** family owner/member (`user_can_write_family` / `user_can_read_family`).

## Click paths

- `/portfolio` (desk session required). Unauthenticated GET is 307 to `/login`.
- **Upload CSV** parses in the browser (`ticker, company_name, cost_per_share, total_purchased`). **Save to workspace** is a server action: inserts `portfolio_import_rows` then `holding_lots` with `source = csv` and `qty = total_purchased / cost_per_share`. Currency override is Auto / USD / INR (NSE/BSE → INR unless overridden). Replace-existing is an **opt-in checkbox**; default is **append**. Blank ticker rows stay `accepted = false` and are listed; no lot for them.
- **Add position** inserts one `holding_lots` row (`source = manual`). `/portfolio?add=ZZZZ` from header Analyse prefills the ticker. After save, ticker links on the grid go to `/analyse?ticker=`.
- Grid **reads view `holdings`**. Last / live Value / P&L show **—**. Weight is cost×qty (converted only for display). Two lots of the same ticker/exchange/currency collapse with `lot_count`.
- **Display currency** on this page and the header chip **UPDATE** `portfolios.display_currency` (and optional `fx_usd_inr_override`). Conversion is renderer-only. It does **not** `UPDATE holding_lots.cost_per_share`.

Desk `/desk` still counts rows in view `holdings` for `family_id` of `auth.uid()`. CSV/manual writes are the `/portfolio` buttons above; there is no Desk button that inserts lots.

## Not built

- Investor profile (P1-05, needs named migration **010**).
- Request builder enqueue (P3-00).
- Last price / P&L on the grid (no vendor on this chunk).

## Verification this session

- `apps/web` unit tests including `lib/portfolio/*.test.ts` (38 pass).
- `npm run build`.
- `./tools/test/run_tests.sh` and `--integration` (web `/portfolio` unauthenticated 307).
- Authenticated Maya click-path (CSV on a **new** family, GOOG add, USD↔INR SQL check) was **not** run: browser password fill was blocked. Seed lots remain: MSFT 28 @ 402.5, TSM 60 @ 168, UNH 14 @ 512, HDFCBANK 120 @ 18.4, BRK.B 9 @ 438 (all USD).

## Next

[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) **P1-05**.
