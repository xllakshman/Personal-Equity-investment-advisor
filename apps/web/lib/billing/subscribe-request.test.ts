import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSubscribePlanId, subscribeNotice } from "./subscribe-request";

describe("parseSubscribePlanId", () => {
  it("accepts a uuid", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.deepEqual(parseSubscribePlanId(id), { ok: true, value: { planId: id } });
  });

  it("rejects empty and junk", () => {
    assert.equal(parseSubscribePlanId("").ok, false);
    assert.equal(parseSubscribePlanId("professional").ok, false);
  });
});

describe("subscribeNotice", () => {
  it("keeps the current plan until Activate and names the UPI VPA", () => {
    const mailed = subscribeNotice({
      planTitle: "Professional",
      priceCents: 4900,
      vpa: "9500005759@idfcfirst",
      mailed: true,
    });
    assert.match(mailed, /Professional/);
    assert.match(mailed, /\$49/);
    assert.match(mailed, /9500005759@idfcfirst/);
    assert.match(mailed, /current plan stays/);
    const silent = subscribeNotice({
      planTitle: "Basic",
      priceCents: 1900,
      vpa: "9500005759@idfcfirst",
      mailed: false,
    });
    assert.match(silent, /could not email/i);
    assert.match(silent, /Admin → Accounts/);
  });
});
