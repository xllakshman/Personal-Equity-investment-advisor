import { createClient } from "@/lib/supabase/server";

import { IN_FLIGHT_STATUSES, type InFlightAnalysis } from "./in-flight";

export async function loadInFlightAnalysis(
  familyId: string,
): Promise<InFlightAnalysis | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_requests")
    .select("id, ticker, status")
    .eq("family_id", familyId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .order("accepted_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row?.id) return null;
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    status: String(row.status),
  };
}
