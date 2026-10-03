/** Header search. Does not enqueue. Any non-empty ticker opens Analyse. */

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

export type TickerSearchTarget =
  | { kind: "empty" }
  | { kind: "analyse"; ticker: string };

export function tickerSearchTarget(raw: string): TickerSearchTarget {
  const ticker = normalizeTicker(raw);
  if (!ticker) return { kind: "empty" };
  return { kind: "analyse", ticker };
}

export function tickerSearchHref(target: TickerSearchTarget): string | null {
  if (target.kind === "empty") return null;
  return `/analyse?ticker=${encodeURIComponent(target.ticker)}`;
}
