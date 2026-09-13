"use server";

import { redirect } from "next/navigation";

import { requireDeskSession } from "@/lib/desk/session";
import { tickerSearchHref, tickerSearchTarget } from "@/lib/desk/ticker";
import { createClient } from "@/lib/supabase/server";

/** Header Analyse. Never inserts analysis_requests. */
export async function submitTickerSearch(formData: FormData) {
  const raw = String(formData.get("ticker") ?? "");
  const session = await requireDeskSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("holdings")
    .select("ticker")
    .eq("family_id", session.familyId);

  const held = (data ?? []).map((r) => String(r.ticker));
  const target = tickerSearchTarget(raw, held);
  const href = tickerSearchHref(target);
  if (!href) {
    redirect("/desk");
  }
  redirect(href);
}
