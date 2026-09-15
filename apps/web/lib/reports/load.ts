import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ReportListRow = {
  id: string;
  name: string;
  ticker: string;
  verdict: string;
  modelId: string;
  tokenCostCents: number;
  isLibrarySample: boolean;
  pdfKey: string | null;
  createdAt: string;
};

export async function loadReportList(familyId: string): Promise<ReportListRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, name, ticker, verdict, model_id, token_cost_cents, is_library_sample, pdf_key, created_at",
    )
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    ticker: String(r.ticker),
    verdict: String(r.verdict),
    modelId: String(r.model_id),
    tokenCostCents: Number(r.token_cost_cents ?? 0),
    isLibrarySample: Boolean(r.is_library_sample),
    pdfKey: r.pdf_key ? String(r.pdf_key) : null,
    createdAt: String(r.created_at),
  }));
}

export type ReportDetail = {
  id: string;
  familyId: string;
  name: string;
  ticker: string;
  verdict: string;
  conviction: string | null;
  sections: Record<string, unknown>;
  charts: unknown;
  modelId: string;
  tokenCostCents: number;
  isLibrarySample: boolean;
  pdfKey: string | null;
  createdAt: string;
  requestId: string;
};

export type EvidenceRow = {
  step0Number: number;
  query: string | null;
  excerpt: string | null;
  sourceUrl: string | null;
};

export type RefineRow = {
  id: string;
  createdAt: string;
  userText: string;
  response: string | null;
  wasRefused: boolean;
  modelId: string | null;
  proceeded: boolean | null;
  costLabel: string;
};

export async function loadReportDetail(
  familyId: string,
  reportId: string,
): Promise<{
  report: ReportDetail;
  evidence: EvidenceRow[];
  refinements: RefineRow[];
  feedbackSubmitted: boolean;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, family_id, request_id, name, ticker, verdict, conviction, sections, charts, model_id, token_cost_cents, is_library_sample, pdf_key, created_at",
    )
    .eq("id", reportId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error || !data) return null;

  const sections =
    data.sections && typeof data.sections === "object" && !Array.isArray(data.sections)
      ? (data.sections as Record<string, unknown>)
      : {};

  const { data: evidenceRows } = await supabase
    .from("analysis_evidence")
    .select("step0_number, query, excerpt, source_url")
    .eq("request_id", data.request_id)
    .order("step0_number");

  const { data: refineRows } = await supabase
    .from("refinements")
    .select(
      "id, created_at, user_text, response, was_refused, model_id, proceeded",
    )
    .eq("report_id", reportId)
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  let feedbackSubmitted = false;
  const { data: fb, error: fbErr } = await supabase
    .from("analysis_feedback")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();
  if (!fbErr) feedbackSubmitted = Boolean(fb?.id);

  return {
    report: {
      id: String(data.id),
      familyId: String(data.family_id),
      name: String(data.name),
      ticker: String(data.ticker),
      verdict: String(data.verdict),
      conviction: data.conviction ? String(data.conviction) : null,
      sections,
      charts: data.charts,
      modelId: String(data.model_id),
      tokenCostCents: Number(data.token_cost_cents ?? 0),
      isLibrarySample: Boolean(data.is_library_sample),
      pdfKey: data.pdf_key ? String(data.pdf_key) : null,
      createdAt: String(data.created_at),
      requestId: String(data.request_id),
    },
    evidence: (evidenceRows ?? []).map((row) => ({
      step0Number: Number(row.step0_number),
      query: row.query ? String(row.query) : null,
      excerpt: row.excerpt ? String(row.excerpt) : null,
      sourceUrl: row.source_url ? String(row.source_url) : null,
    })),
    refinements: (refineRows ?? []).map((row) => ({
      id: String(row.id),
      createdAt: String(row.created_at),
      userText: String(row.user_text),
      response: row.response ? String(row.response) : null,
      wasRefused: Boolean(row.was_refused),
      modelId: row.model_id ? String(row.model_id) : null,
      proceeded: row.proceeded == null ? null : Boolean(row.proceeded),
      costLabel: String(row.created_at).slice(0, 16),
    })),
    feedbackSubmitted,
  };
}

export async function requireReportDetail(familyId: string, reportId: string) {
  const loaded = await loadReportDetail(familyId, reportId);
  if (!loaded) notFound();
  return loaded;
}

export type DeskNoteRow = {
  id: string;
  kind: "note" | "in_progress";
  ticker: string;
  name: string;
  verdict: string;
  status: string;
  lastRun: string;
  href: string;
  costCents: number | null;
  isLibrarySample: boolean;
};

const IN_PROGRESS = ["queued", "gathering", "drafting", "checking", "rendering"];

export async function loadDeskNotes(familyId: string): Promise<DeskNoteRow[]> {
  const supabase = await createClient();
  const [{ data: reports }, { data: pending }] = await Promise.all([
    supabase
      .from("reports")
      .select(
        "id, name, ticker, verdict, token_cost_cents, is_library_sample, created_at",
      )
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("analysis_requests")
      .select("id, ticker, status, accepted_at")
      .eq("family_id", familyId)
      .in("status", IN_PROGRESS)
      .order("accepted_at", { ascending: false }),
  ]);

  const notes: DeskNoteRow[] = (reports ?? []).map((r) => ({
    id: String(r.id),
    kind: "note" as const,
    ticker: String(r.ticker),
    name: String(r.name),
    verdict: String(r.verdict ?? ""),
    status: r.is_library_sample ? "Sample" : "Ready",
    lastRun: String(r.created_at),
    href: `/reports/${r.id}`,
    costCents: Number(r.token_cost_cents ?? 0),
    isLibrarySample: Boolean(r.is_library_sample),
  }));

  const inProgress: DeskNoteRow[] = (pending ?? []).map((r) => ({
    id: String(r.id),
    kind: "in_progress" as const,
    ticker: String(r.ticker),
    name: "Note in progress",
    verdict: "",
    status: "In progress",
    lastRun: String(r.accepted_at),
    href: `/analyse/${r.id}`,
    costCents: null,
    isLibrarySample: false,
  }));

  return [...notes, ...inProgress].sort((a, b) =>
    a.lastRun < b.lastRun ? 1 : a.lastRun > b.lastRun ? -1 : 0,
  );
}
