# Market data (P4-01) — previous close only

**Locked 2026-09-13 (D40).** Desk `/desk` never fetches this. One HTTP call per ticker per calendar day, only when the worker is gathering a billed analysis / confirmed re-check.

## What we store

**Previous regular-session close** (last completed daily bar), not last tick, not pre/post print.

Worker HTTP (no API key):

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=5d&interval=1d
```

Read the last **finished** daily candle `close` (and `meta.currency`). If the last bar is the in-progress session, use the prior bar. If JSON is empty, HTTP ≠ 200, or close is missing → job `failed` with `error_text`; **do not estimate**.

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
