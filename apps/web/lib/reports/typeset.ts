/** Turn LAYER 1 prose into headings/paragraphs. Never keep model HTML. */

import { stripTags } from "./sections";
import type { AllowedChart } from "./charts";

export type TypesetBlock =
  | { kind: "rule" }
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string };

export type KeyFact = { label: string; value: string };

export type NoteTableKind = "slice" | "scorecard" | "other";

export type NoteTable = {
  kind: NoteTableKind;
  title: string;
  headers: string[];
  rows: string[][];
};

const HEADING_MARKERS = [
  "THE BOTTOM LINE",
  "LAYER 1",
  "PLAIN LANGUAGE",
  "WHAT THIS COMPANY DOES",
  "IS IT A GOOD BUSINESS",
  "WHAT COULD GO WRONG",
  "IS THE PRICE FAIR",
  "WHAT YOU'D EARN",
  "HOW MUCH HAS TO GO RIGHT",
  "END OF ANALYSIS",
  "NOT ADVICE",
  "MACHINE-READABLE",
  "INVESTMENT OVERVIEW",
  "COMPANY OVERVIEW",
  "RISKS",
];

const SLICE_TITLE = /tranche|slice|ladder|rebased/;
const SCORECARD_TITLE = /scorecard|framework\s*1|\broic\b|moat score|f1 /;
const SLICE_KEYS = new Set([
  "tranche_ladder",
  "slices",
  "slice_plan",
  "rebased_tranche_ladder",
  "tranches",
]);
const SCORECARD_KEYS = new Set([
  "scorecard",
  "framework_1",
  "framework_1_scorecard",
  "roic_scorecard",
  "f1_scorecard",
]);

function clean(raw: string): string {
  return stripTags(raw).replace(/\u00a0/g, " ").trim();
}

export function stripMarkdown(raw: string): string {
  return (raw || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/\*\*/g, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[*•][ \t]+/gm, "");
}

function consumeJsonObject(src: string): string {
  if (!src.startsWith("{")) return "";
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(0, i + 1);
    }
  }
  return src;
}

function parseJsonObject(src: string): Record<string, unknown> | null {
  const consumed = consumeJsonObject(src.trim());
  if (!consumed) return null;
  try {
    const data = JSON.parse(consumed) as unknown;
    return asRecord(data);
  } catch {
    return null;
  }
}

/** In-memory parse of the MACHINE-READABLE blob. Never write back to Postgres. */
export function extractMachineJson(text: string): Record<string, unknown> | null {
  const src = text || "";
  const upper = src.toUpperCase();
  const marker = upper.indexOf("MACHINE-READABLE");
  if (marker >= 0) {
    const after = src.slice(marker);
    const brace = after.indexOf("{");
    if (brace < 0) return null;
    return parseJsonObject(after.slice(brace));
  }
  const lastBrace = src.lastIndexOf("\n{");
  if (lastBrace >= 0) {
    const candidate = src.slice(lastBrace + 1).trim();
    if (candidate.startsWith("{") && /"ticker"\s*:/.test(candidate)) {
      return parseJsonObject(candidate);
    }
  }
  return null;
}

export function stripMachineReadable(raw: string): string {
  const text = raw || "";
  const upper = text.toUpperCase();
  const marker = upper.indexOf("MACHINE-READABLE");
  if (marker >= 0) {
    const before = text.slice(0, marker).trimEnd();
    const after = text.slice(marker);
    const brace = after.indexOf("{");
    if (brace < 0) return before;
    const consumed = consumeJsonObject(after.slice(brace));
    const rest = after.slice(brace + consumed.length).replace(/^\s+/, "");
    return [before, rest].filter(Boolean).join("\n\n").trim();
  }
  const lastBrace = text.lastIndexOf("\n{");
  if (lastBrace >= 0) {
    const candidate = text.slice(lastBrace + 1).trim();
    if (candidate.startsWith("{") && /"ticker"\s*:/.test(candidate)) {
      const obj = consumeJsonObject(candidate);
      if (obj.length > 20) return text.slice(0, lastBrace).trimEnd();
    }
  }
  return text;
}

export function displayProse(raw: string): string {
  return stripMarkdown(stripMachineReadable(clean(raw || "")));
}

function isRule(line: string): boolean {
  const t = line.replace(/\s/g, "");
  return t.length >= 8 && /^[=\-─—_*]+$/.test(t);
}

