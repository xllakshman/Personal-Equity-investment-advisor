import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESK_NAV, isDeskPath } from "./nav";

describe("DESK_NAV", () => {
  it("has exactly the six mock desk items and no Admin", () => {
    assert.equal(DESK_NAV.length, 6);
    assert.deepEqual(
      DESK_NAV.map((n) => n.label),
      [
        "Desk",
        "New analysis",
        "Portfolio",
        "Reports",
        "Usage",
        "Plans & wallet",
      ],
    );
    assert.equal(
      DESK_NAV.some((n) => /admin|handoff/i.test(n.label)),
      false,
    );
  });
});

describe("isDeskPath", () => {
  it("matches desk routes only", () => {
    assert.equal(isDeskPath("/desk"), true);
    assert.equal(isDeskPath("/analyse"), true);
    assert.equal(isDeskPath("/login"), false);
    assert.equal(isDeskPath("/admin/login"), false);
  });
});
