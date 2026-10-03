import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseAcceptError } from "./errors";

describe("parseAcceptError", () => {
  it("maps THS-RISK-001", () => {
    assert.match(
      parseAcceptError("THS-RISK-001 risk/CAGR pair cannot exist"),
      /Incompatible pair/,
    );
  });

  it("maps THS-QUOTA-001", () => {
    assert.match(
      parseAcceptError("THS-QUOTA-001 allowance exhausted for this cycle"),
      /used this month/,
    );
  });

  it("maps THS-TICKER-001 and THS-HOLDING-001 without a queued row", () => {
    const empty = parseAcceptError("THS-TICKER-001 ticker is required");
    assert.match(empty, /Enter a ticker/);
    assert.match(empty, /No analysis was counted/);
    const oldGate = parseAcceptError(
      "THS-HOLDING-001 ticker is not on holdings for this family",
    );
    assert.match(oldGate, /021/);
    assert.match(oldGate, /No analysis was counted/);
  });

  it("maps THS-AUTH-001 for viewers", () => {
    assert.match(
      parseAcceptError("THS-AUTH-001 no writable family"),
      /Viewers can read notes/,
    );
  });

  it("maps THS-LENS-001, empty, and unknown messages", () => {
    assert.match(parseAcceptError("THS-LENS-001"), /at least one check/);
    assert.match(parseAcceptError("THS-BUSY-001"), /already running/);
    assert.equal(parseAcceptError(""), "Could not queue the analysis.");
    assert.equal(parseAcceptError("nope"), "Could not queue the analysis.");
  });
});
