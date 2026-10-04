const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SUFFIX_RE = /-\d{4}-[A-Za-z]+-\d{2}: \d{2}:\d{2}:\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-Month-Date: HH:MM:SS` in IST (what the Prompt table uses as the unique suffix). */
export function promptNameSuffix(
  at: Date,
  timeZone = "Asia/Kolkata",
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const month = MONTHS[num("month") - 1] ?? "January";
  return `${num("year")}-${month}-${pad2(num("day"))}: ${pad2(num("hour"))}:${pad2(num("minute"))}:${pad2(num("second"))}`;
}

export function promptVersionName(base: string, at: Date): string {
  const trimmed = base.replace(SUFFIX_RE, "").trim() || "advisor";
  return `${trimmed}-${promptNameSuffix(at)}`;
}

export const PROMPT_ROLES = ["advisor", "refine_gate", "weekly_digest"] as const;
export type PromptRole = (typeof PROMPT_ROLES)[number];

export type PromptActionState = { error: string | null; notice: string | null };
export const EMPTY_PROMPT_STATE: PromptActionState = { error: null, notice: null };

export function parsePromptRole(raw: string): PromptRole {
  return (PROMPT_ROLES as readonly string[]).includes(raw)
    ? (raw as PromptRole)
    : "advisor";
}

const ROLE_COPY: Record<PromptRole, { label: string; outcome: string }> = {
  advisor: {
    label: "Stock notes",
    outcome: "What Analyse writes after you Submit.",
  },
  refine_gate: {
    label: "Follow-up check",
    outcome: "Cheap yes/no before a billed follow-up.",
  },
  weekly_digest: {
    label: "Weekly email",
    outcome: "The names email if that job is on.",
  },
};

export function promptRoleLabel(role: string | null | undefined): string {
  return ROLE_COPY[parsePromptRole(String(role ?? ""))].label;
}

export function promptRoleOutcome(role: string | null | undefined): string {
  return ROLE_COPY[parsePromptRole(String(role ?? ""))].outcome;
}

/** Calendar day in IST, e.g. `4 Oct 2026`. */
export function formatPromptDate(
  iso: string | null | undefined,
  timeZone = "Asia/Kolkata",
): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(at);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${num("day")} ${num("month")} ${num("year")}`.trim();
}

export function promptInUseLine(
  role: string | null | undefined,
  promotedAt: string | null | undefined,
): string {
  const title = promptRoleLabel(role);
  const since = formatPromptDate(promotedAt);
  return since ? `${title} — in use since ${since}` : `${title} — in use`;
}

export function canRemovePrompt(row: {
  promoted_at: string | null;
  superseded_at: string | null;
  archived_at?: string | null;
}): boolean {
  if (row.archived_at) return false;
  if (row.promoted_at && !row.superseded_at) return false;
  return true;
}

export function promptRemoveError(message: string): string {
  if (message.includes("THS-PROMPT-001")) {
    return "This is the prompt Analyse is using. Promote another version first.";
  }
  const lower = message.toLowerCase();
  if (
    lower.includes("thesis_admin_remove_prompt") ||
    lower.includes("could not find the function") ||
    lower.includes("42883") ||
    lower.includes("pgrst202")
  ) {
    return "Apply migration 026 so Remove can hide old prompts.";
  }
  return message;
}
