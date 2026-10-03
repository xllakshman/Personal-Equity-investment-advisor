import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth/session";
import { eliteBySlug } from "@/lib/research/elite-catalog";
import { loadPersistedSnapshot, persistEliteBook } from "@/lib/research/elite-store";
import { refreshInvestor } from "@/lib/research/refresh-investor";
import { createClient } from "@/lib/supabase/server";

/** User-clicked refresh. Pulls one 13F + optional Yahoo vehicle, then upserts elite_investor_books. */
export async function POST(request: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!eliteBySlug(slug)) {
    return NextResponse.json({ error: "Unknown investor." }, { status: 400 });
  }
  const supabase = await createClient();
  try {
    const book = await refreshInvestor(slug);
    const snap = await persistEliteBook(supabase, book);
    return NextResponse.json({ book, generatedAt: snap.generatedAt });
  } catch {
    return NextResponse.json(
      { error: "Could not refresh that book just now.", snapshot: await loadPersistedSnapshot(supabase) },
      { status: 502 },
    );
  }
}
