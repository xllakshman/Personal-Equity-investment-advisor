"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePlanEdit, parsePlanShared, parseThesisClass, type PlanEditState } from "@/lib/admin/plan-edit";
import { type FamilyPlanState } from "@/lib/admin/family-plan";
import {
  ACTIVATE_NOTICE,
  CLASS_SAVED_NOTICE,
  DEACTIVATE_NOTICE,
  FETCH_HOST_DOWN,
  FETCH_MODELS_NOTICE,
  FETCH_NEEDS_HOST,
  PLAN_SAVED_NOTICE,
  PLAN_SHARED_SAVED_NOTICE,
} from "@/lib/admin/operator-copy";
import {
  parsePromptRole,
  promptRemoveError,
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
  const parsed = parsePlanEdit(formData);
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const { error } = await supabase
    .from("plans")
    .update({
      monthly_analysis_limit: parsed.value.monthlyAnalysisLimit,
      price_cents: parsed.value.priceCents,
      weekly_digest_ticker_limit: parsed.value.weeklyDigestTickerLimit,
      is_active: parsed.value.isActive,
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
    notice: PLAN_SAVED_NOTICE,
  };
}

export async function savePlanShared(
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
  const parsed = parsePlanShared(formData, catalogIds);
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const { data: rows, error: listError } = await supabase.from("plans").select("id");
  if (listError) return { error: listError.message, notice: null };
  const ids = (rows ?? []).map((r) => String(r.id)).filter(Boolean);
  if (ids.length === 0) {
    return { error: "No plan rows to update.", notice: null };
  }

  const { error } = await supabase
    .from("plans")
    .update({
      allowed_model_ids: parsed.value.allowedModelIds,
      who_copy: parsed.value.whoCopy,
    })
    .in("id", ids);
  if (error) return { error: error.message, notice: null };

  revalidatePath("/admin/plans");
  revalidatePath("/billing");
  revalidatePath("/analyse");
  return {
    error: null,
    notice: PLAN_SHARED_SAVED_NOTICE,
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
          ? "Apply migration 023 so this page can save a version."
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

export async function removePrompt(formData: FormData) {
  await requirePlatformAdmin();
  const promptId = String(formData.get("promptId") ?? "");
  if (!promptId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_admin_remove_prompt", {
    p_id: promptId,
  });
  if (error) {
    redirect(
      `/admin/prompt?view=${promptId}&err=${encodeURIComponent(promptRemoveError(error.message))}`,
    );
  }
  revalidatePath("/admin/prompt");
  redirect("/admin/prompt");
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
    return { error: "Pick an agent.", notice: null };
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
    return { error: "That agent was not found.", notice: null };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/analyse");
  const label = parsed.value === "frontier" ? "Frontier" : "Quick";
  return {
    error: null,
    notice: CLASS_SAVED_NOTICE(String(data.label), label),
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
      error: FETCH_NEEDS_HOST,
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
        FETCH_HOST_DOWN,
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
    notice: FETCH_MODELS_NOTICE(n, labs),
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

export async function setFamilyPlan(
  _prev: FamilyPlanState,
  formData: FormData,
): Promise<FamilyPlanState> {
  await requirePlatformAdmin();
  const familyId = String(formData.get("family_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");
  if (!familyId) return { error: "That account has no family to activate.", notice: null };
  if (intent !== "activate" && intent !== "deactivate") {
    return { error: "Pick Activate or Deactivate.", notice: null };
  }
  if (intent === "activate" && !planId) {
    return { error: "Pick a plan to activate.", notice: null };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_admin_set_family_plan", {
    p_family_id: familyId,
    p_plan_id: planId || familyId,
    p_billing_status: intent === "activate" ? "subscribed" : "cancelled",
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("THS-ADM-001")) {
      return { error: "Sign in at /admin/login.", notice: null };
    }
    if (msg.includes("Could not find the function") || msg.includes("schema cache")) {
      return {
        error:
        "Activate needs migration 025 applied on this project (CONFIRM_APPLY=1).",
        notice: null,
      };
    }
    return { error: "Could not change that plan.", notice: null };
  }
  revalidatePath("/admin/accounts");
  revalidatePath("/billing");
  revalidatePath("/analyse");
  return {
    error: null,
    notice:
      intent === "activate" ? ACTIVATE_NOTICE : DEACTIVATE_NOTICE,
  };
}
