import type { NativeCurrency } from "../portfolio/exchange";
import { toDisplayAmount } from "../portfolio/fx";
import type { ChartClose } from "../market/yahoo-chart";

export const TREND_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type TrendPeriod = (typeof TREND_PERIODS)[number];

export type TrendLot = {
  ticker: string;
  yahooSymbol: string;
  qty: number;
  nativeCurrency: string;
};

export type AlignedPoint = {
  ts: number;
  portfolio: number | null;
  nasdaq: number | null;
  sp500: number | null;
};

export type TrendSeries = {
  dates: string[];
  portfolio: (number | null)[];
  nasdaq: (number | null)[];
  sp500: (number | null)[];
  portfolioPct: number | null;
  nasdaqPct: number | null;
  sp500Pct: number | null;
};

const WINDOW_SEC: Record<TrendPeriod, number> = {
  daily: 5 * 86400,
  weekly: 7 * 86400,
  monthly: 31 * 86400,
  yearly: 370 * 86400,
};

export function canConvertForTrend(native: string, display: string): boolean {
  const n = native.toUpperCase();
  const d = display.toUpperCase();
  if (n === d) return true;
  return (
    (n === "USD" && d === "INR") ||
    (n === "INR" && d === "USD")
  );
}

export function closeOnOrBefore(points: ChartClose[], ts: number): ChartClose | null {
  let last: ChartClose | null = null;
  for (const p of points) {
    if (p.ts <= ts) last = p;
    else break;
  }
  return last;
}

export function unionTimestamps(series: ChartClose[][]): number[] {
  const set = new Set<number>();
  for (const pts of series) {
    for (const p of pts) set.add(p.ts);
  }
  return [...set].sort((a, b) => a - b);
}

export function sliceWindow(
  points: AlignedPoint[],
  period: TrendPeriod,
  asOfTs: number,
): AlignedPoint[] {
  const start = asOfTs - WINDOW_SEC[period];
  const inWindow = points.filter((p) => p.ts >= start && p.ts <= asOfTs);
  if (period === "daily") return inWindow.slice(-5);
  return inWindow;
}

export function periodReturn(values: (number | null)[]): number | null {
  const numeric = values.filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (numeric.length < 2) return null;
  const first = numeric[0]!;
  const last = numeric[numeric.length - 1]!;
  return last / first - 1;
}

export function sessionReturn(values: (number | null)[]): number | null {
  const numeric = values.filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (numeric.length < 2) return null;
  const prev = numeric[numeric.length - 2]!;
  const last = numeric[numeric.length - 1]!;
  return last / prev - 1;
}

export function indexTo100(values: (number | null)[]): (number | null)[] {
  const first = values.find((v) => v != null && Number.isFinite(v) && v > 0);
  if (first == null) return values.map(() => null);
  return values.map((v) =>
    v != null && Number.isFinite(v) && v > 0 ? (100 * v) / first : null,
  );
}

export function formatTrendPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatTrendDate(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ts * 1000));
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return formatTrendDate(Date.UTC(y, m - 1, d) / 1000);
}

export function isoDateUtc(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function markPortfolioAt(
  lots: readonly TrendLot[],
  seriesBySymbol: ReadonlyMap<string, ChartClose[]>,
  ts: number,
  displayCurrency: NativeCurrency,
  fxUsdInr: number,
): number | null {
  if (lots.length === 0) return null;
  let sum = 0;
  for (const lot of lots) {
    if (!(lot.qty > 0)) return null;
    if (!canConvertForTrend(lot.nativeCurrency, displayCurrency)) return null;
    const pts = seriesBySymbol.get(lot.yahooSymbol);
    if (!pts || pts.length === 0) return null;
    const bar = closeOnOrBefore(pts, ts);
    if (!bar) return null;
    const nativeCcy = bar.currency || lot.nativeCurrency;
    if (!canConvertForTrend(nativeCcy, displayCurrency)) return null;
    const shown = toDisplayAmount(
      lot.qty * bar.close,
      nativeCcy,
      displayCurrency,
      fxUsdInr,
    );
    if (!Number.isFinite(shown)) return null;
    sum += shown;
  }
  return sum > 0 ? sum : null;
}

export function alignTrendPoints(
  lots: readonly TrendLot[],
  lotSeries: ReadonlyMap<string, ChartClose[]>,
  nasdaq: ChartClose[],
  sp500: ChartClose[],
  displayCurrency: NativeCurrency,
  fxUsdInr: number,
): AlignedPoint[] {
  const lotPts = lots
    .map((l) => lotSeries.get(l.yahooSymbol) ?? [])
    .filter((pts) => pts.length > 0);
  const stamps = unionTimestamps(lotPts);
  const out: AlignedPoint[] = [];
  for (const ts of stamps) {
    const portfolio = markPortfolioAt(
      lots,
      lotSeries,
      ts,
      displayCurrency,
      fxUsdInr,
    );
    if (portfolio == null) continue;
    const nq = closeOnOrBefore(nasdaq, ts);
    const sp = closeOnOrBefore(sp500, ts);
    out.push({
      ts,
      portfolio,
      nasdaq:
        nq && canConvertForTrend(nq.currency || "USD", displayCurrency)
          ? toDisplayAmount(nq.close, nq.currency || "USD", displayCurrency, fxUsdInr)
          : null,
      sp500:
        sp && canConvertForTrend(sp.currency || "USD", displayCurrency)
          ? toDisplayAmount(sp.close, sp.currency || "USD", displayCurrency, fxUsdInr)
          : null,
    });
  }
  return out;
}

export function seriesFromWindow(
  window: AlignedPoint[],
  period: TrendPeriod,
): TrendSeries {
  const dates = window.map((p) => isoDateUtc(p.ts));
  const portfolioRaw = window.map((p) => p.portfolio);
  const nasdaqRaw = window.map((p) => p.nasdaq);
  const spRaw = window.map((p) => p.sp500);
  const pctFn = period === "daily" ? sessionReturn : periodReturn;
  return {
    dates,
    portfolio: indexTo100(portfolioRaw),
    nasdaq: indexTo100(nasdaqRaw),
    sp500: indexTo100(spRaw),
    portfolioPct: pctFn(portfolioRaw),
    nasdaqPct: pctFn(nasdaqRaw),
    sp500Pct: pctFn(spRaw),
  };
}

export function buildPeriodSeries(points: AlignedPoint[]): Record<TrendPeriod, TrendSeries> {
  if (points.length === 0) {
    const empty: TrendSeries = {
      dates: [],
      portfolio: [],
      nasdaq: [],
      sp500: [],
      portfolioPct: null,
      nasdaqPct: null,
      sp500Pct: null,
    };
    return {
      daily: empty,
      weekly: empty,
      monthly: empty,
      yearly: empty,
    };
  }
  const asOf = points[points.length - 1]!.ts;
  const out = {} as Record<TrendPeriod, TrendSeries>;
  for (const period of TREND_PERIODS) {
    out[period] = seriesFromWindow(sliceWindow(points, period, asOf), period);
  }
  return out;
}
