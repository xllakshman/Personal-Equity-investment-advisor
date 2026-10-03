import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isWaitingForActivate, splitAdminAccounts } from "./account-rows";

describe("isWaitingForActivate", () => {
  it("puts a pending Subscribe invoice in waiting even if already subscribed", () => {
    assert.equal(
      isWaitingForActivate({ billingStatus: "subscribed", pendingPlanId: "plan-ultra" }),
      true,
    );
  });

  it("puts Trial signups in waiting", () => {
    assert.equal(
      isWaitingForActivate({ billingStatus: "trial", pendingPlanId: null }),
      true,
    );
  });

  it("puts a row with no family plan in waiting", () => {
    assert.equal(isWaitingForActivate({ billingStatus: "—", pendingPlanId: null }), true);
  });

  it("keeps subscribed and cancelled without a pending invoice as existing", () => {
    assert.equal(
      isWaitingForActivate({ billingStatus: "subscribed", pendingPlanId: null }),
      false,
    );
    assert.equal(
      isWaitingForActivate({ billingStatus: "cancelled", pendingPlanId: null }),
      false,
    );
  });
});

describe("splitAdminAccounts", () => {
  it("keeps each account in only one section", () => {
    const rows = [
      { id: "a", billingStatus: "trial", pendingPlanId: null },
      { id: "b", billingStatus: "subscribed", pendingPlanId: null },
      { id: "c", billingStatus: "subscribed", pendingPlanId: "p1" },
      { id: "d", billingStatus: "cancelled", pendingPlanId: null },
    ];
    const { waiting, existing } = splitAdminAccounts(rows);
    assert.deepEqual(
      waiting.map((r) => r.id),
      ["a", "c"],
    );
    assert.deepEqual(
      existing.map((r) => r.id),
      ["b", "d"],
    );
  });
});
