/** Header search (P1-03b). Does not enqueue. */

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

export type TickerSearchTarget =
  | { kind: "empty" }
  | { kind: "analyse"; ticker: string }
  | { kind: "add"; ticker: string };

export function tickerSearchTarget(
  raw: string,
  heldTickers: readonly string[],
): TickerSearchTarget {
  const ticker = normalizeTicker(raw);
  if (!ticker) return { kind: "empty" };
  const held = new Set(heldTickers.map((t) => t.toUpperCase()));
  if (held.has(ticker)) return { kind: "analyse", ticker };
  return { kind: "add", ticker };
}

export function tickerSearchHref(target: TickerSearchTarget): string | null {
  if (target.kind === "empty") return null;
  if (target.kind === "analyse") {
    return `/analyse?ticker=${encodeURIComponent(target.ticker)}`;
  }
  return `/portfolio?add=${encodeURIComponent(target.ticker)}`;
}
