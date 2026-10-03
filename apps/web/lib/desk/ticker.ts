/** Header search. Does not enqueue. Any ticker opens the same Analyse builder. */

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

function deskTicker(raw: string): string {
  let ticker = normalizeTicker(raw);
  if (ticker.endsWith(".NS") || ticker.endsWith(".BO")) ticker = ticker.slice(0, -3);
  return ticker;
}

export type TickerSearchTarget =
  | { kind: "empty" }
  | { kind: "analyse"; ticker: string };

export function tickerSearchTarget(raw: string): TickerSearchTarget {
  const ticker = deskTicker(raw);
  if (!ticker) return { kind: "empty" };
  return { kind: "analyse", ticker };
}

/** Same screen as nav “Analyse a stock”. Empty search still opens the builder. */
export function tickerSearchHref(target: TickerSearchTarget): string {
  if (target.kind === "empty") return "/analyse";
  return `/analyse?ticker=${encodeURIComponent(target.ticker)}`;
}
