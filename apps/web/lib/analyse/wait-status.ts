export function waitHeadline(status: string): "ready" | "failed" | "working" {
  if (status === "ready") return "ready";
  if (status === "rejected" || status === "failed") return "failed";
  return "working";
}

export function waitStepIndex(status: string): number {
  switch (status) {
    case "queued":
      return 0;
    case "gathering":
      return 1;
    case "drafting":
      return 2;
    case "checking":
      return 3;
    case "rendering":
    case "ready":
      return 4;
    default:
      return 0;
  }
}

export function waitStatusLabel(status: string): string {
  if (status === "ready") return "Ready";
  if (status === "failed" || status === "rejected") return "Not completed";
  return "In progress";
}

export function waitLede(status: string): string {
  if (status === "ready") {
    return "Your note is ready on this page. The same row is saved on Reports.";
  }
  if (status === "failed" || status === "rejected") {
    return "This run did not finish. Saved notes are unchanged.";
  }
  return "This page is the progress view after Submit. The bar and the five steps update as the worker writes analysis_requests.status. Reports stays empty until status is ready.";
}

export function waitProgressPct(status: string): number {
  switch (status) {
    case "queued":
      return 12;
    case "gathering":
      return 34;
    case "drafting":
      return 62;
    case "checking":
      return 82;
    case "rendering":
      return 94;
    case "ready":
      return 100;
    case "failed":
    case "rejected":
      return 0;
    default:
      return 8;
  }
}

export const WAIT_STEPS = [
  "Queued — waiting for the worker",
  "Gathering prices, filings and news",
  "Drafting the note against your book",
  "Checking risk, tax and position limits",
  "Saving the note on Reports",
] as const;

export const INVESTING_WAIT_MESSAGES = [
  "Price is what you pay; value is what this run is still measuring.",
  "A moat is earned in the numbers, not in the ticker. Gathering continues.",
  "Position size is a decision. Your book limits travel with this pack.",
  "The market can stay noisy longer than a blank page. Progress is on the bar.",
  "Cash is a position too. Your reserve band is in the pack the model is reading.",
  "Averaging down only works if the thesis is intact. That check is in this draft.",
  "Tax residency changes when a gain is long-term. Those knobs are already packed.",
  "A concentration cap exists so one name cannot sink the book. Yours is in this run.",
  "Headlines are not a thesis. We still read them so the note can say what changed.",
  "The best time to size a tranche is before the first fill. T1–T4 go with this prompt.",
  "Patience is a position. The worker is still writing; this page is not stuck.",
  "Risk and return have to match. That pair was locked before this run queued.",
] as const;

export function investingWaitMessage(tick: number): string {
  const i = Math.abs(tick) % INVESTING_WAIT_MESSAGES.length;
  return INVESTING_WAIT_MESSAGES[i] ?? INVESTING_WAIT_MESSAGES[0];
}
