import type { NativeCurrency } from "./exchange";

/** Renderer default only. Never written to holding_lots.cost_per_share. */
export const DEFAULT_USD_INR = 88.4;

export function displayFxRate(override: number | null | undefined): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  return DEFAULT_USD_INR;
}

export function toDisplayAmount(
  nativeAmount: number,
  nativeCurrency: string,
  displayCurrency: NativeCurrency,
  fxUsdInr: number,
): number {
  if (!Number.isFinite(nativeAmount)) return 0;
  const native = nativeCurrency.toUpperCase();
  const display = displayCurrency.toUpperCase();
  if (native === display) return nativeAmount;
  const fx = fxUsdInr > 0 ? fxUsdInr : DEFAULT_USD_INR;
  if (native === "USD" && display === "INR") return nativeAmount * fx;
  if (native === "INR" && display === "USD") return nativeAmount / fx;
  return nativeAmount;
}

export function formatMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : 2;
  const body = n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${currency} ${body}`;
}

export function formatQty(qty: number): string {
  if (!Number.isFinite(qty)) return "—";
  if (Number.isInteger(qty)) return String(qty);
  return qty.toLocaleString("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });
}

export function formatWeightPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}
