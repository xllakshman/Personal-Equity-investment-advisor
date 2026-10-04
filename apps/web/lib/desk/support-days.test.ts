import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSupportDays, SUPPORT_DAYS_DEFAULT } from "./support-days";

describe("parseSupportDays", () => {
  it("defaults empty or invalid input to 3", () => {
    assert.equal(parseSupportDays(null), SUPPORT_DAYS_DEFAULT);
    assert.equal(parseSupportDays(""), SUPPORT_DAYS_DEFAULT);
    assert.equal(parseSupportDays("x"), SUPPORT_DAYS_DEFAULT);
  });

  it("clamps 3–15 and rounds", () => {
    assert.equal(parseSupportDays("3"), 3);
    assert.equal(parseSupportDays("15"), 15);
    assert.equal(parseSupportDays("1"), 3);
    assert.equal(parseSupportDays("99"), 15);
    assert.equal(parseSupportDays("7.6"), 8);
  });
});
