import { redirect } from "next/navigation";

/** Optional Auth user. Missing env or no session → null (marketing still renders). */
export async function getOptionalUser() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Desk routes. No session → `/login`. */
export async function requireUser() {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
