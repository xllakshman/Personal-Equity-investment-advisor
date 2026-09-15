import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clarificationsPayload,
  parseAcceptFields,
  validateAcceptFields,
} from "./accept-fields";

function form(entries: Record<string, string | string[]>): {
  get: (name: string) => string | null;
  getAll: (name: string) => string[];
} {
  return {
    get(name) {
      const v = entries[name];
      if (Array.isArray(v)) return v[0] ?? null;
      return v ?? null;
    },
    getAll(name) {
      const v = entries[name];
      if (v == null) return [];
      return Array.isArray(v) ? v : [v];
    },
  };
}

const ok = {
  ticker: "msft",
  lenses: ["fundamental", "technical"],
  intent: "long_term",
  avg_down: "single_entry",
  risk: "high_21_35",
  cagr: "medium_13_18",
  tax_residency: "us",
  model_id: "opus5",
};

describe("accept field guards", () => {
  it("rejects empty ticker before RPC", () => {
    const fields = parseAcceptFields(form({ ...ok, ticker: "  " }));
    assert.equal(fields.ticker, "");
    assert.match(validateAcceptFields(fields) ?? "", /not in your portfolio/);
  });

  it("rejects invalid enums and unknown lenses", () => {
    const bad = parseAcceptFields(
      form({ ...ok, intent: "day_trade", lenses: ["vibes", "fundamental"] }),
    );
    assert.deepEqual(bad.lenses, ["fundamental"]);
    assert.equal(validateAcceptFields(bad), "Invalid builder fields.");
  });

  it("rejects zero lenses", () => {
    const fields = parseAcceptFields(form({ ...ok, lenses: [] }));
    assert.equal(validateAcceptFields(fields), "Pick at least one check.");
  });

  it("stores {} when Skip is used and three keys when filled", () => {
    assert.deepEqual(clarificationsPayload(true, "a", "b", "c"), {});
    assert.deepEqual(clarificationsPayload(false, "a", "b", "c"), {
      conviction: "a",
      addFunds: "b",
      exitRule: "c",
    });
  });
});
