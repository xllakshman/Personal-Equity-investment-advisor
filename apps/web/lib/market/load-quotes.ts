import type { QuotePoint } from "./book-rows";
import { fetchYahooLastClose } from "./yahoo-chart";
import { yahooSymbol } from "./yahoo-symbol";

/**
 * Previous regular-session close per ticker for display P&L %.
 * Next.js server only. Display quotes; never a lots write.
 */
export async function loadHoldingQuotes(
  holdings: readonly { ticker: string; exchange: string }[],
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<Record<string, QuotePoint | null>> {
  const quotes: Record<string, QuotePoint | null> = {};
  const unique = new Map<string, { ticker: string; exchange: string }>();
  for (const h of holdings) {
    const ticker = String(h.ticker ?? "")
      .trim()
      .toUpperCase();
    if (!ticker || unique.has(ticker)) continue;
    unique.set(ticker, { ticker, exchange: String(h.exchange ?? "") });
  }
  await Promise.all(
    [...unique.values()].map(async ({ ticker, exchange }) => {
      const symbol = yahooSymbol(ticker, exchange);
      if (!symbol) {
        quotes[ticker] = null;
        return;
      }
      quotes[ticker] = await fetchYahooLastClose(symbol, fetchImpl, now);
    }),
  );
  return quotes;
}
