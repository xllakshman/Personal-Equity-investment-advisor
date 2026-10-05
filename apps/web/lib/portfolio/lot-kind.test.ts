import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  asLotKind,
  missingLotKindColumn,
  omitLotKind,
  parseLotKindField,
  splitByLotKind,
  writeWithOptionalLotKind,
} from "./lot-kind";

describe("asLotKind / parseLotKindField", () => {
  it("defaults blank and unknown display reads to retail", () => {
    assert.equal(asLotKind(null), "retail");
    assert.equal(asLotKind(""), "retail");
    assert.equal(asLotKind("Retail"), "retail");
    assert.equal(asLotKind("ESOP"), "esop");
    assert.equal(asLotKind("esop"), "esop");
    assert.equal(asLotKind("other"), "retail");
  });

  it("rejects invalid form values instead of silently storing them", () => {
    assert.deepEqual(parseLotKindField(""), { ok: true, value: "retail" });
    assert.deepEqual(parseLotKindField("  "), { ok: true, value: "retail" });
    assert.deepEqual(parseLotKindField("esop"), { ok: true, value: "esop" });
    assert.deepEqual(parseLotKindField("RETAIL"), { ok: true, value: "retail" });
    const bad = parseLotKindField("pension");
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.error, /Retail or ESOP/i);
  });
});

describe("splitByLotKind", () => {
  it("keeps Retail and ESOP in separate arrays; empty ESOP is []", () => {
    const rows = [
      { ticker: "MSFT", lot_kind: "retail" as const },
      { ticker: "AAPL", lot_kind: "esop" as const },
      { ticker: "MSFT", lot_kind: "esop" as const },
    ];
    const { retail, esop } = splitByLotKind(rows);
    assert.deepEqual(
      retail.map((r) => r.ticker),
      ["MSFT"],
    );
    assert.deepEqual(
      esop.map((r) => r.ticker),
      ["AAPL", "MSFT"],
    );
    assert.deepEqual(splitByLotKind([{ ticker: "MSFT", lot_kind: "retail" }]).esop, []);
  });
});

describe("missingLotKindColumn", () => {
  it("detects PostgREST / Postgres missing-column errors", () => {
    assert.equal(missingLotKindColumn(null), false);
    assert.equal(
      missingLotKindColumn({
        code: "PGRST204",
        message: "Could not find the 'lot_kind' column of 'holding_lots' in the schema cache",
      }),
      true,
    );
    assert.equal(
      missingLotKindColumn({
        code: "42703",
        message: 'column "lot_kind" does not exist',
      }),
      true,
    );
    assert.equal(
      missingLotKindColumn({ code: "42501", message: "permission denied" }),
      false,
    );
  });
});

describe("writeWithOptionalLotKind", () => {
  it("retries without lot_kind when the column is missing", async () => {
    const calls: unknown[] = [];
    const result = await writeWithOptionalLotKind(
      [{ ticker: "MSFT", lot_kind: "esop" }],
      async (payload) => {
        calls.push(payload);
        if (payload.some((row) => "lot_kind" in row)) {
          return {
            error: {
              code: "PGRST204",
              message: "Could not find the 'lot_kind' column of 'holding_lots'",
            },
          };
        }
        return { error: null };
      },
    );
    assert.equal(result.skippedKind, true);
    assert.equal(result.error, null);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], [{ ticker: "MSFT" }]);
  });

  it("does not retry on a different error", async () => {
    const result = await writeWithOptionalLotKind(
      [{ ticker: "MSFT", lot_kind: "retail" }],
      async () => ({ error: { code: "42501", message: "permission denied" } }),
    );
    assert.equal(result.skippedKind, false);
    assert.equal(result.error?.code, "42501");
  });
});
