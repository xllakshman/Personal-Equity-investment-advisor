export const IN_FLIGHT_STATUSES = [
  "queued",
  "gathering",
  "drafting",
  "checking",
  "rendering",
] as const;

export type InFlightAnalysis = {
  id: string;
  ticker: string;
  status: string;
};

export function isInFlightStatus(status: string): boolean {
  return (IN_FLIGHT_STATUSES as readonly string[]).includes(status);
}

export function analyseWaitHref(id: string): string {
  return `/analyse/${id}`;
}

export function analyseRunningHint(ticker: string): string {
  return `${ticker} — watch progress`;
}

export function analyseRunningChip(ticker: string): string {
  return `${ticker} · in progress`;
}
