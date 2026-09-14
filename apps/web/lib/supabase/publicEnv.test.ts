import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicSupabaseEnv } from "./publicEnv";

describe("publicSupabaseEnv", () => {
  it("returns url and anon when both are set", () => {
    const got = publicSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://cmksomahsfmsjufakryw.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test",
    } as unknown as NodeJS.ProcessEnv);
    assert.equal(got.url, "https://cmksomahsfmsjufakryw.supabase.co");
    assert.equal(got.anonKey, "anon-test");
  });

  it("throws when anon is missing", () => {
    assert.throws(
      () =>
        publicSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        } as unknown as NodeJS.ProcessEnv),
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("throws when a service-role key is exposed as NEXT_PUBLIC_", () => {
    assert.throws(
      () =>
        publicSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test",
          NEXT_PUBLIC_SUPABASE_SERVICE_KEY: "service-must-not-leak",
        } as unknown as NodeJS.ProcessEnv),
      /must not be set/,
    );
  });
});