function isHeading(line: string): boolean {
  const upper = line.toUpperCase();
  if (HEADING_MARKERS.some((m) => upper.includes(m) && line.length < 80)) return true;
  if (line.length > 72) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length < 8) return false;
  const caps = letters.replace(/[^A-Z]/g, "").length;
  return caps / letters.length >= 0.78;
}

function isJsonDump(text: string): boolean {
  const t = text.trim();
  if (/MACHINE-READABLE/i.test(t)) return true;
  if (t.startsWith("{") && t.includes('"')) return true;
  if (t.startsWith("[") && t.includes("{")) return true;
  const braces = (t.match(/[{}\[\]"]/g) || []).length;
  return t.length > 40 && braces / t.length > 0.12 && /"[a-z_]+"\s*:/.test(t);
}

export function typesetProse(raw: string): TypesetBlock[] {
  const text = displayProse(raw);
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: TypesetBlock[] = [];
  let para: string[] = [];
  let sawTitle = false;

  const flushPara = () => {
    const body = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (!body || isJsonDump(body)) return;
    blocks.push({ kind: "p", text: body });
  };

  for (const original of lines) {
    const line = stripMarkdown(clean(original));
    if (!line) {
      flushPara();
      continue;
    }
    if (isRule(line)) {
      flushPara();
      if (blocks.at(-1)?.kind !== "rule") blocks.push({ kind: "rule" });
      continue;
    }
    if (isHeading(line) || /MACHINE-READABLE/i.test(line)) {
      flushPara();
      const title = line.replace(/^#+\s*/, "").replace(/[·•]+/g, " ").trim();
      if (/MACHINE-READABLE/i.test(title)) continue;
      blocks.push({ kind: "h2", text: title });
      continue;
    }
    if (isJsonDump(line)) {
      flushPara();
      continue;
    }
    if (
      !sawTitle &&
      line.length <= 80 &&
      /[A-Za-z]/.test(line) &&
      para.length === 0 &&
      !/[.!?]$/.test(line)
    ) {
      const prev = blocks.at(-1)?.kind;
      if (prev === "rule" || prev === undefined) {
        sawTitle = true;
        blocks.push({ kind: "h1", text: line });
        continue;
      }
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function machineFrom(sections: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  const rec = asRecord(sections);
  if (!rec) return null;
  const stored = asRecord(rec.machine);
  if (stored && Object.keys(stored).length > 0) return stored;
  const prose = typeof rec.plain_language === "string" ? rec.plain_language : "";
  return extractMachineJson(prose);
}

export function formatNoteMoney(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) return formatUsd(raw);
  const t = String(raw).trim();
  if (!t) return "";
  if (/^\$/.test(t) || /%$/.test(t)) return t;
  if (/[A-Za-z]/.test(t) && !/^[-+]?[\d,]+(?:\.\d+)?$/.test(t)) return t;
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n)) return t;
  return formatUsd(n);
}

function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 1000 && Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const slice = iso.slice(0, 10);
    return slice || iso;
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const n = Number(raw.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function firstNumber(machine: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = parseNumber(machine[key]);
    if (n != null) return n;
  }
  return null;
}

function firstString(machine: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = machine[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function priceFromExcerpt(excerpt?: string | null): string {
  if (!excerpt) return "";
  const m = excerpt.match(/\$\s?[\d,]+(?:\.\d+)?/);
  return m ? m[0].replace(/\s/g, "") : "";
}

export function keyFacts(input: {
  ticker: string;
  verdict: string;
  conviction?: string | null;
  createdAt?: string | null;
  modelLabel?: string | null;
  evidenceExcerpt?: string | null;
  machine?: Record<string, unknown> | null;
}): KeyFact[] {
  const facts: KeyFact[] = [];
  const machine = input.machine && typeof input.machine === "object" ? input.machine : {};
  const ticker = firstString(machine, ["ticker"]) || String(input.ticker ?? "").trim();
  if (ticker) facts.push({ label: "Name", value: ticker });
  const rating =
    firstString(machine, ["classification", "verdict"]) || String(input.verdict ?? "").trim();
  if (rating) facts.push({ label: "Rating", value: rating });
  const priceNum = firstNumber(machine, ["current_price", "price", "close"]);
  const price =
    priceNum != null
      ? formatNoteMoney(priceNum)
      : firstString(machine, ["current_price", "price", "close"]) ||
        priceFromExcerpt(input.evidenceExcerpt);
  if (price) facts.push({ label: "Price", value: price.startsWith("$") ? price : formatNoteMoney(price) || price });
  if (input.createdAt) {
    const label = formatNoteDate(input.createdAt);
    if (label) facts.push({ label: "As of", value: label });
  }
  if (input.conviction) facts.push({ label: "Conviction", value: String(input.conviction) });
  const cost = firstNumber(machine, ["cost_basis", "cost_per_share", "avg_cost"]);
  if (cost != null) facts.push({ label: "Cost", value: formatNoteMoney(cost) });
  const sharesNum = firstNumber(machine, ["shares_held", "shares", "qty", "quantity"]);
  if (sharesNum != null) {
    facts.push({
      label: "Shares",
      value: new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(sharesNum),
    });
  } else {
    const shares = firstString(machine, ["shares_held", "shares", "qty", "quantity"]);
    if (shares) facts.push({ label: "Shares", value: shares });
  }
  const invested = firstNumber(machine, ["invested", "invested_amount"]);
  if (invested != null) facts.push({ label: "Invested", value: formatNoteMoney(invested) });
  const mv = firstNumber(machine, ["market_value", "position_value"]);
  if (mv != null) facts.push({ label: "Market value", value: formatNoteMoney(mv) });
  if (input.modelLabel) facts.push({ label: "Agent", value: String(input.modelLabel) });
  return facts.slice(0, 10);
}

function classifyTitle(title: string): NoteTableKind {
  const t = title.toLowerCase();
  if (SLICE_TITLE.test(t)) return "slice";
  if (SCORECARD_TITLE.test(t)) return "scorecard";
  return "other";
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? new Intl.NumberFormat("en-US").format(value)
      : new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
  }
  return stripMarkdown(stripTags(String(value))).trim();
}

function looksLikeMarkup(value: string): boolean {
  return /<\s*(script|iframe|object|embed|html|svg|img)\b/i.test(value);
}

const HEADER_LABELS = new Set([
  "item",
  "value",
  "tranche",
  "amount",
  "metric",
  "status",
  "check",
  "result",
  "field",
  "label",
]);

function firstRowLooksLikeHeaders(row: string[]): boolean {
  if (row.length < 2) return false;
  if (row.some((cell) => looksNumericCell(cell))) return false;
  const hits = row.filter((cell) => HEADER_LABELS.has(cell.trim().toLowerCase())).length;
  return hits >= 2;
}

function promoteHeaderRow(headers: string[], rows: string[][]): { headers: string[]; rows: string[][] } {
  if (headers.some((h) => h.trim())) return { headers, rows };
  const first = rows[0];
  if (!first || !firstRowLooksLikeHeaders(first)) return { headers, rows };
  return { headers: first, rows: rows.slice(1) };
}

function splitPipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => cellText(c));
}

function parsePipeTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter(Boolean);
  if (lines.length < 2 || !lines[0].includes("|")) return null;
  const headers = splitPipeRow(lines[0]);
  let start = 1;
  if (/^:?-{3,}/.test(lines[1].replace(/\|/g, "").trim()) || /^-{3,}/.test(lines[1].replace(/[|\s]/g, ""))) {
    start = 2;
  }
  const rows = lines.slice(start).filter((ln) => ln.includes("|")).map(splitPipeRow);
  if (!rows.length) return null;
  return { headers, rows };
}

function rowsFromUnknown(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "object" && raw[0] && !Array.isArray(raw[0])) {
    const keys = Object.keys(raw[0] as Record<string, unknown>);
    return (raw as Record<string, unknown>[]).map((row) => keys.map((k) => cellText(row[k])));
  }
  return raw
    .filter(Array.isArray)
    .map((row) => row.map((cell) => cellText(cell)))
    .filter((row) => row.some(Boolean));
}

function headersFromRows(raw: unknown, explicit: unknown): string[] {
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((h) => cellText(h)).filter((h) => !looksLikeMarkup(h));
  }
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && !Array.isArray(raw[0])) {
    return Object.keys(raw[0] as Record<string, unknown>).map((k) => cellText(k));
  }
  return [];
}

