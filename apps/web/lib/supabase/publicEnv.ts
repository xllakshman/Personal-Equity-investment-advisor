/** Public Supabase env for Next. Anon key only — never the service role. */

const SERVICE_PUBLIC_RE = /^NEXT_PUBLIC_.*SERVICE/i;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

// Next.js inlines NEXT_PUBLIC_* only on static `process.env.NAME` reads.
// Do not default-arg `process.env` as a bag — that object is empty in the
// browser bundle, so Google OAuth threw Missing NEXT_PUBLIC_* while the
// email/password server action still worked.
const INLINE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const INLINE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function publicSupabaseEnv(
  env?: NodeJS.ProcessEnv,
): PublicSupabaseEnv {
  const bag = env ?? process.env;
  for (const key of Object.keys(bag)) {
    if (SERVICE_PUBLIC_RE.test(key) && bag[key]) {
      throw new Error(
        `${key} must not be set. The browser may only receive NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
      );
    }
  }

  const url = (env?.NEXT_PUBLIC_SUPABASE_URL ?? INLINE_URL)?.trim();
  const anonKey = (env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? INLINE_ANON)?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}
