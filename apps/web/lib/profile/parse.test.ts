import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseNumberField, parseOptionalNumber } from "./parse";

describe("parseNumberField", () => {
  it("falls back on empty and below min", () => {
    assert.equal(parseNumberField("", { integer: true, min: 1, fallback: 15 }), 15);
    assert.equal(parseNumberField("10", { integer: true, min: 1, fallback: 15 }), 10);
    assert.equal(parseNumberField("0", { integer: true, min: 1, fallback: 15 }), 15);
    assert.equal(parseOptionalNumber(""), null);
    assert.equal(parseOptionalNumber("18"), 18);
  });
});
