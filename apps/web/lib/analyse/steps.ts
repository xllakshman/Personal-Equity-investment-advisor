export const ANALYSE_STEPS = [
  {
    n: 1,
    id: "analyse-step-1",
    title: "Stock to research",
    hint: "Type a ticker or pick one from your book.",
  },
  {
    n: 2,
    id: "analyse-step-2",
    title: "What to check",
    hint: "Pick at least one kind of check.",
  },
  {
    n: 3,
    id: "analyse-step-3",
    title: "Your position",
    hint: "Qty and cost fill from your book. Change them for this run only.",
  },
  {
    n: 4,
    id: "analyse-step-4",
    title: "Risk and return",
    hint: "Risk and return have to match before a note can run.",
  },
  {
    n: 5,
    id: "analyse-step-5",
    title: "Tax treatment",
    hint: "Residency decides holding period and when selling makes sense.",
  },
  {
    n: 6,
    id: "analyse-step-6",
    title: "Choose your agent",
    hint: "Pick an agent allowed on your plan.",
  },
] as const;

export function analyseStepsDone(opts: {
  hasTicker: boolean;
  lensCount: number;
  conflict: boolean;
  hasTaxResidency: boolean;
  modelOnPlan: boolean;
}): boolean[] {
  const ticker = opts.hasTicker;
  return [
    ticker,
    ticker && opts.lensCount > 0,
    ticker,
    ticker && !opts.conflict,
    ticker && opts.hasTaxResidency,
    ticker && opts.modelOnPlan,
  ];
}

export function firstOpenStep(done: readonly boolean[]): number {
  const i = done.findIndex((d) => !d);
  return i === -1 ? 6 : i + 1;
}

export function analyseGuide(done: readonly boolean[]): string {
  if (done.length === 6 && done.every(Boolean)) {
    return "All six steps are complete. Submit for analysis is on.";
  }
  const n = firstOpenStep(done);
  const s = ANALYSE_STEPS[n - 1];
  if (!s) return "Complete steps 1 to 6.";
  return `Next: Step ${s.n} — ${s.title}. ${s.hint}`;
}
