import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { outsideBookFromForm, parseNumberField, parseOptionalNumber } from "./parse";

describe("parseNumberField", () => {
  it("falls back on empty and below min", () => {
    assert.equal(parseNumberField("", { integer: true, min: 1, fallback: 15 }), 15);
    assert.equal(parseNumberField("10", { integer: true, min: 1, fallback: 15 }), 10);
    assert.equal(parseNumberField("0", { integer: true, min: 1, fallback: 15 }), 15);
    assert.equal(parseOptionalNumber(""), null);
    assert.equal(parseOptionalNumber("18"), 18);
  });

  it("profile outside cash empty is unset; 0 is stored 0", () => {
    const empty = new FormData();
    empty.set("outside_cash", "");
    assert.equal(outsideBookFromForm(empty).cash, null);
    const zero = new FormData();
    zero.set("outside_cash", "0");
    assert.equal(outsideBookFromForm(zero).cash, 0);
    const cash = new FormData();
    cash.set("outside_cash", "25000");
    assert.equal(outsideBookFromForm(cash).cash, 25000);
  });
});
