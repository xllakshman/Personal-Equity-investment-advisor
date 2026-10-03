import { DEFAULT_USD_INR, roundUsdInr } from "./fx";

/** Parse a Frankfurter-style `{ rates: { INR } }` payload. */
export function parseUsdInrPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const rates = (payload as { rates?: { INR?: unknown } }).rates;
  const n = Number(rates?.INR);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundUsdInr(n);
}

/**
 * USD→INR for display only. Never writes holding_lots.
 * Round-trip: two decimal places. Failures return null so the page can fall back.
 */
export async function fetchUsdInrRate(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
      { cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    return parseUsdInrPayload(await res.json());
  } catch {
    return null;
  }
}

export function displayRateThisLoad(
  live: number | null,
  override: number | null | undefined,
): { rate: number; source: "live" | "saved" | "default" } {
  if (live != null) return { rate: live, source: "live" };
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return { rate: roundUsdInr(override), source: "saved" };
  }
  return { rate: roundUsdInr(DEFAULT_USD_INR), source: "default" };
}
