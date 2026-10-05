import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { meterCreditSum } from "./usage-meter";
import {
  meterEventsFromUsageRows,
  missingQuantityColumn,
  selectUsageEventsForMeter,
  usageCostCents,
} from "./load-usage-events";

describe("missingQuantityColumn", () => {
  it("detects PostgREST / Postgres missing column, not other errors", () => {
    assert.equal(
      missingQuantityColumn({
        code: "PGRST204",
        message: "Could not find the 'quantity' column of 'usage_events' in the schema cache",
      }),
      true,
    );
    assert.equal(
      missingQuantityColumn({
        code: "42703",
        message: "column usage_events.quantity does not exist",
      }),
      true,
    );
    assert.equal(
      missingQuantityColumn({
        message: "column quantity does not exist",
      }),
      true,
    );
    assert.equal(missingQuantityColumn(null), false);
    assert.equal(
      missingQuantityColumn({ code: "42501", message: "permission denied" }),
      false,
    );
  });
});

describe("selectUsageEventsForMeter", () => {
  it("returns quantity rows when the column exists", async () => {
    const rows = await selectUsageEventsForMeter(async (columns) => {
      assert.match(columns, /quantity/);
      return {
        data: [
          { kind: "search", quantity: 1.5, cost_cents: 10 },
          { kind: "refine", quantity: 1, cost_cents: 2 },
        ],
        error: null,
      };
    });
    assert.equal(meterCreditSum(meterEventsFromUsageRows(rows)), 2.5);
    assert.equal(usageCostCents(rows), 12);
  });

  it("retries without quantity and counts each meter row as 1", async () => {
    const selects: string[] = [];
    const rows = await selectUsageEventsForMeter(async (columns) => {
      selects.push(columns);
      if (columns.includes("quantity")) {
        return {
          data: null,
          error: {
            code: "PGRST204",
            message: "Could not find the 'quantity' column of 'usage_events' in the schema cache",
          },
        };
      }
      return {
        data: [
          { kind: "search", cost_cents: 4 },
          { kind: "refine", cost_cents: 1 },
          { kind: "refine_gate", cost_cents: 0 },
          { kind: "prompt_extract_attempt", cost_cents: 0 },
        ],
        error: null,
      };
    });
    assert.deepEqual(selects, ["kind, quantity, cost_cents", "kind, cost_cents"]);
    assert.equal(rows.every((row) => row.quantity === 1), true);
    assert.equal(meterCreditSum(meterEventsFromUsageRows(rows)), 3);
    assert.equal(usageCostCents(rows), 5);
  });

  it("treats null quantity as 1 without inserting", async () => {
    const rows = await selectUsageEventsForMeter(async () => ({
      data: [{ kind: "search", quantity: null, cost_cents: 0 }],
      error: null,
    }));
    assert.equal(meterCreditSum(meterEventsFromUsageRows(rows)), 1);
  });
});
