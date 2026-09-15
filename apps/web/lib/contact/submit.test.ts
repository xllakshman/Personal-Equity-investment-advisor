import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EMPTY_CONTACT_STATE } from "./parse";
import { submitContact } from "./submit";

describe("submitContact", () => {
  it("returns a field error without calling mail when name is empty", async () => {
    const form = new FormData();
    form.set("fullName", "");
    form.set("email", "you@example.com");
    form.set("phoneCc", "+91");
    form.set("phoneNational", "9500005759");
    form.set("message", "Hello");
    const got = await submitContact(EMPTY_CONTACT_STATE, form);
    assert.equal(got.notice, null);
    assert.match(got.error ?? "", /name/i);
  });
});
