import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTACT_INBOX,
  CONTACT_SUCCESS,
  EMPTY_CONTACT_STATE,
  parseContactFields,
} from "./parse";

const ok = {
  fullName: "Lakshman Yeluri",
  email: "you@example.com",
  phoneCc: "+91",
  phoneNational: "9500005759",
  message: "How do I add my book?",
};

describe("parseContactFields", () => {
  it("accepts a complete form", () => {
    const got = parseContactFields(ok);
    assert.equal(got.ok, true);
    if (got.ok) {
      assert.equal(got.value.phoneE164, "+919500005759");
      assert.equal(got.value.email, "you@example.com");
    }
  });

  it("rejects empty name, email, and message", () => {
    assert.equal(parseContactFields({ ...ok, fullName: "" }).ok, false);
    assert.equal(parseContactFields({ ...ok, email: "nope" }).ok, false);
    assert.equal(parseContactFields({ ...ok, message: "  " }).ok, false);
  });

  it("rejects a country code outside +91 / +1 / +971", () => {
    const got = parseContactFields({ ...ok, phoneCc: "+44" });
    assert.equal(got.ok, false);
  });

  it("keeps inbox and success copy human", () => {
    assert.equal(CONTACT_INBOX, "lakshmaneluri@gmail.com");
    assert.equal(
      CONTACT_SUCCESS,
      "Thank you for submitting a request. We’ll get back to you within 24–48 hours.",
    );
    assert.deepEqual(EMPTY_CONTACT_STATE, { error: null, notice: null });
  });
});
