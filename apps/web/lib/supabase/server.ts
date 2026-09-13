import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { publicSupabaseEnv } from "./publicEnv";

async function createClientUncached() {
  const { url, anonKey } = publicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component cannot set cookies; session refresh belongs in proxy.ts.
        }
      },
    },
  });
}

/** One Supabase server client per React request. */
export const createClient = cache(createClientUncached);
