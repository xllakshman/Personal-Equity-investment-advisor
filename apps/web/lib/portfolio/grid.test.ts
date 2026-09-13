import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { holdingsForDisplay, type HoldingGridRow } from "./grid";

describe("holdingsForDisplay", () => {
  it("weights from converted cost×qty and keeps native cost on the row", () => {
    const rows: HoldingGridRow[] = [
      {
        ticker: "MSFT",
        company_name: "Microsoft",
        exchange: "NASDAQ",
        qty: 2,
        cost_per_share: 10,
        native_currency: "USD",
        lot_count: 2,
      },
      {
        ticker: "TSM",
        company_name: "TSMC",
        exchange: "NYSE",
        qty: 1,
        cost_per_share: 5,
        native_currency: "USD",
        lot_count: 1,
      },
    ];
    const shown = holdingsForDisplay(rows, "INR", 80);
    assert.equal(shown[0].lot_count, 2);
    assert.equal(shown[0].cost_per_share, 10);
    assert.equal(shown[0].displayCost, 800);
    assert.equal(shown[0].displayValue, 1600);
    assert.equal(shown[1].displayValue, 400);
    assert.equal(shown[0].weightPct, 80);
    assert.equal(shown[1].weightPct, 20);
  });

  it("empty book has zero weights", () => {
    assert.deepEqual(holdingsForDisplay([], "USD", 88.4), []);
  });
});
