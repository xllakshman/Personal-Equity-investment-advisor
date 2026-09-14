import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { usageCaption } from "./format";
import type { UsageSnapshot } from "./types";

function snap(over: Partial<UsageSnapshot> = {}): UsageSnapshot {
  return {
    used: 1,
    limit: 20,
    planName: "Professional",
    planSlug: "professional",
    walletCents: 0,
    costCents: 150,
    notices: [],
    exhausted: false,
    ...over,
  };
}

describe("usageCaption", () => {
  it("matches thesis_family_meter_count display 1 / 20", () => {
    assert.equal(usageCaption(snap()), "1 / 20");
  });

  it("handles missing limit", () => {
    assert.equal(usageCaption(snap({ limit: null, used: 3 })), "3 searches this cycle");
  });
});
