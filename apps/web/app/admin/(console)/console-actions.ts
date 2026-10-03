"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePlanEdit, parseThesisClass, type PlanEditState } from "@/lib/admin/plan-edit";
import {
  parsePromptRole,
  promptVersionName,
  type PromptActionState,
} from "@/lib/admin/prompt-name";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { analysisApiBase, analysisApiFetch } from "@/lib/analysis-api";
import { isNativeProvider } from "@/lib/analyse/models";
import { createClient } from "@/lib/supabase/server";

export async function savePlan(
  _prev: PlanEditState,
  formData: FormData,
): Promise<PlanEditState> {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: catalog } = await supabase
    .from("model_catalog")
    .select("id, provider")
    .eq("is_active", true);
  const catalogIds = (catalog ?? [])
    .filter((m) => isNativeProvider(String(m.provider)))
    .map((m) => String(m.id));
  const parsed = parsePlanEdit(formData, catalogIds);
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const { error } = await supabase
    .from("plans")
    .update({
      monthly_analysis_limit: parsed.value.monthlyAnalysisLimit,
      price_cents: parsed.value.priceCents,
      weekly_digest_ticker_limit: parsed.value.weeklyDigestTickerLimit,
      is_active: parsed.value.isActive,
      allowed_model_ids: parsed.value.allowedModelIds,
      who_copy: parsed.value.whoCopy,
      why_copy: parsed.value.whyCopy,
    })
    .eq("id", parsed.value.planId);
  if (error) return { error: error.message, notice: null };

  for (const notice of parsed.value.notices) {
    const { data: existing } = await supabase
      .from("plan_notice_thresholds")
      .select("id")
      .eq("plan_id", parsed.value.planId)
      .eq("pct", notice.pct)
      .maybeSingle();
    const noticeError = existing?.id
      ? (
          await supabase
            .from("plan_notice_thresholds")
            .update({ message: notice.message })
            .eq("id", existing.id)
        ).error
      : (
          await supabase.from("plan_notice_thresholds").insert({
            plan_id: parsed.value.planId,
            pct: notice.pct,
            message: notice.message,
          })
        ).error;
    if (noticeError) return { error: noticeError.message, notice: null };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/billing");
  return {
    error: null,
    notice:
      "Saved. Desk Subscription and Analyse agent lists read these rows on the next load.",
  };
}

export async function stagePrompt(
  _prev: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const session = await requirePlatformAdmin();
  const role = parsePromptRole(String(formData.get("role") ?? "advisor"));
  const base = String(formData.get("semver") ?? "").trim();
  const pasted = String(formData.get("body") ?? "");
  const file = formData.get("file");
  let body = pasted;
  if (file instanceof File && file.size > 0) {
    body = await file.text();
  }
  if (!body.trim()) {
    return { error: "Upload a file or paste the prompt text.", notice: null };
  }
  const fileBase =
    file instanceof File && file.name
      ? file.name.replace(/\.(txt|md)$/i, "")
      : "";
  const semver = promptVersionName(base || fileBase || role, new Date());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .insert({
      semver,
      body,
      role,
      submitted_by: session.userId,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    return {
      error:
        error.message.includes("permission") || error.code === "42501"
          ? "Apply migration 023 so this admin session can write prompt_versions."
          : error.message,
      notice: null,
    };
  }
  revalidatePath("/admin/prompt");
  redirect(`/admin/prompt?view=${data?.id ?? ""}`);
}

export async function promotePrompt(formData: FormData) {
  await requirePlatformAdmin();
  const promptId = String(formData.get("promptId") ?? "");
  if (!promptId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_admin_promote_prompt", {
    p_id: promptId,
  });
  if (error) {
    redirect(
      `/admin/prompt?view=${promptId}&err=${encodeURIComponent(error.message)}`,
    );
  }
  revalidatePath("/admin/prompt");
  redirect(`/admin/prompt?view=${promptId}`);
}