function finishTable(
  title: string,
  headers: string[],
  rows: string[][],
  fallbackKind?: NoteTableKind,
): NoteTable | null {
  if (!rows.length) return null;
  if (rows.some((row) => row.some(looksLikeMarkup))) return null;
  const promoted = promoteHeaderRow(headers, rows);
  if (!promoted.rows.length) return null;
  return {
    kind: fallbackKind ?? classifyTitle(title),
    title,
    headers: promoted.headers,
    rows: promoted.rows,
  };
}

function tableFromObject(raw: unknown, fallbackTitle: string, fallbackKind?: NoteTableKind): NoteTable | null {
  const rec = asRecord(raw);
  if (!rec) {
    if (Array.isArray(raw) && raw.length) {
      return finishTable(fallbackTitle, headersFromRows(raw, null), rowsFromUnknown(raw), fallbackKind);
    }
    return null;
  }
  if (String(rec.type ?? "").toLowerCase() === "html") return null;
  const title = cellText(rec.title ?? rec.name ?? rec.caption ?? rec.label) || fallbackTitle;
  const md = typeof rec.markdown === "string" ? rec.markdown : typeof rec.text === "string" ? rec.text : "";
  if (md.includes("|")) {
    const parsed = parsePipeTable(md);
    if (parsed?.rows.length) {
      return finishTable(title, parsed.headers, parsed.rows, fallbackKind);
    }
  }
  const data = rec.rows ?? rec.data ?? rec.body;
  let rows = rowsFromUnknown(data);
  let headers = headersFromRows(data, rec.headers ?? rec.columns);
  if (!rows.length) {
    const kv: string[][] = [];
    for (const [key, val] of Object.entries(rec)) {
      if (["title", "name", "caption", "label", "headers", "columns", "rows", "data", "body", "markdown", "text", "type"].includes(key)) {
        continue;
      }
      if (val && typeof val === "object") continue;
      const value = cellText(val);
      if (!value) continue;
      kv.push([cellText(key), value]);
    }
    if (kv.length >= 2) {
      rows = kv;
      headers = ["Check", "Result"];
    }
  }
  return finishTable(title || fallbackTitle, headers, rows, fallbackKind);
}

