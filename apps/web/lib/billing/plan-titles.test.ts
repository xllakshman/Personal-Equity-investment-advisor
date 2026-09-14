import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planCardTitle } from "./plan-titles";

describe("planCardTitle", () => {
  it("maps premium to Professional + and ultra to Ultra", () => {
    assert.equal(planCardTitle("premium", "Premium"), "Professional +");
    assert.equal(planCardTitle("ultra", "Ultra Premium"), "Ultra");
    assert.equal(planCardTitle("professional", "Professional"), "Professional");
    assert.equal(planCardTitle("trial", "Free trial"), "Trial");
  });
});
