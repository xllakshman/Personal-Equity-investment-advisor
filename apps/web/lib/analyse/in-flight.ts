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
