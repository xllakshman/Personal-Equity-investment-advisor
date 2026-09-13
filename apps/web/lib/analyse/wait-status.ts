/** Map analysis_requests.status to wait-panel copy (P3-03 / P4-00). */

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
    case "checking":
      return 3;
    case "rendering":
    case "ready":
      return 4;
    default:
      return 0;
  }
}

export function waitLede(status: string): string {
  if (status === "ready") {
    return "The worker wrote a reports row. Open Reports to see the note name. The reader is not on this page yet.";
  }
  if (status === "failed" || status === "rejected") {
    return "This request did not finish. Reports still lists only saved notes. No ready row was faked.";
  }
  return "Usually 40 to 90 seconds once the worker is running. Next.js does not start apps/analysis-worker. This row stays queued until that process writes a reports row. You can leave this page — Reports lists saved notes only, so you will not see a new ready note yet.";
}
