import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { usageBarPct, usageCaption, planChipLabel, planStatusLabel } from "./format";
import type { UsageSnapshot } from "./types";

function snap(over: Partial<UsageSnapshot> = {}): UsageSnapshot {
  return {
    used: 1,
    limit: 20,
    planName: "Professional",
    planSlug: "professional",
    billingStatus: "subscribed",
    walletCents: 0,
    costCents: 150,
    notices: [],
    exhausted: false,
    ...over,
  };
}

describe("usageCaption", () => {
  it("shows used of limit in plain English", () => {
    assert.equal(usageCaption(snap()), "1 of 20");
  });

  it("handles missing limit", () => {
    assert.equal(usageCaption(snap({ limit: null, used: 3 })), "3 analyses this month");
  });
});

describe("usageBarPct", () => {
  it("caps at 100 and uses 8 when unlimited", () => {
    assert.equal(usageBarPct(2, 20), 10);
    assert.equal(usageBarPct(50, 20), 100);
    assert.equal(usageBarPct(9, null), 8);
  });
});

describe("planStatusLabel", () => {
  it("names subscribed as Active and quota as Allowance used", () => {
    assert.equal(planStatusLabel("subscribed", false), "Active");
    assert.equal(planStatusLabel("trial", false), "Trial");
    assert.equal(planStatusLabel("subscribed", true), "Allowance used");
    assert.equal(
      planChipLabel(snap()),
      "Professional",
    );
    assert.equal(
      planChipLabel(snap({ planName: "Trial", billingStatus: "trial" })),
      "Trial",
    );
    assert.equal(
      planChipLabel(snap({ exhausted: true })),
      "Professional · Allowance used",
    );
  });
});
