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

  it("maps THS-HOLDING-001 and does not mention a queued row", () => {
    const msg = parseAcceptError(
      "THS-HOLDING-001 ticker is not on holdings for this family",
    );
    assert.match(msg, /not in your portfolio/);
    assert.match(msg, /No analysis was counted/);
  });

  it("maps THS-LENS-001, empty, and unknown messages", () => {
    assert.match(parseAcceptError("THS-LENS-001"), /at least one check/);
    assert.equal(parseAcceptError(""), "Could not queue the analysis.");
    assert.equal(parseAcceptError("nope"), "Could not queue the analysis.");
  });
});
