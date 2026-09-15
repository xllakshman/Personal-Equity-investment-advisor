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

export function waitStatusLabel(status: string): string {
  if (status === "ready") return "Ready";
  if (status === "failed" || status === "rejected") return "Not completed";
  return "In progress";
}

export function waitLede(status: string): string {
  if (status === "ready") {
    return "Your note is ready. Open Reports to read it.";
  }
  if (status === "failed" || status === "rejected") {
    return "This run did not finish. Saved notes are unchanged.";
  }
  return "Usually 40 to 90 seconds. You can leave this page — the note will appear under Reports when it is ready.";
}
