import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sendContactEmail } from "./send";
import type { ContactFields } from "./parse";

const fields: ContactFields = {
  fullName: "Test User",
  email: "you@example.com",
  phoneCc: "+91",
  phoneNational: "9500005759",
  phoneE164: "+919500005759",
  message: "Hello",
};

describe("sendContactEmail", () => {
  it("refuses when RESEND_API_KEY is empty", async () => {
    const got = await sendContactEmail(fields, {}, async () => {
      throw new Error("must not call Resend");
    });
    assert.equal(got.ok, false);
    if (!got.ok) {
      assert.match(got.error, /not connected/i);
      assert.equal(got.error.includes("re_"), false);
    }
  });

  it("maps a thrown fetch to a human banner without the key", async () => {
    const got = await sendContactEmail(
      fields,
      { RESEND_API_KEY: "re_test" },
      async () => {
        throw new Error("re_test network down");
      },
    );
    assert.equal(got.ok, false);
    if (!got.ok) {
      assert.equal(got.error.includes("re_test"), false);
      assert.match(got.error, /Try again/);
    }
  });

  it("posts to Resend and does not put the key in the body", async () => {
    const calls: { url: string; body: string; auth: string }[] = [];
    const got = await sendContactEmail(
      fields,
      { RESEND_API_KEY: "re_test", RESEND_FROM: "eqveste <onboarding@resend.dev>" },
      async (url, init) => {
        const headers = new Headers(init?.headers);
        calls.push({
          url: String(url),
          body: String(init?.body ?? ""),
          auth: headers.get("Authorization") ?? "",
        });
        return new Response("{}", { status: 200 });
      },
    );
    assert.equal(got.ok, true);
    assert.equal(calls[0]?.url, "https://api.resend.com/emails");
    assert.match(calls[0]?.body ?? "", /lakshmaneluri@gmail.com/);
    assert.match(calls[0]?.body ?? "", /you@example.com/);
    assert.equal((calls[0]?.body ?? "").includes("re_test"), false);
    assert.equal(calls[0]?.auth, "Bearer re_test");
  });

  it("maps a Resend error to a human banner", async () => {
    const got = await sendContactEmail(
      fields,
      { RESEND_API_KEY: "re_test" },
      async () => new Response("nope", { status: 403 }),
    );
    assert.equal(got.ok, false);
    if (!got.ok) assert.equal(got.error.includes("re_test"), false);
  });
});
