import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { holdingDisplayPnl } from "@/lib/portfolio/unrealized-pnl";

export type QuotePoint = {
  close: number;
  currency: string;
};

export type BookMoney = {
  invested: number;
  price: number | null;
  value: number | null;
  realized: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
  weightPct: number;
};

/** Realized stays null: holding_lots has remaining qty only; there is no sell table. */
export function bookMoney(opts: {
  qty: number;
  costPerShare: number;
  nativeCurrency: string;
  quote: QuotePoint | null | undefined;
  investedTotal: number;
  valueTotal: number | null;
  displayCurrency?: NativeCurrency;
  fxUsdInr?: number;
}): BookMoney {
  const qty = Number.isFinite(opts.qty) ? opts.qty : 0;
  const cost = Number.isFinite(opts.costPerShare) ? opts.costPerShare : 0;
  const displayCurrency = opts.displayCurrency;
  if (displayCurrency) {
    const pnl = holdingDisplayPnl({
      qty,
      costPerShare: cost,
      nativeCurrency: opts.nativeCurrency,
      quote: opts.quote,
      displayCurrency,
      fxUsdInr: opts.fxUsdInr ?? 0,
    });
    const invested = pnl.displayCost;
    const value = pnl.displayMarket;
    const basis =
      opts.valueTotal != null && opts.valueTotal > 0 ? value : invested;
    const denom =
      opts.valueTotal != null && opts.valueTotal > 0
        ? opts.valueTotal
        : opts.investedTotal;
    const weightPct = denom > 0 && basis != null ? (100 * basis) / denom : 0;
    return {
      invested,
      price: pnl.displayPrice,
      value,
      realized: null,
      unrealized: pnl.unrealized,
      unrealizedPct: pnl.unrealizedPct,
      weightPct,
    };
  }

  const invested = qty * cost;
  const quote = opts.quote;
  const sameCcy =
    quote != null &&
    quote.currency.toUpperCase() === opts.nativeCurrency.toUpperCase();
  const price = sameCcy ? quote.close : null;
  const value = price != null ? qty * price : null;
  const unrealized = value != null ? value - invested : null;
  const unrealizedPct =
    value != null && invested > 0 ? (100 * unrealized!) / invested : null;
  const basis =
    opts.valueTotal != null && opts.valueTotal > 0
      ? value
      : invested;
  const denom =
    opts.valueTotal != null && opts.valueTotal > 0
      ? opts.valueTotal
      : opts.investedTotal;
  const weightPct = denom > 0 && basis != null ? (100 * basis) / denom : 0;
  return {
    invested,
    price,
    value,
    realized: null,
    unrealized,
    unrealizedPct,
    weightPct,
  };
}
