import { normalizeTicker } from "@/lib/desk/ticker";

export type NativeCurrency = "USD" | "INR";
export type CurrencyOverride = "auto" | NativeCurrency;

export function canonicalTicker(raw: string): string {
  const t = normalizeTicker(raw);
  if (t.endsWith(".NS") || t.endsWith(".BO")) return t.slice(0, -3);
  return t;
}

/** Exchange only — currency is a separate field (Maya HDFCBANK is NSE + USD). */
export function guessExchange(raw: string): string {
  const t = normalizeTicker(raw);
  if (t.endsWith(".NS")) return "NSE";
  if (t.endsWith(".BO")) return "BSE";
  if (t.includes(".")) return "NYSE";
  return "NASDAQ";
}

export function currencyFromExchange(exchange: string): NativeCurrency {
  if (exchange === "NSE" || exchange === "BSE") return "INR";
  return "USD";
}

export function resolveNativeCurrency(
  exchange: string,
  override: CurrencyOverride,
): NativeCurrency {
  if (override === "USD" || override === "INR") return override;
  return currencyFromExchange(exchange);
}

export function parseCurrencyOverride(raw: string): CurrencyOverride {
  if (raw === "USD" || raw === "INR" || raw === "auto") return raw;
  return "auto";
}
