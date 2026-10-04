/** Operator-facing admin copy. Headlines must not name tables or RPCs. */

export const ADMIN_KICKER = "Operator console";

export const LOGIN_SUB =
  "This is not the research desk. Customers sign in on the desk login.";

export const LOGIN_NOT_ADMIN =
  "This email is not an operator account. Use the desk login.";

export const ACCOUNTS_LEDE =
  "Waiting: Trial signups and people who clicked Subscribe on the desk. Existing: already on a paid plan or cancelled, with no open request. Activate puts them on the plan you pick — Subscription then shows that plan. Deactivate moves them back to Trial. Share quantities are not on this page.";

export const ACCOUNTS_WAITING_HINT =
  "New Trial signups, and Subscribe requests you have not Activated.";

export const ACCOUNTS_WAITING_EMPTY = "No one is waiting.";

export const ACCOUNTS_EXISTING_HINT =
  "Paid or cancelled, with no open Subscribe request.";

export const ACCOUNTS_EXISTING_EMPTY = "No activated or cancelled accounts yet.";

export const ACTIVATE_NOTICE =
  "This account is on that plan. Subscription and Analyse show it on the next load.";

export const DEACTIVATE_NOTICE =
  "This account is back on Trial. Subscription shows Trial on the next load.";

export const VIEW_AS_LEDE =
  "Read-only. You see ticker, name, and verdict — not the written note. Submit on Analyse is not on this page. Closing this view is recorded.";

export const CLOSE_VIEW_AS = "Stop viewing as this person";

export const PLANS_LEDE =
  "Trial, Basic, Professional, Professional +, and Ultra. Agents and who-it-is-for are one save for every plan. Price, monthly notes, weekly email cap, why-the-price, and 60 / 80 / 90 / 100 notices stay per plan. Subscription and Analyse pick them up on the next load. This does not charge a card.";

export const LAB_MODELS_LEDE =
  "Change Frontier or Quick on each row. Analyse groups agents that way on the next load. Fetch latest models asks the analysis host (lab keys live there, not on this website) and refreshes the list. Frontier is the latest generation; Quick is at least two generations behind for OpenAI / xAI / DeepSeek and one generation behind for Anthropic. Then tick agents below and Save.";

export const LAB_MODELS_EMPTY =
  "No lab agents are listed yet. Fetch latest lab models.";

export const PLAN_SHARED_HINT =
  "One save writes the same agent list and audience copy to every plan. Analyse then offers those agents. Subscription cards show the audience copy. Trial and Basic still cannot run Frontier agents.";

export const PLAN_SAVED_NOTICE =
  "Saved this plan. Subscription shows the new price, notes, and why-copy on the next load.";

export const PLAN_SHARED_SAVED_NOTICE =
  "Saved for every plan. Analyse offers those agents; Subscription shows who-it-is-for on the next load.";

export const CLASS_SAVED_NOTICE = (label: string, klass: string) =>
  `${label} is now ${klass}. Analyse groups agents that way on the next load.`;

export const FETCH_MODELS_NOTICE = (n: number, labs: string) =>
  `Updated ${n} agents from ${labs}. Frontier vs Quick uses the generation gap on this screen. Save Agents and who it is for to offer new agents on Analyse.`;

export const FETCH_NEEDS_HOST =
  "Fetch latest models needs the analysis host, not this website. You can still change Frontier / Quick on each row — Analyse groups agents that way on the next load.";

export const FETCH_HOST_DOWN =
  "The analysis host did not answer. You can still change Frontier / Quick on each row without Fetch.";

export const PROMPT_LEDE =
  "Upload a version, read it here, download any previous file, then Promote. Analyse uses the In use Stock notes row. Desk customers never see this text.";

export const PROMPT_UPLOAD_HINT =
  "Saved name is your label plus the time in India. Desk customers never see this text. Promote a row to make Analyse use it.";

export const PROMPT_NONE_IN_USE =
  "No prompt in use. Promote a Stock notes row or Submit on Analyse has nothing new to load.";

export const OBSERVABILITY_LEDE =
  "Colours on this screen only. No email. The advisor text and written notes are not stored here.";

export const OBSERVABILITY_WHO =
  "Rows come from usage by person and product. Signing in as an operator is not counted as desk use.";

export const OBS_TAB_LABEL: Record<string, string> = {
  overview: "Overview",
  watch: "Watches",
  apis: "APIs",
  latency: "Speed",
  who: "Who used it",
  feedback: "Customer feedback",
};

const JARGON =
  /\b(invoices\.|families\.|plans\.|model_catalog|prompt_versions|thesis_admin|allowed_model_ids|who_copy|billing_status|plan_id|thesis_class|upsert)\b/i;

export function hasSchemaJargon(text: string): boolean {
  return JARGON.test(text);
}

export function billingStatusLabel(raw: string): string {
  const s = raw.toLowerCase();
  if (s === "subscribed") return "Active";
  if (s === "trial") return "Trial";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (s === "—" || s === "") return "—";
  return raw;
}

export const OPERATOR_STRINGS: string[] = [
  ADMIN_KICKER,
  LOGIN_SUB,
  LOGIN_NOT_ADMIN,
  ACCOUNTS_LEDE,
  ACCOUNTS_WAITING_HINT,
  ACCOUNTS_WAITING_EMPTY,
  ACCOUNTS_EXISTING_HINT,
  ACCOUNTS_EXISTING_EMPTY,
  ACTIVATE_NOTICE,
  DEACTIVATE_NOTICE,
  VIEW_AS_LEDE,
  CLOSE_VIEW_AS,
  PLANS_LEDE,
  LAB_MODELS_LEDE,
  LAB_MODELS_EMPTY,
  PLAN_SHARED_HINT,
  PLAN_SAVED_NOTICE,
  PLAN_SHARED_SAVED_NOTICE,
  CLASS_SAVED_NOTICE("Opus", "Frontier"),
  FETCH_MODELS_NOTICE(3, "OpenAI"),
  FETCH_NEEDS_HOST,
  FETCH_HOST_DOWN,
  PROMPT_LEDE,
  PROMPT_UPLOAD_HINT,
  PROMPT_NONE_IN_USE,
  OBSERVABILITY_LEDE,
  OBSERVABILITY_WHO,
  ...Object.values(OBS_TAB_LABEL),
];
