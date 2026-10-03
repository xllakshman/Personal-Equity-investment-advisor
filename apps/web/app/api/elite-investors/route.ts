import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth/session";
import { loadPersistedSnapshot } from "@/lib/research/elite-store";
import { createClient } from "@/lib/supabase/server";

/** Cached books from elite_investor_books. Does not call SEC or Yahoo. */
export async function GET() {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const supabase = await createClient();
  return NextResponse.json(await loadPersistedSnapshot(supabase));
}
