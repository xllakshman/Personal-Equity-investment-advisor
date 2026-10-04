export const ELITE_CHIP_ACCENTS = [
  "#0a84ff",
  "#30d158",
  "#ff9f0a",
  "#bf5af2",
  "#64d2ff",
] as const;

export type HoldingChipSource = {
  ticker: string | null;
  issuer: string;
};

export type HoldingChip = {
  label: string;
  ticker: string | null;
  overlap: boolean;
};

export function normalizeTicker(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

export function uniqueHeldTickers(
  tickers: Iterable<string | null | undefined>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tickers) {
    const t = normalizeTicker(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function chipLabel(row: HoldingChipSource): string {
  const ticker = normalizeTicker(row.ticker);
  if (ticker) return ticker;
  const issuer = String(row.issuer ?? "").trim();
  if (!issuer) return "—";
  return issuer.length > 18 ? `${issuer.slice(0, 16)}…` : issuer;
}

export function topHoldingChips(
  holdings: HoldingChipSource[],
  held: Iterable<string>,
  limit = 5,
): HoldingChip[] {
  const heldSet = new Set(uniqueHeldTickers(held));
  return (holdings ?? []).slice(0, limit).map((row) => {
    const ticker = normalizeTicker(row.ticker) || null;
    return {
      label: chipLabel(row),
      ticker,
      overlap: ticker != null && heldSet.has(ticker),
    };
  });
}

export function overlapCopy(chips: HoldingChip[]): string {
  const names = chips.filter((c) => c.overlap && c.ticker).map((c) => c.ticker as string);
  if (names.length === 0) return "No overlap with your holdings yet";
  return `You both own ${names.join(", ")}`;
}

export function eliteAccent(index: number): string {
  return ELITE_CHIP_ACCENTS[index % ELITE_CHIP_ACCENTS.length] ?? "#0a84ff";
}
