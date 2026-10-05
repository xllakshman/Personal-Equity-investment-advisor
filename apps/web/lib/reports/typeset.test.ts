import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCharts } from "./charts";
import {
  extractMachineJson,
  keyFacts,
  machineFrom,
  machineTables,
  priceComparisonChart,
  stripMachineReadable,
  stripMarkdown,
  typesetProse,
} from "./typeset";

const LLY_MACHINE = {
  ticker: "LLY",
  classification: "HOLD",
  price: 825.4,
  cost_per_share: 710,
  shares_held: 12,
  invested_amount: 8520,
  market_value: 9904.8,
  tables: [
    {
      title: "Slice plan",
      type: "table",
      rows: [
        ["Tranche", "Amount"],
        ["Tranche 1", "35%"],
        ["Tranche 2", "25%"],
      ],
    },
    {
      title: "Framework 1 scorecard",
      type: "table",
      rows: [
        ["Metric", "Status"],
        ["ROIC", "Pass"],
        ["Moat", "Narrow"],
      ],
    },
  ],
};

const LLY_PROSE = [
  "LAYER 1 — PLAIN LANGUAGE",
  "THE BOTTOM LINE",
  "**HOLD.** Keep the name. *Tranche 1* waits.",
  "WHAT THIS COMPANY DOES",
  "Eli Lilly sells medicines.",
  "MACHINE-READABLE BLOCK",
  JSON.stringify(LLY_MACHINE),
  "END OF ANALYSIS",
].join("\n");

describe("typesetProse", () => {
  it("splits LAYER 1 headings and drops script tags", () => {
    const blocks = typesetProse(
      "LAYER 1  —  PLAIN LANGUAGE\nTHE BOTTOM LINE\nMeta at $728 is fairly valued.\n<script>alert(1)</script>\nWHAT THIS COMPANY DOES\nAds on Facebook.",
    );
    const kinds = blocks.map((b) => b.kind);
    assert.ok(kinds.includes("h2"));
    const texts = blocks.map((b) => ("text" in b ? b.text : "")).join(" ");
    assert.ok(texts.includes("THE BOTTOM LINE"));
    assert.ok(texts.includes("Meta at $728"));
    assert.equal(texts.includes("<script>"), false);
    assert.equal(texts.includes("alert(1)"), true);
  });

  it("returns empty for blank and treats rules as rules", () => {
    assert.deepEqual(typesetProse(""), []);
    assert.deepEqual(typesetProse("   "), []);
    const blocks = typesetProse("========\nMETA\n========\nBody copy here.");
    assert.equal(blocks[0]?.kind, "rule");
    assert.ok(blocks.some((b) => b.kind === "h1" && b.text === "META"));
    assert.ok(blocks.some((b) => b.kind === "p" && b.text.includes("Body copy")));
  });

  it("keeps a one-line seed sentence as body, not a title", () => {
    const blocks = typesetProse("Synthetic Maya seed — not a live underwrite.");
    assert.ok(blocks.some((b) => b.kind === "p" && b.text.includes("Synthetic Maya seed")));
    assert.equal(blocks.some((b) => b.kind === "h1"), false);
  });

  it("hides MACHINE-READABLE heading and trailing ticker JSON", () => {
    const blocks = typesetProse(LLY_PROSE);
    const blob = blocks.map((b) => ("text" in b ? b.text : "")).join("\n");
    assert.equal(/MACHINE-READABLE/i.test(blob), false);
    assert.equal(blob.includes('{"ticker"'), false);
    assert.equal(blob.includes('"shares_held"'), false);
    assert.ok(blob.includes("Keep the name"));
  });

  it("strips leftover markdown markers from displayed prose", () => {
    assert.equal(stripMarkdown("**HOLD.**"), "HOLD.");
    assert.equal(stripMarkdown("*Tranche 1*"), "Tranche 1");
    const blocks = typesetProse("THE BOTTOM LINE\n**HOLD.** Keep the name.\n*Tranche 1* waits.");
    const blob = blocks.map((b) => ("text" in b ? b.text : "")).join(" ");
    assert.equal(blob.includes("**"), false);
    assert.equal(blob.includes("*Tranche"), false);
    assert.ok(blob.includes("HOLD."));
    assert.ok(blob.includes("Tranche 1"));
  });
});