function pushUnique(out: NoteTable[], table: NoteTable | null) {
  if (!table) return;
  const sig = `${table.kind}|${table.title}|${table.rows.length}`;
  if (out.some((t) => `${t.kind}|${t.title}|${t.rows.length}` === sig)) return;
  out.push(table);
}

export function machineTables(machine: Record<string, unknown> | null | undefined): NoteTable[] {
  const rec = asRecord(machine);
  if (!rec) return [];
  const out: NoteTable[] = [];
  const tables = rec.tables;
  if (Array.isArray(tables)) {
    tables.forEach((item, i) => pushUnique(out, tableFromObject(item, `Table ${i + 1}`)));
  } else if (asRecord(tables)) {
    for (const [key, val] of Object.entries(asRecord(tables) as Record<string, unknown>)) {
      const kind = SLICE_KEYS.has(key) ? "slice" : SCORECARD_KEYS.has(key) ? "scorecard" : classifyTitle(key);
      pushUnique(out, tableFromObject(val, cellText(key), kind));
    }
  }
  for (const key of SLICE_KEYS) {
    if (key in rec) pushUnique(out, tableFromObject(rec[key], "Slice plan", "slice"));
  }
  for (const key of SCORECARD_KEYS) {
    if (key in rec) pushUnique(out, tableFromObject(rec[key], "Framework scorecard", "scorecard"));
  }
  return out;
}

export function priceComparisonChart(
  machine: Record<string, unknown> | null | undefined,
  evidenceExcerpt?: string | null,
): AllowedChart | null {
  const rec = asRecord(machine) ?? {};
  const close =
    firstNumber(rec, ["current_price", "price", "close"]) ??
    parseNumber(priceFromExcerpt(evidenceExcerpt));
  const cost = firstNumber(rec, ["cost_basis", "cost_per_share", "avg_cost"]);
  const invested = firstNumber(rec, ["invested", "invested_amount"]);
  const market = firstNumber(rec, ["market_value", "position_value"]);
  if (invested != null && market != null) {
    return {
      type: "bar",
      title: "Invested vs market value",
      labels: ["Invested", "Market value"],
      values: [invested, market],
      rows: [],
    };
  }
  if (cost != null && close != null) {
    return {
      type: "bar",
      title: "Cost vs close",
      labels: ["Cost", "Close"],
      values: [cost, close],
      rows: [],
    };
  }
  return null;
}

export function looksNumericCell(text: string): boolean {
  return /^\$?\(?-?[\d,]+(?:\.\d+)?%?\)?$/.test(text.trim());
}
