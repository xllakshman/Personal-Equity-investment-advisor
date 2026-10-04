/** Turn LAYER 1 prose into headings/paragraphs. Never keep model HTML. */

import { stripTags } from "./sections";

export type TypesetBlock =
  | { kind: "rule" }
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string };

export type KeyFact = { label: string; value: string };

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

function clean(raw: string): string {
  return stripTags(raw).replace(/\u00a0/g, " ").trim();
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

export function typesetProse(raw: string): TypesetBlock[] {
  const text = clean(raw || "");
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: TypesetBlock[] = [];
  let para: string[] = [];
  let sawTitle = false;

  const flushPara = () => {
    const body = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (body) blocks.push({ kind: "p", text: body });
  };

  for (const original of lines) {
    const line = clean(original);
    if (!line) {
      flushPara();
      continue;
    }
    if (isRule(line)) {
      flushPara();
      if (blocks.at(-1)?.kind !== "rule") blocks.push({ kind: "rule" });
      continue;
    }
    if (isHeading(line)) {
      flushPara();
      const title = line.replace(/^#+\s*/, "").replace(/[·•]+/g, " ").trim();
      blocks.push({ kind: "h2", text: title });
      continue;
    }
    if (!sawTitle && line.length <= 80 && /[A-Za-z]/.test(line) && para.length === 0) {
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
  const ticker = String(machine.ticker ?? input.ticker ?? "").trim();
  if (ticker) facts.push({ label: "Name", value: ticker });
  const rating = String(machine.classification ?? machine.verdict ?? input.verdict ?? "").trim();
  if (rating) facts.push({ label: "Rating", value: rating });
  const price =
    machine.current_price != null
      ? String(machine.current_price)
      : priceFromExcerpt(input.evidenceExcerpt);
  if (price) facts.push({ label: "Price", value: price.startsWith("$") ? price : `$${price}` });
  if (input.createdAt) {
    const d = new Date(input.createdAt);
    if (!Number.isNaN(d.getTime())) {
      facts.push({
        label: "As of",
        value: d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
    }
  }
  if (input.conviction) facts.push({ label: "Conviction", value: String(input.conviction) });
  if (input.modelLabel) facts.push({ label: "Agent", value: String(input.modelLabel) });
  return facts.slice(0, 6);
}

function priceFromExcerpt(excerpt?: string | null): string {
  if (!excerpt) return "";
  const m = excerpt.match(/\$\s?[\d,]+(?:\.\d+)?/);
  return m ? m[0].replace(/\s/g, "") : "";
}