describe("stripMachineReadable", () => {
  it("drops the marker plus JSON and keeps the note", () => {
    const out = stripMachineReadable("Hold the name.\nMACHINE-READABLE BLOCK\n" + JSON.stringify({ ticker: "LLY" }));
    assert.ok(out.includes("Hold the name."));
    assert.equal(/MACHINE-READABLE/i.test(out), false);
    assert.equal(out.includes('"ticker"'), false);
  });
});

describe("keyFacts", () => {
  it("prefers machine price and formats the date", () => {
    const facts = keyFacts({
      ticker: "META",
      verdict: "Hold",
      createdAt: "2026-10-04T06:15:00.000Z",
      machine: { ticker: "META", classification: "HOLD", current_price: "728.08" },
    });
    assert.deepEqual(
      facts.map((f) => f.label),
      ["Name", "Rating", "Price", "As of"],
    );
    assert.equal(facts[2]?.value, "$728.08");
  });

  it("falls back to evidence excerpt and skips empty", () => {
    const facts = keyFacts({
      ticker: "AAPL",
      verdict: "Hold",
      evidenceExcerpt: "Previous close $210.02 on NASDAQ",
    });
    assert.ok(facts.some((f) => f.label === "Price" && f.value.includes("210.02")));
  });

  it("reads LLY aliases price, cost_per_share, shares_held, invested_amount, market_value", () => {
    const facts = keyFacts({
      ticker: "LLY",
      verdict: "Hold",
      machine: LLY_MACHINE,
    });
    const byLabel = Object.fromEntries(facts.map((f) => [f.label, f.value]));
    assert.equal(byLabel.Price, "$825.40");
    assert.equal(byLabel.Cost, "$710.00");
    assert.equal(byLabel.Shares, "12");
    assert.equal(byLabel.Invested, "$8,520");
    assert.equal(byLabel["Market value"], "$9,904.80");
  });
});

describe("machineTables", () => {
  it("promotes Item/Value and Tranche/Amount first rows and classifies slice + scorecard", () => {
    const tables = machineTables(LLY_MACHINE);
    assert.equal(tables.length, 2);
    const slice = tables.find((t) => t.kind === "slice");
    const score = tables.find((t) => t.kind === "scorecard");
    assert.ok(slice);
    assert.deepEqual(slice?.headers, ["Tranche", "Amount"]);
    assert.deepEqual(slice?.rows[0], ["Tranche 1", "35%"]);
    assert.ok(score);
    assert.deepEqual(score?.headers, ["Metric", "Status"]);
    assert.deepEqual(score?.rows[0], ["ROIC", "Pass"]);
  });

  it("returns empty for missing machine and drops html tables", () => {
    assert.deepEqual(machineTables(null), []);
    assert.deepEqual(machineTables({}), []);
    assert.deepEqual(machineTables({ tables: [{ type: "html", rows: [["a", "b"]] }] }), []);
  });
});

describe("priceComparisonChart", () => {
  it("builds invested vs market when both exist", () => {
    const chart = priceComparisonChart(LLY_MACHINE);
    assert.equal(chart?.type, "bar");
    assert.equal(chart?.title, "Invested vs market value");
    assert.deepEqual(chart?.labels, ["Invested", "Market value"]);
    assert.deepEqual(chart?.values, [8520, 9904.8]);
  });

  it("falls back to cost vs close and returns null without a pair", () => {
    const chart = priceComparisonChart({ cost_per_share: 10, price: 12 });
    assert.equal(chart?.title, "Cost vs close");
    assert.deepEqual(chart?.values, [10, 12]);
    assert.equal(priceComparisonChart({}), null);
    assert.equal(priceComparisonChart(null), null);
  });
});

describe("parseCharts + machineFrom fallback", () => {
  it("drops type=html and empty charts object", () => {
    assert.deepEqual(parseCharts({}).charts, []);
    const { charts, dropped } = parseCharts({
      evil: { type: "html", html: "<script>alert(1)</script>" },
    });
    assert.equal(charts.length, 0);
    assert.ok(dropped.includes("html"));
  });

  it("parses MACHINE-READABLE JSON in memory when sections.machine is empty", () => {
    assert.equal(machineFrom({ machine: {} }), null);
    const fromProse = machineFrom({ plain_language: LLY_PROSE, machine: {} });
    assert.equal(fromProse?.ticker, "LLY");
    assert.equal(fromProse?.shares_held, 12);
    const extracted = extractMachineJson(LLY_PROSE);
    assert.equal(extracted?.ticker, "LLY");
  });
});
