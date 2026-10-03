"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePlanEdit, type PlanEditState } from "@/lib/admin/plan-edit";
import { requirePlatformAdmin } from "@/lib/admin/session";
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

export async function stagePrompt(formData: FormData) {
  await requirePlatformAdmin();
  const semver = String(formData.get("semver") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  if (!semver || !body) return;
  const supabase = await createClient();
  const session = await requirePlatformAdmin();
  await supabase.from("prompt_versions").insert({
    semver,
    body,
    submitted_by: session.userId,
  });
  revalidatePath("/admin/prompt");
}

export async function approvePrompt(formData: FormData) {
  const session = await requirePlatformAdmin();
  const promptId = String(formData.get("promptId") ?? "");
  const submittedBy = String(formData.get("submittedBy") ?? "");
  if (!promptId) return;
  if (submittedBy === session.userId) {
    return;
  }
  const supabase = await createClient();
  await supabase.from("prompt_version_approvals").insert({
    prompt_version_id: promptId,
    submitted_by: submittedBy || session.userId,
    approved_by: session.userId,
    approved_at: new Date().toISOString(),
  });
  revalidatePath("/admin/prompt");
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
