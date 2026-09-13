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

  it("handles empty book, NaN qty, and a bad last-checked timestamp", () => {
    assert.equal(costBasisNative([]), 0);
    assert.equal(
      costBasisNative([
        {
          ticker: "MSFT",
          company_name: null,
          qty: Number.NaN,
          cost_per_share: 403,
          native_currency: "USD",
          last_checked_at: null,
        },
      ]),
      0,
    );
    assert.deepEqual(
      allocationWeights([
        {
          ticker: "CASH",
          company_name: null,
          qty: 0,
          cost_per_share: 0,
          native_currency: "USD",
          last_checked_at: null,
        },
      ]),
      [{ ticker: "CASH", pct: 0 }],
    );
    assert.equal(lastCheckedLabel("not-a-date"), "never");
  });
});

describe("lastCheckedLabel", () => {
  it("says never when there is no report", () => {
    assert.equal(lastCheckedLabel(null), "never");
  });
});
