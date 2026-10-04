import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keyFacts, typesetProse } from "./typeset";

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
});
