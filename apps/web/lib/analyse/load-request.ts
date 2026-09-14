import { createClient } from "@/lib/supabase/server";

export type QueuedRequest = {
  id: string;
  ticker: string;
  status: string;
  modelId: string;
  acceptedAt: string;
  errorText: string | null;
};

export async function loadAnalysisRequest(id: string): Promise<QueuedRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_requests")
    .select("id, ticker, status, model_id, accepted_at, error_text")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    ticker: String(data.ticker),
    status: String(data.status),
    modelId: String(data.model_id),
    acceptedAt: String(data.accepted_at),
    errorText: data.error_text ? String(data.error_text) : null,
  };
}

export type { ReportListRow } from "@/lib/reports/load";
export { loadReportList } from "@/lib/reports/load";