async function accessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function setModelClass(
  _prev: PlanEditState,
  formData: FormData,
): Promise<PlanEditState> {
  await requirePlatformAdmin();
  const modelId = String(formData.get("model_id") ?? "").trim();
  if (!modelId) {
    return { error: "Missing catalog row.", notice: null };
  }
  const parsed = parseThesisClass(String(formData.get("thesis_class") ?? ""));
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("model_catalog")
    .update({
      thesis_class: parsed.value,
      tier: parsed.value === "frontier" ? "Frontier" : "Quick",
    })
    .eq("id", modelId)
    .select("id, label")
    .maybeSingle();
  if (error) return { error: error.message, notice: null };
  if (!data?.id) {
    return { error: "That catalog row was not found.", notice: null };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/analyse");
  const label = parsed.value === "frontier" ? "Frontier" : "Quick";
  return {
    error: null,
    notice: `${String(data.label)} is now ${label}. Analyse groups agents from model_catalog.thesis_class on the next load.`,
  };
}

function analysisApiLooksLocal(base: string): boolean {
  try {
    const host = new URL(base).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return true;
  }
}

export async function refreshLabModels(
  _prev: PlanEditState,
  _formData: FormData,
): Promise<PlanEditState> {
  await requirePlatformAdmin();
  const base = analysisApiBase();
  if (process.env.VERCEL && analysisApiLooksLocal(base)) {
    return {
      error:
        "Fetch latest models needs analysis-api on the droplet (set ANALYSIS_API_URL), not this Vercel app. You can still change Frontier / Quick on each row below — that writes model_catalog.thesis_class with this admin session.",
      notice: null,
    };
  }
  const token = await accessToken();
  if (!token) {
    return { error: "Admin session expired. Sign in again at /admin/login.", notice: null };
  }
  let res: Response;
  try {
    res = await analysisApiFetch("/admin/models/refresh", token, {
      method: "POST",
    });
  } catch {
    return {
      error:
        "analysis-api did not answer. Fetch uses that process (local :8091 or api.eqveste.com), not Vercel. Class on each row below still writes model_catalog.thesis_class without Fetch.",
      notice: null,
    };
  }
  const payload = (await res.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
    upserted?: number;
    providers?: string[];
  };
  if (!res.ok) {
    return {
      error:
        payload.detail ||
        payload.error ||
        `Could not fetch lab models (${res.status}).`,
      notice: null,
    };
  }
  revalidatePath("/admin/plans");
  const n = Number(payload.upserted ?? 0);
  const labs = (payload.providers ?? []).join(", ") || "native labs";
  return {
    error: null,
    notice: `Updated ${n} model_catalog rows from ${labs}. Frontier vs quick uses the generation gap on this screen. Save each plan card to offer new agents on Analyse.`,
  };
}

export async function saveWatchLimit(formData: FormData) {
  await requirePlatformAdmin();
  const kind = String(formData.get("watch_kind") ?? "");
  const value = Number(formData.get("limit_value") ?? "");
  if (!kind || !Number.isFinite(value)) return;
  const supabase = await createClient();
  await supabase.rpc("observability_upsert_threshold", {
    p_watch_kind: kind,
    p_limit_value: value,
  });
  revalidatePath("/admin/observability");
}

export async function openImpersonation(formData: FormData) {
  await requirePlatformAdmin();
  const target = String(formData.get("targetUserId") ?? "");
  const supabase = await createClient();
  await supabase.rpc("impersonation_open", { p_target_user_id: target });
  redirect(`/admin/accounts/${target}/preview`);
}

export async function closeImpersonation(formData: FormData) {
  await requirePlatformAdmin();
  const target = String(formData.get("targetUserId") ?? "");
  const supabase = await createClient();
  await supabase.rpc("impersonation_close", { p_target_user_id: target });
  redirect("/admin/accounts");
}
