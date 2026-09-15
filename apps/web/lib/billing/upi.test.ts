import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PAYMENT_METHODS, UPI_VPA } from "./upi";

describe("UPI payment slot", () => {
  it("shows the named VPA and keeps cards disabled", () => {
    assert.equal(UPI_VPA, "9500005759@idfcfirst");
    assert.equal(PAYMENT_METHODS.find((m) => m.id === "upi")?.available, true);
    assert.equal(PAYMENT_METHODS.find((m) => m.id === "credit")?.available, false);
    assert.equal(PAYMENT_METHODS.find((m) => m.id === "debit")?.available, false);
  });
});
