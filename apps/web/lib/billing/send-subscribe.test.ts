import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sendSubscribeRequestEmail } from "./send-subscribe";

const fields = {
  fullName: "Test User",
  email: "you@example.com",
  familyId: "11111111-1111-4111-8111-111111111111",
  planTitle: "Professional",
  planSlug: "professional",
  priceCents: 4900,
  vpa: "9500005759@idfcfirst",
};

describe("sendSubscribeRequestEmail", () => {
  it("refuses when RESEND_API_KEY is empty", async () => {
    const got = await sendSubscribeRequestEmail(fields, {}, async () => {
      throw new Error("must not call Resend");
    });
    assert.equal(got.ok, false);
  });

  it("posts to Resend for lakshmaneluri@gmail.com without the key in the body", async () => {
    const calls: { body: string; auth: string }[] = [];
    const got = await sendSubscribeRequestEmail(
      fields,
      { RESEND_API_KEY: "re_test" },
      async (_url, init) => {
        const headers = new Headers(init?.headers);
        calls.push({
          body: String(init?.body ?? ""),
          auth: headers.get("Authorization") ?? "",
        });
        return new Response("{}", { status: 200 });
      },
    );
    assert.equal(got.ok, true);
    assert.match(calls[0]?.body ?? "", /lakshmaneluri@gmail.com/);
    assert.match(calls[0]?.body ?? "", /Professional/);
    assert.match(calls[0]?.body ?? "", /\/admin\/accounts/);
    assert.equal((calls[0]?.body ?? "").includes("re_test"), false);
    assert.equal(calls[0]?.auth, "Bearer re_test");
  });
});
