import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEntryTranches, trancheSummary } from "./tranches";

function form(pairs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(pairs)) f.set(k, v);
  return f;
}

describe("parseEntryTranches", () => {
  it("reads T1–T4", () => {
    const parsed = parseEntryTranches(
      form({
        tranche_t1_pct: "35",
        tranche_t2_pct: "25",
        tranche_t3_pct: "25",
        tranche_t4_pct: "15",
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.tranche_t1_pct, 35);
    assert.equal(
      trancheSummary(parsed.value),
      "T1 35% · T2 25% · T3 25% · T4 15%",
    );
  });

  it("rejects empty, over 100, and negative", () => {
    assert.equal(parseEntryTranches(form({})).ok, false);
    assert.equal(
      parseEntryTranches(
        form({
          tranche_t1_pct: "101",
          tranche_t2_pct: "0",
          tranche_t3_pct: "0",
          tranche_t4_pct: "0",
        }),
      ).ok,
      false,
    );
    assert.equal(
      parseEntryTranches(
        form({
          tranche_t1_pct: "-1",
          tranche_t2_pct: "25",
          tranche_t3_pct: "25",
          tranche_t4_pct: "51",
        }),
      ).ok,
      false,
    );
  });
});
