import type { QuotePoint } from "@/lib/market/book-rows";
import type { NativeCurrency } from "./exchange";
import { toDisplayAmount } from "./fx";

export type DisplayPnl = {
  displayCost: number;
  displayPrice: number | null;
  displayMarket: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
};

function fxCurrency(raw: string): boolean {
  const c = raw.trim().toUpperCase();
  return c === "USD" || c === "INR";
}

/**
 * Display-only: (display market value − display cost) / display cost.
 * Market = qty × Yahoo previous close, converted with the same FX helper
 * used on Review Portfolio. Never writes lots.
 */
export function holdingDisplayPnl(opts: {
  qty: number;
  costPerShare: number;
  nativeCurrency: string;
  quote: QuotePoint | null | undefined;
  displayCurrency: NativeCurrency;
  fxUsdInr: number;
}): DisplayPnl {
  const qty = Number.isFinite(opts.qty) ? opts.qty : 0;
  const cost = Number.isFinite(opts.costPerShare) ? opts.costPerShare : 0;
  const invested = qty * cost;
  const displayCost = fxCurrency(opts.nativeCurrency)
    ? toDisplayAmount(
        invested,
        opts.nativeCurrency,
        opts.displayCurrency,
        opts.fxUsdInr,
      )
    : invested;

  const quote = opts.quote;
  const close =
    quote != null && Number.isFinite(quote.close) && quote.close > 0
      ? quote.close
      : null;
  if (close == null || !quote || !fxCurrency(quote.currency)) {
    return {
      displayCost,
      displayPrice: null,
      displayMarket: null,
      unrealized: null,
      unrealizedPct: null,
    };
  }

  const displayPrice = toDisplayAmount(
    close,
    quote.currency,
    opts.displayCurrency,
    opts.fxUsdInr,
  );
  const displayMarket = toDisplayAmount(
    qty * close,
    quote.currency,
    opts.displayCurrency,
    opts.fxUsdInr,
  );
  const unrealized = displayMarket - displayCost;
  const unrealizedPct =
    displayCost > 0 && Number.isFinite(displayCost)
      ? (100 * unrealized) / displayCost
      : null;
  return {
    displayCost,
    displayPrice,
    displayMarket,
    unrealized,
    unrealizedPct,
  };
}

/** Section / book total. Any missing quote or non-positive cost → null (never fake 0%). */
export function aggregateUnrealizedPct(
  rows: readonly { displayCost: number; displayMarket: number | null }[],
): number | null {
  if (rows.length === 0) return null;
  let cost = 0;
  let market = 0;
  for (const row of rows) {
    if (row.displayMarket == null || !Number.isFinite(row.displayMarket)) {
      return null;
    }
    if (!Number.isFinite(row.displayCost) || row.displayCost <= 0) return null;
    cost += row.displayCost;
    market += row.displayMarket;
  }
  if (cost <= 0) return null;
  return (100 * (market - cost)) / cost;
}

export function formatPnlPct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}
