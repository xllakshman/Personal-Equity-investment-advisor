# Market data — Yahoo chart v8 + SEC EDGAR (P11-13)

**Locked 2026-09-13 (D40), extended 2026-10-05 (P11-13).** Analyse Step 0 item 1 is **previous regular-session close** plus 52-week **closing** high from Yahoo Finance chart v8 (no key). Never estimate. Never write quotes or converted FX into `holding_lots` / view `holdings`.

**Do not scrape stockanalysis.com HTML.** Do not add a crawler or unofficial dump. Their own backend spec required commercially licensed sources; scraping a third-party site is not that. If a commercial Stock Analysis API is named later (`https://stockanalysis.com/api/`), wait for a key and a ROADMAP chunk — do not enable it here.

## Worker Analyse (P11-13)

`apps/analysis-worker` `gather_step0`:

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=1y&interval=1d
```

Parse daily closes. Previous close = last **finished** daily candle. 52-week closing high = **max of those daily closes** (not `meta.fiftyTwoWeekHigh`). Missing close → `analysis_requests.status = failed`. Cache today’s close in `eod_quotes` (UTC date). Insert `analysis_evidence.step0_number = 1` (JSON excerpt: close, currency, high, % below high, monthly closes). Never INSERT/UPDATE `holding_lots`.

**Item 2 (US-listed only):** GET `https://www.sec.gov/files/company_tickers.json` then `https://data.sec.gov/submissions/CIK{cik}.json` with `MARKET_DATA_USER_AGENT`, ≤10 req/s. Store 8-K / 10-Q / 10-K **headlines** (title, url, filed date, short description) on `analysis_evidence.step0_number = 2`. Never store full filing HTML. HTTP miss or no matching forms → no row; pack `step0_coverage["2"] = NOT_COVERED`; job can still `ready`. NSE/BSE (`.NS` / `.BO`) skip EDGAR entirely.

Items 3–7 unnamed: omitted / `NOT_COVERED`. Comprehensive no longer fails for those. Item 1 is still required.

SEC fair-access wants a User-Agent with a company name and contact email. Override `MARKET_DATA_USER_AGENT` in `.env` / `.env.prod`. The code default has no email; a 403 becomes NOT_COVERED, not a failed job.

## Desk display (not the worker)

**P11-11:** `/desk` server load may GET the same Yahoo chart v8 (`range=1y&interval=1d`) for the family’s current rows in view `holdings` plus NASDAQ Composite (`^IXIC`) and S&P 500 (`^GSPC`). Display-only. Empty book → no fetch; the widget shows **—**. Unknown exchange → skip that lot.

**P11-12:** `/desk` and `/portfolio` may GET Yahoo chart v8 (`range=5d&interval=1d`) for previous close to show **unrealized P&L %**. Same D40 rule: never write the close into lots. Failed quote or empty book → **—**. Home/Portfolio do **not** insert `eod_quotes`.

## What we store

**Previous regular-session close** (last completed daily bar), not last tick, not pre/post print. Worker may cache in `eod_quotes`. 52w high and monthly closes live on `analysis_evidence` excerpt JSON for that request, not on lots.

Read the last **finished** daily candle `close` (and `meta.currency`). If the last bar is the in-progress session, use the prior bar. If JSON is empty, HTTP ≠ 200, or close is missing → Analyse job `failed` with `error_text`; Home trend / P&L % shows **—**. **Do not estimate**.

## Yahoo symbol map

| Our lot | Yahoo `yahoo_symbol` |
|---------|----------------------|
| US `MSFT` | `MSFT` |
| US `BRK.B` | `BRK-B` |
| NSE `HDFCBANK` | `HDFCBANK.NS` |
| BSE | `{TICKER}.BO` |

Unknown exchange → fail the job, do not guess.

## Cache

Key: `yahoo_symbol` + UTC date. Worker reuses `eod_quotes` for later jobs the same day **only as a fallback** if the 1y chart HTTP fails; a cache-only pack does not invent a 52w high from a single print if the live chart succeeded. Never write converted INR into `holding_lots`.

## Derived bands (code, not XBRL)

From the Yahoo pack + T1 cost on the book (view `holdings` / request cost): % below 52w high; T2 10–15% below high; T3 20–25%; T4 35–40%; U1/U2 from T1 when cost exists. Written into the **user** variable pack (`derived`, `step0_coverage`). Not `prompt_versions.body`. No 10y ROIC / fundamentals in this chunk.

## Why not Finnhub / Alpha Vantage / stockanalysis.com

| Source | Why not v1 |
|--------|------------|
| stockanalysis.com HTML | Scraping. Not a licensed feed. Would break Yahoo/EDGAR work and likely ToS. |
| Stock Analysis commercial API | Documented at `https://stockanalysis.com/api/`. Not enabled — no key, no vendor confirmation. |
| Google News | Not this chunk. Item 2 is SEC EDGAR. |
| Finnhub free | 60/min and **personal-use** licence; US-heavy; needs a key |
| Alpha Vantage free | 25/day — too tight even with cache |
| Fin-node | ~30 tickers only |
| Stooq CSV | Fine backup; Yahoo covers NSE `.NS` more reliably for this book |

If Yahoo 429s or the endpoint disappears, fail the job. Do not silently switch to another close without a ROADMAP edit.
