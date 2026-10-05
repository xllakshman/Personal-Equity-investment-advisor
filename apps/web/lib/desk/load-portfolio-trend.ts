import {
  alignTrendPoints,
  buildPeriodSeries,
  type TrendLot,
  type TrendPeriod,
  type TrendSeries,
} from "./portfolio-trend";
import {
  fetchYahooChartCloses,
  INDEX_YAHOO_SYMBOLS,
  type ChartClose,
} from "../market/yahoo-chart";
import { yahooSymbol } from "../market/yahoo-symbol";
import type { NativeCurrency } from "../portfolio/exchange";
import { displayFxRate } from "../portfolio/fx";

export type PortfolioTrendPayload = {
  emptyBook: boolean;
  unavailable: boolean;
  asOf: string | null;
  periods: Record<TrendPeriod, TrendSeries>;
};

const MAX_LOTS = 25;

export function trendLotsFromHoldings(
  holdings: {
    ticker: string;
    qty: number;
    exchange: string;
    native_currency: string;
  }[],
): TrendLot[] {
  const lots: TrendLot[] = [];
  for (const h of holdings.slice(0, MAX_LOTS)) {
    const qty = Number(h.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const symbol = yahooSymbol(h.ticker, h.exchange);
    if (!symbol) continue;
    lots.push({
      ticker: h.ticker,
      yahooSymbol: symbol,
      qty,
      nativeCurrency: String(h.native_currency || "USD"),
    });
  }
  return lots;
}

function emptyPayload(emptyBook: boolean): PortfolioTrendPayload {
  const blank: TrendSeries = {
    dates: [],
    portfolio: [],
    nasdaq: [],
    sp500: [],
    portfolioPct: null,
    nasdaqPct: null,
    sp500Pct: null,
  };
  return {
    emptyBook,
    unavailable: true,
    asOf: null,
    periods: {
      daily: blank,
      weekly: blank,
      monthly: blank,
      yearly: blank,
    },
  };
}

export async function loadPortfolioTrend(
  holdings: {
    ticker: string;
    qty: number;
    exchange: string;
    native_currency: string;
  }[],
  displayCurrency: NativeCurrency,
  fxUsdInrOverride: number | null,
  fetchImpl: typeof fetch = fetch,
): Promise<PortfolioTrendPayload> {
  if (holdings.length === 0) return emptyPayload(true);
  const lots = trendLotsFromHoldings(holdings);
  if (lots.length === 0) return emptyPayload(false);

  const symbols = [
    ...new Set(lots.map((l) => l.yahooSymbol)),
    INDEX_YAHOO_SYMBOLS.nasdaq,
    INDEX_YAHOO_SYMBOLS.sp500,
  ];
  const fetched = await Promise.all(
    symbols.map(async (symbol) => {
      const points = await fetchYahooChartCloses(symbol, fetchImpl);
      return [symbol, points] as const;
    }),
  );
  const bySymbol = new Map<string, ChartClose[]>(fetched);

  const fx = displayFxRate(fxUsdInrOverride);
  const points = alignTrendPoints(
    lots,
    bySymbol,
    bySymbol.get(INDEX_YAHOO_SYMBOLS.nasdaq) ?? [],
    bySymbol.get(INDEX_YAHOO_SYMBOLS.sp500) ?? [],
    displayCurrency,
    fx,
  );
  if (points.length < 2) return emptyPayload(false);
  const periods = buildPeriodSeries(points);
  const asOfTs = points[points.length - 1]!.ts;
  return {
    emptyBook: false,
    unavailable: false,
    asOf: new Date(asOfTs * 1000).toISOString().slice(0, 10),
    periods,
  };
}
