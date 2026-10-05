import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectHoldingsRows } from "./load";

describe("selectHoldingsRows", () => {
  it("reads lot_kind when the column exists", async () => {
    const got = await selectHoldingsRows(async () => ({
      data: [
        {
          ticker: "MSFT",
          company_name: "Microsoft",
          exchange: "NASDAQ",
          qty: 2,
          cost_per_share: 400,
          native_currency: "USD",
          lot_count: 1,
          lot_kind: "esop",
        },
      ],
      error: null,
    }));
    assert.equal(got.lotKindColumnPresent, true);
    assert.equal(got.rows[0]?.lot_kind, "esop");
  });

  it("retries without lot_kind and treats rows as retail when the column is missing", async () => {
    const columns: string[] = [];
    const got = await selectHoldingsRows(async (cols) => {
      columns.push(cols);
      if (cols.includes("lot_kind")) {
        return {
          data: null,
          error: {
            code: "PGRST204",
            message: "Could not find the 'lot_kind' column of 'holdings' in the schema cache",
          },
        };
      }
      return {
        data: [
          {
            ticker: "AAPL",
            company_name: "Apple",
            exchange: "NASDAQ",
            qty: 1,
            cost_per_share: 100,
            native_currency: "USD",
            lot_count: 1,
          },
        ],
        error: null,
      };
    });
    assert.equal(got.lotKindColumnPresent, false);
    assert.equal(got.rows.length, 1);
    assert.equal(got.rows[0]?.ticker, "AAPL");
    assert.equal(got.rows[0]?.lot_kind, "retail");
    assert.equal(columns[0]?.includes("lot_kind"), true);
    assert.equal(columns[1]?.includes("lot_kind"), false);
  });
});
