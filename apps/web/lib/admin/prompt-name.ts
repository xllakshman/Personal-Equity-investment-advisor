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
