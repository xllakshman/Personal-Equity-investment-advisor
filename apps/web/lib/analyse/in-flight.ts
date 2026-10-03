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

/** Client navigation only — server redirect() on /analyse after Submit is caught by error.tsx. */
export function analyseWaitTarget(
  requestId: string | null | undefined,
  inFlightId: string | null | undefined,
): string | null {
  const id = String(requestId || inFlightId || "").trim();
  return id ? analyseWaitHref(id) : null;
}

export function analyseRunningHint(ticker: string): string {
  return `${ticker} — watch progress`;
}

export function analyseRunningChip(ticker: string): string {
  return `${ticker} · in progress`;
}
