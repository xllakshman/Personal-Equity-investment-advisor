import { createClient } from "@/lib/supabase/server";
import { assignNoteVersions, versionLabel } from "@/lib/reports/versions";

export type PriorRun = {
  id: string;
  version: number | null;
  versionCount: number;
};

export type QueuedRequest = {
  id: string;
  ticker: string;
  status: string;
  modelId: string;
  acceptedAt: string;
  errorText: string | null;
  reportId: string | null;
  version: number | null;
  versionCount: number;
  priorNotes: PriorRun[];
};

export async function loadAnalysisRequest(id: string): Promise<QueuedRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_requests")
    .select("id, family_id, ticker, status, model_id, accepted_at, error_text")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const ticker = String(data.ticker);
  const familyId = String(data.family_id);
  const { data: report } = await supabase
    .from("reports")
    .select("id")
    .eq("request_id", id)
    .maybeSingle();
  const reportId = report?.id ? String(report.id) : null;
  const { data: siblings } = await supabase
    .from("reports")
    .select("id, created_at")
    .eq("family_id", familyId)
    .eq("ticker", ticker)
    .order("created_at", { ascending: true });
  const numbered = assignNoteVersions(
    (siblings ?? []).map((r) => ({
      id: String(r.id),
      ticker,
      kind: "note" as const,
      lastRun: String(r.created_at),
    })),
  );
  const current = reportId ? numbered.find((r) => r.id === reportId) : null;
  const priorNotes = numbered
    .filter((r) => r.id !== reportId)
    .map((r) => ({
      id: r.id,
      version: r.version,
      versionCount: r.versionCount,
    }))
    .reverse();
  return {
    id: String(data.id),
    ticker,
    status: String(data.status),
    modelId: String(data.model_id),
    acceptedAt: String(data.accepted_at),
    errorText: data.error_text ? String(data.error_text) : null,
    reportId,
    version: current?.version ?? null,
    versionCount: current?.versionCount ?? numbered.length,
    priorNotes,
  };
}

export { versionLabel };
export type { ReportListRow } from "@/lib/reports/load";
export { loadReportList } from "@/lib/reports/load";
