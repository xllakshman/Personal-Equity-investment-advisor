import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allocationWeights,
  costBasisNative,
  lastCheckedLabel,
} from "./home-math";

describe("costBasisNative", () => {
  it("sums qty × last cost, not a live price", () => {
    const rows = [
      {
        ticker: "MSFT",
        company_name: "Microsoft",
        qty: 2,
        cost_per_share: 10,
        native_currency: "USD",
        last_checked_at: null,
      },
      {
        ticker: "TSM",
        company_name: null,
        qty: 1,
        cost_per_share: 5,
        native_currency: "USD",
        last_checked_at: null,
      },
    ];
    assert.equal(costBasisNative(rows), 25);
    assert.deepEqual(allocationWeights(rows), [
      { ticker: "MSFT", pct: 80 },
      { ticker: "TSM", pct: 20 },
    ]);
  });

  it("handles empty book", () => {
    assert.equal(costBasisNative([]), 0);
  });
});

describe("lastCheckedLabel", () => {
  it("says never when there is no report", () => {
    assert.equal(lastCheckedLabel(null), "never");
  });
});
