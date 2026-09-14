"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export async function savePlanLimit(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("planId") ?? "");
  const limit = Number(formData.get("monthly_analysis_limit") ?? "");
  if (!id || !Number.isInteger(limit) || limit < 0) return;
  const supabase = await createClient();
  await supabase.from("plans").update({ monthly_analysis_limit: limit }).eq("id", id);
  revalidatePath("/admin/plans");
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
