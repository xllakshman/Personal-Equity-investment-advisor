import type { NativeCurrency } from "./exchange";
import { toDisplayAmount } from "./fx";
import type { LotKind } from "./lot-kind";

export type HoldingGridRow = {
  ticker: string;
  company_name: string | null;
  exchange: string;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  lot_count: number;
  lot_kind: LotKind;
};

export type DisplayHoldingRow = HoldingGridRow & {
  displayCost: number;
  displayValue: number;
  weightPct: number;
};

export function holdingsForDisplay(
  rows: HoldingGridRow[],
  displayCurrency: NativeCurrency,
  fxUsdInr: number,
): DisplayHoldingRow[] {
  const valued = rows.map((r) => {
    const displayCost = toDisplayAmount(
      r.cost_per_share,
      r.native_currency,
      displayCurrency,
      fxUsdInr,
    );
    const displayValue = toDisplayAmount(
      r.qty * r.cost_per_share,
      r.native_currency,
      displayCurrency,
      fxUsdInr,
    );
    return { ...r, displayCost, displayValue };
  });
  const sum = valued.reduce((s, r) => s + r.displayValue, 0);
  return valued.map((r) => ({
    ...r,
    weightPct: sum > 0 ? (100 * r.displayValue) / sum : 0,
  }));
}

/** Account display when portfolios.display_currency is missing or invalid. Saved INR stays INR. */
export const DEFAULT_DISPLAY_CURRENCY: NativeCurrency = "USD";

export function asDisplayCurrency(raw: string | null | undefined): NativeCurrency {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();
  return code === "INR" ? "INR" : DEFAULT_DISPLAY_CURRENCY;
}
