"use server";

import { redirect } from "next/navigation";

import { analysisApiFetch } from "@/lib/analysis-api";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export type ReportActionState = { error: string | null; notice: string | null };

export const EMPTY_REPORT_STATE: ReportActionState = { error: null, notice: null };

async function accessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function renameReport(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  await requireDeskSession();
  const reportId = String(formData.get("reportId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!reportId) return { error: "Missing report.", notice: null };
  if (!name) return { error: "Enter a name.", notice: null };

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_rename", {
    p_report_id: reportId,
    p_name: name,
  });
  if (error) {
    return { error: error.message, notice: null };
  }
  redirect(`/reports/${reportId}`);
}

export async function downloadReportPdf(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  await requireDeskSession();
  const reportId = String(formData.get("reportId") ?? "");
  const token = await accessToken();
  if (!token) return { error: "Sign in again.", notice: null };
  try {
    const res = await analysisApiFetch(`/reports/${reportId}/pdf`, token);
    if (res.status === 404) {
      return { error: "PDF is not ready. The worker has not uploaded this note yet.", notice: null };
    }
    if (!res.ok) {
      return { error: "Could not get a signed PDF URL.", notice: null };
    }
    const body = (await res.json()) as { url?: string };
    if (!body.url) return { error: "PDF URL missing.", notice: null };
    redirect(body.url);
  } catch {
    return {
      error:
        "analysis-api is not running on 8091. Start it, or wait until the worker sets reports.pdf_key.",
      notice: null,
    };
  }
}

export async function submitAnalysisFeedback(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const session = await requireDeskSession();
  if (session.role === "platform_admin") {
    return { error: "Platform admin does not submit desk surveys.", notice: null };
  }
  const reportId = String(formData.get("reportId") ?? "");
  const helpfulRaw = String(formData.get("helpful") ?? "");
  if (helpfulRaw !== "yes" && helpfulRaw !== "no") {
    return { error: "Choose Yes or No for “Is the analysis provided helpful?”", notice: null };
  }
  const dim = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 5) return null;
    return n;
  };
  const comment = String(formData.get("comment") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_submit_analysis_feedback", {
    p_report_id: reportId,
    p_helpful: helpfulRaw === "yes",
    p_dim_evidence: dim("dim_evidence"),
    p_dim_decision: dim("dim_decision"),
    p_dim_bear: dim("dim_bear"),
    p_dim_next_steps: dim("dim_next_steps"),
    p_dim_personal_fit: dim("dim_personal_fit"),
    p_comment: comment || null,
  });
  if (error) {
    return { error: error.message, notice: null };
  }
  redirect(`/reports/${reportId}`);
}

export async function refineReport(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const session = await requireDeskSession();
  const reportId = String(formData.get("reportId") ?? "");
  const userText = String(formData.get("userText") ?? "").trim();
  const stage = String(formData.get("stage") ?? "gate");
  const confirm = String(formData.get("confirm") ?? "") === "1";
  if (!userText) return { error: "Write your enrichment first.", notice: null };
  const token = await accessToken();
  if (!token) return { error: "Sign in again.", notice: null };

  const path =
    stage === "refine" ? `/reports/${reportId}/refine` : `/reports/${reportId}/refine-gate`;
  try {
    const res = await analysisApiFetch(path, token, {
      method: "POST",
      body: JSON.stringify({ user_text: userText, confirm }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 403) {
      return { error: "Sample notes cannot be refined.", notice: null };
    }
    if (res.status === 404) {
      return { error: "Note not found, or viewers cannot refine.", notice: null };
    }
    if (res.status === 429) {
      return { error: "Allowance exhausted this cycle. Saved notes stay readable.", notice: null };
    }
    if (!res.ok) {
      return { error: String(body.detail ?? "Refine failed."), notice: null };
    }
    if (body.need_confirm) {
      const cents = Number(body.cost_cents ?? 0);
      const model = String(body.model_id ?? "");
      return {
        error: null,
        notice: `Confirm ${stage === "refine" ? "full refine" : "gate"} on ${model} at $${(cents / 100).toFixed(2)} before the model runs.`,
      };
    }
    if (body.was_refused) {
      return { error: String(body.reason ?? "Refused."), notice: null };
    }
    if (stage !== "refine" && body.material === false) {
      return {
        error: null,
        notice:
          "No material difference with this text. Original note unchanged. Confirm a full refine if you still want to proceed.",
      };
    }
    redirect(`/reports/${reportId}`);
  } catch {
    return {
      error: `analysis-api is not running. Desk user ${session.email ?? session.userId} cannot refine until port 8091 is up.`,
      notice: null,
    };
  }
}
