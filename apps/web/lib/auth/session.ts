import { redirect } from "next/navigation";

import { unsignedVisitorHref } from "@/lib/auth/paths";

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

/** Desk routes. No session → marketing home. */
export async function requireUser() {
  const user = await getOptionalUser();
  if (!user) {
    redirect(unsignedVisitorHref());
  }
  return user;
}
