export type TickerHit = {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
};

function stripYahooSuffix(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".NS") || s.endsWith(".BO")) return s.slice(0, -3);
  return s.replaceAll("-", ".");
}

export function parseTickerSearch(payload: unknown): TickerHit[] {
  if (!payload || typeof payload !== "object") return [];
  const quotes = (payload as { quotes?: unknown }).quotes;
  if (!Array.isArray(quotes)) return [];
  const out: TickerHit[] = [];
  const seen = new Set<string>();
  for (const raw of quotes) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as {
      quoteType?: string;
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchDisp?: string;
      exchange?: string;
    };
    const type = String(row.quoteType ?? "").toUpperCase();
    if (type && type !== "EQUITY" && type !== "ETF") continue;
    const symbol = String(row.symbol ?? "").trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      symbol,
      ticker: stripYahooSuffix(symbol),
      name: String(row.shortname || row.longname || symbol),
      exchange: String(row.exchDisp || row.exchange || ""),
    });
    if (out.length >= 8) break;
  }
  return out;
}
