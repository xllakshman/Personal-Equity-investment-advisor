# Market data (P4-01) — previous close only

**Locked 2026-09-13 (D40).** Step 0 Analyse price is **previous regular-session close** from Yahoo Finance chart v8 (no key). One HTTP call per ticker per calendar day when the worker is gathering a billed analysis / confirmed re-check. Never estimate. Never write quotes or converted FX into `holding_lots` / view `holdings`.

**P11-11 display exception (named 2026-10-05):** `/desk` server load may GET the same Yahoo chart v8 (`range=1y&interval=1d`) for the family’s current rows in view `holdings` plus NASDAQ Composite (`^IXIC`) and S&P 500 (`^GSPC`). That is display-only. Empty book → no fetch; the widget shows **—**. Unknown exchange → skip that lot (do not guess). In-progress session bar is dropped, same as Step 0.

**P11-12 display (named 2026-10-05):** `/desk` and `/portfolio` may GET Yahoo chart v8 (`range=5d&interval=1d`) for previous close to show **unrealized P&L %** (display market value − display cost) / cost. Same D40 rule: never write the close into `holding_lots` / `holdings` / `eod_quotes`. Failed quote or empty book → **—**.

## What we store

**Previous regular-session close** (last completed daily bar), not last tick, not pre/post print. Worker may cache in `eod_quotes`. Home trend does **not** insert `eod_quotes` or `holding_lots`.

Worker HTTP (no API key):

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=5d&interval=1d
```

Home trend HTTP (no API key; Next.js server, not the browser):

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=1y&interval=1d
```

Read the last **finished** daily candle `close` (and `meta.currency`). If the last bar is the in-progress session, use the prior bar. If JSON is empty, HTTP ≠ 200, or close is missing → Analyse job `failed` with `error_text`; Home trend shows **—**. **Do not estimate**.

## Yahoo symbol map

| Our lot | Yahoo `yahoo_symbol` |
|---------|----------------------|
| US `MSFT` | `MSFT` |
| US `BRK.B` | `BRK-B` |
| NSE `HDFCBANK` | `HDFCBANK.NS` |
| BSE | `{TICKER}.BO` |

Unknown exchange → fail the job, do not guess.

## Cache

Key: `yahoo_symbol` + UTC date (or exchange session date when we have it). Reuse for later jobs the same day. Never write converted INR into `holding_lots`.

## Not this vendor

Step 0 items 2–7 (news, earnings, bear, competitor, sector) are **not** Yahoo chart. Missing those still fails a comprehensive run — do not invent them from the close.

## Why not Finnhub / Alpha Vantage / Fin-node

| Source | Why not v1 |
|--------|------------|
| Finnhub free | 60/min and **personal-use** licence; US-heavy; needs a key |
| Alpha Vantage free | 25/day — too tight even with cache |
| Fin-node | ~30 tickers only |
| Stooq CSV | Fine backup; Yahoo covers NSE `.NS` more reliably for this book |

If Yahoo 429s or the endpoint disappears, fail the job. Do not silently switch to another close without a ROADMAP edit.
