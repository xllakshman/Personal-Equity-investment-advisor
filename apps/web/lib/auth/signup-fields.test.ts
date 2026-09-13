import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSignupFields, toE164 } from "./signup-fields";

const valid = {
  fullName: "Maya Raghavan",
  taxResidency: "us",
  email: "maya@thesis.demo",
  phoneCc: "+91",
  phoneNational: "9876543210",
  password: "ThesisMaya!2026",
};

describe("toE164", () => {
  it("rejects empty national", () => {
    const got = toE164("+1", "   ");
    assert.equal(got.ok, false);
  });

  it("rejects a code that is not +91 / +1 / +971", () => {
    const got = toE164("+44", "7700900000");
    assert.equal(got.ok, false);
    if (!got.ok) assert.match(got.error, /\+91/);
  });

  it("builds +971", () => {
    const got = toE164("+971", "50 123 4567");
    assert.deepEqual(got, { ok: true, e164: "+971501234567" });
  });
});

describe("parseSignupFields", () => {
  it("accepts a complete form", () => {
    const got = parseSignupFields(valid);
    assert.equal(got.ok, true);
    if (got.ok) {
      assert.equal(got.value.taxResidency, "us");
      assert.equal(got.value.phoneE164, "+919876543210");
    }
  });

  it("rejects empty name", () => {
    const got = parseSignupFields({ ...valid, fullName: "  " });
    assert.equal(got.ok, false);
  });

  it("rejects an invalid tax residency enum", () => {
    const got = parseSignupFields({ ...valid, taxResidency: "uk" });
    assert.equal(got.ok, false);
    if (!got.ok) assert.match(got.error, /NRI/);
  });

  it("rejects 11-character password", () => {
    const got = parseSignupFields({ ...valid, password: "abcdefghijk" });
    assert.equal(got.ok, false);
    if (!got.ok) assert.match(got.error, /12/);
  });

  it("rejects missing email", () => {
    const got = parseSignupFields({ ...valid, email: "" });
    assert.equal(got.ok, false);
  });
});
