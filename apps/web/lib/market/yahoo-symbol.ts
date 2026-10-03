const US = new Set([
  "NASDAQ",
  "NYSE",
  "AMEX",
  "ARCA",
  "BATS",
  "US",
  "NYSEARCA",
  "NYSEAMERICAN",
]);
const NSE = new Set(["NSE", "NS", "NATIONAL STOCK EXCHANGE"]);
const BSE = new Set(["BSE", "BO", "BOMBAY", "BOMBAY STOCK EXCHANGE"]);

/** Same map as packages/python/thesis_platform/yahoo.py (D40). */
export function yahooSymbol(ticker: string, exchange: string | null | undefined): string | null {
  const t = (ticker || "").trim().toUpperCase();
  if (!t) return null;
  const ex = (exchange || "").trim().toUpperCase();
  if (!ex || US.has(ex)) return t.replaceAll(".", "-");
  if (NSE.has(ex)) return `${t.replaceAll(".", "-")}.NS`;
  if (BSE.has(ex)) return `${t.replaceAll(".", "-")}.BO`;
  return null;
}

export type PreviousClose = {
  yahooSymbol: string;
  close: number;
  currency: string;
};

export function parsePreviousClose(
  payload: unknown,
  symbol: string,
): PreviousClose | null {
  if (!payload || typeof payload !== "object") return null;
  const chart = (payload as { chart?: unknown }).chart;
  if (!chart || typeof chart !== "object") return null;
  const result = (chart as { result?: unknown }).result;
  if (!Array.isArray(result) || result.length === 0) return null;
  const row = result[0];
  if (!row || typeof row !== "object") return null;
  const meta = (row as { meta?: { currency?: string } }).meta;
  const currency = String(meta?.currency || "USD")
    .slice(0, 3)
    .toUpperCase() || "USD";
  const indicators = (row as { indicators?: { quote?: { close?: unknown[] }[] } }).indicators;
  const closes = indicators?.quote?.[0]?.close;
  if (!Array.isArray(closes)) return null;
  let last: number | null = null;
  for (const raw of closes) {
    if (raw == null) continue;
    const price = Number(raw);
    if (!Number.isFinite(price)) continue;
    last = price;
  }
  if (last == null) return null;
  return { yahooSymbol: symbol, close: last, currency };
}
