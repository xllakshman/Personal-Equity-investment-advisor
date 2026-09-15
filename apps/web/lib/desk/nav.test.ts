import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESK_NAV, isDeskPath } from "./nav";

describe("DESK_NAV", () => {
  it("has Home, Analyse a Stock, combined Subscription, and no Admin", () => {
    assert.equal(DESK_NAV.length, 7);
    assert.deepEqual(
      DESK_NAV.map((n) => n.label),
      [
        "Home",
        "Analyse a Stock",
        "Portfolio",
        "Reports",
        "Managers",
        "Subscription",
        "Contact us",
      ],
    );
    assert.equal(
      DESK_NAV.filter((n) => n.href === "/contact").length,
      1,
    );
    assert.equal(
      DESK_NAV.some((n) => /admin|handoff|usage|plans & wallet/i.test(n.label)),
      false,
    );
    assert.equal(
      DESK_NAV.filter((n) => n.href === "/billing").length,
      1,
    );
  });
});

describe("isDeskPath", () => {
  it("matches desk routes only", () => {
    assert.equal(isDeskPath("/desk"), true);
    assert.equal(isDeskPath("/analyse"), true);
    assert.equal(isDeskPath("/analyse/00000000-0000-4000-8000-000000000000"), true);
    assert.equal(isDeskPath("/research/managers"), true);
    assert.equal(isDeskPath("/settings/crash-letter"), true);
    assert.equal(isDeskPath("/usage"), true);
    assert.equal(isDeskPath("/subscription"), true);
    assert.equal(isDeskPath("/contact"), true);
    assert.equal(isDeskPath("/login"), false);
    assert.equal(isDeskPath("/admin/login"), false);
  });
});
