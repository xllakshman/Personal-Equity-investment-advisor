import { parseMonthlyCloses, type ClosePoint } from "../research/cagr";

/** Yahoo chart v8. No API key. Display quotes only. Do not write lots. */
export const YAHOO_CHART_BASE =
  "https://query1.finance.yahoo.com/v8/finance/chart";

export const INDEX_YAHOO_SYMBOLS = {
  nasdaq: "^IXIC",
  sp500: "^GSPC",
} as const;

const UA = "Mozilla/5.0 (compatible; eqveste-desk/1.0; +https://eqveste.com)";

export type ChartClose = ClosePoint & { currency: string };

export function yahooChartUrl(
  symbol: string,
  range = "1y",
  interval = "1d",
): string {
  const q = new URLSearchParams({ range, interval });
  return `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?${q.toString()}`;
}

export function parseChartCloses(payload: unknown, _symbol: string): ChartClose[] {
  const points = parseMonthlyCloses(payload);
  if (points.length === 0) return [];
  let currency = "USD";
  if (payload && typeof payload === "object") {
    const chart = (payload as { chart?: { result?: unknown[] } }).chart;
    const row = chart?.result?.[0];
    if (row && typeof row === "object") {
      const meta = (row as { meta?: { currency?: string } }).meta;
      currency = String(meta?.currency || "USD")
        .slice(0, 3)
        .toUpperCase() || "USD";
    }
  }
  return points.map((p) => ({ ...p, currency }));
}

/** D40: drop an in-progress session bar; do not estimate a close. */
export function dropInProgressSession(
  points: ChartClose[],
  now = new Date(),
): ChartClose[] {
  if (points.length === 0) return points;
  const last = points[points.length - 1]!;
  const lastDay = new Date(last.ts * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  if (lastDay === today) return points.slice(0, -1);
  return points;
}

export async function fetchYahooChartCloses(
  symbol: string,
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<ChartClose[]> {
  const trimmed = symbol.trim();
  if (!trimmed) return [];
  try {
    const res = await fetchImpl(yahooChartUrl(trimmed, "1y", "1d"), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return [];
    return dropInProgressSession(parseChartCloses(await res.json(), trimmed), now);
  } catch {
    return [];
  }
}
