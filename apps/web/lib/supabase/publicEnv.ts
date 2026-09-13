/** Public Supabase env for Next. Anon key only — never the service role. */

const SERVICE_PUBLIC_RE = /^NEXT_PUBLIC_.*SERVICE/i;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export function publicSupabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): PublicSupabaseEnv {
  for (const key of Object.keys(env)) {
    if (SERVICE_PUBLIC_RE.test(key) && env[key]) {
      throw new Error(
        `${key} must not be set. The browser may only receive NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
      );
    }
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}
