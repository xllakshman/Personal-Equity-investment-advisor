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
}): BookMoney {
  const qty = Number.isFinite(opts.qty) ? opts.qty : 0;
  const cost = Number.isFinite(opts.costPerShare) ? opts.costPerShare : 0;
  const invested = qty * cost;
  const quote = opts.quote;
  const sameCcy =
    quote != null &&
    quote.currency.toUpperCase() === opts.nativeCurrency.toUpperCase();
  const price = sameCcy ? quote.close : null;
  const value = price != null ? qty * price : null;
  const unrealized = value != null ? value - invested : null;
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
    weightPct,
  };
}
