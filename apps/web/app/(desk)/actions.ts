"use server";

import { redirect } from "next/navigation";

import { requireDeskSession } from "@/lib/desk/session";
import { tickerSearchHref, tickerSearchTarget } from "@/lib/desk/ticker";

/** Header Analyse. Never inserts analysis_requests. */
export async function submitTickerSearch(formData: FormData) {
  const raw = String(formData.get("ticker") ?? "");
  await requireDeskSession();
  const href = tickerSearchHref(tickerSearchTarget(raw));
  if (!href) {
    redirect("/desk");
  }
  redirect(href);
}
