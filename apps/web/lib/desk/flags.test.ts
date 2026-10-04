import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deskFlags } from "./flags";

describe("deskFlags", () => {
  it("stays quiet when names are under the cap and cash is unknown", () => {
    const names = ["MSFT", "GOOG", "TSM", "UNH", "BRK.B"].map((ticker) => ({
      ticker,
      weightPct: 12,
    }));
    assert.deepEqual(
      deskFlags({
        costBasis: 35000,
        cash: null,
        cashMinPct: 10,
        concentrationCapPct: 15,
        holdings: names,
      }),
      [],
    );
  });

  it("flags a name above the concentration cap using cost×qty weight", () => {
    const got = deskFlags({
      costBasis: 1000,
      cash: null,
      cashMinPct: 10,
      concentrationCapPct: 15,
      holdings: [
        { ticker: "MSFT", weightPct: 40 },
        { ticker: "GOOG", weightPct: 60 },
      ],
    });
    assert.equal(got.length, 1);
    assert.equal(got[0]?.kind, "concentration");
    assert.match(got[0]?.text ?? "", /too large/i);
    assert.equal(got.some((f) => /max.position|over-divers/i.test(f.text)), false);
  });

  it("flags cash below the profile minimum when cash is known", () => {
    const low = deskFlags({
      costBasis: 900,
      cash: 0,
      cashMinPct: 10,
      concentrationCapPct: 15,
      holdings: [{ ticker: "MSFT", weightPct: 100 }],
    });
    assert.equal(low.some((f) => f.kind === "cash"), true);
    const ok = deskFlags({
      costBasis: 900,
      cash: 200,
      cashMinPct: 10,
      concentrationCapPct: 15,
      holdings: [{ ticker: "MSFT", weightPct: 10 }],
    });
    assert.equal(ok.some((f) => f.kind === "cash"), false);
  });

  it("does not invent a cash flag when cash was never entered", () => {
    const got = deskFlags({
      costBasis: 1000,
      cash: null,
      cashMinPct: 10,
      concentrationCapPct: 15,
      holdings: [{ ticker: "MSFT", weightPct: 10 }],
    });
    assert.equal(got.some((f) => f.kind === "cash"), false);
  });
});
