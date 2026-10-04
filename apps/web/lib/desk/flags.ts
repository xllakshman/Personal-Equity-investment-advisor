export type DeskFlag = {
  kind: "cash" | "concentration";
  text: string;
};

const CASH_COPY = "Your cash is too low for this kind of market.";
const CONCENTRATION_COPY =
  "One stock has grown too large — trim it before you buy anything else.";

/** Cost×qty weights vs profile knobs. No live price. No max-positions banner. */
export function deskFlags(input: {
  costBasis: number;
  cash: number | null;
  cashMinPct: number;
  concentrationCapPct: number;
  holdings: { ticker: string; weightPct: number }[];
}): DeskFlag[] {
  const flags: DeskFlag[] = [];
  const basis = Number(input.costBasis);
  const minPct = Number(input.cashMinPct);
  const cap = Number(input.concentrationCapPct);

  if (
    input.cash !== null &&
    Number.isFinite(input.cash) &&
    Number.isFinite(basis) &&
    basis > 0 &&
    Number.isFinite(minPct)
  ) {
    const pct = (100 * input.cash) / (input.cash + basis);
    if (pct < minPct) {
      flags.push({ kind: "cash", text: CASH_COPY });
    }
  }

  if (Number.isFinite(cap) && cap > 0) {
    const heavy = input.holdings.some(
      (h) => Number.isFinite(h.weightPct) && h.weightPct > cap,
    );
    if (heavy) {
      flags.push({ kind: "concentration", text: CONCENTRATION_COPY });
    }
  }

  return flags;
}
