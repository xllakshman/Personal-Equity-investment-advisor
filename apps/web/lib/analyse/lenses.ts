export const CORE_LENSES = [
  "fundamental",
  "technical",
  "macro",
  "news",
] as const;

export type CoreLens = (typeof CORE_LENSES)[number];

export type LensState = {
  fundamental: boolean;
  technical: boolean;
  macro: boolean;
  news: boolean;
  tax: boolean;
};

export const LENS_COPY: Record<CoreLens | "comprehensive" | "tax", { label: string; desc: string }> =
  {
    fundamental: {
      label: "Business",
      desc: "Results, profit margins, and price versus rivals",
    },
    technical: {
      label: "Price",
      desc: "Trend, averages, and levels it keeps bouncing off",
    },
    macro: {
      label: "Economy",
      desc: "Interest rates, currency, the industry cycle",
    },
    news: {
      label: "News",
      desc: "Company and industry headlines, last 90 days",
    },
    comprehensive: {
      label: "Comprehensive",
      desc: "All four, combined into one answer (uses 1 analysis)",
    },
    tax: {
      label: "Tax",
      desc: "Optional extra lens. Not required for Comprehensive.",
    },
  };

export const LENS_COLORS: Record<CoreLens, string> = {
  fundamental: "#0a84ff",
  technical: "#30d158",
  macro: "#ff9f0a",
  news: "#bf5af2",
};

export function isComprehensive(lenses: Pick<LensState, CoreLens>): boolean {
  return CORE_LENSES.every((k) => lenses[k]);
}

export function toggleLens(state: LensState, id: CoreLens | "comprehensive" | "tax"): LensState {
  if (id === "tax") return { ...state, tax: !state.tax };
  if (id === "comprehensive") {
    const on = !isComprehensive(state);
    return { ...state, fundamental: on, technical: on, macro: on, news: on };
  }
  const next = { ...state, [id]: !state[id] };
  return next;
}

export function selectedLenses(state: LensState): string[] {
  const out: string[] = [];
  for (const k of CORE_LENSES) {
    if (state[k]) out.push(k);
  }
  if (state.tax) out.push("tax");
  return out;
}
