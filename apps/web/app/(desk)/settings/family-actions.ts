"use server";

import { revalidatePath } from "next/cache";

import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export type FamilyState = { error: string | null; notice: string | null };
export const EMPTY_FAMILY: FamilyState = { error: null, notice: null };

export async function inviteMember(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  if (session.memberRole !== "owner") {
    return { error: "Only the family owner can invite.", notice: null };
  }
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (!email) return { error: "Enter an email that already has a desk user.", notice: null };
  if (role !== "member" && role !== "viewer") {
    return { error: "Role must be member or viewer.", notice: null };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_invite_family_member", {
    p_email: email,
    p_role: role,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/settings/family");
  return { error: null, notice: "Member added. family_id on existing reports is unchanged." };
}

export async function saveCrashLetter(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  if (session.memberRole !== "owner") {
    return { error: "Only the owner can save the crash letter.", notice: null };
  }
  const body = String(formData.get("body") ?? "");
  const confirmDraft = String(formData.get("draft_model") ?? "") === "1";
  if (confirmDraft) {
    return { error: null, notice: "Draft with model needs confirm + a billed path. Nothing was sent." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("crash_letters").upsert({
    family_id: session.familyId,
    body,
    updated_by: session.userId,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/settings/crash-letter");
  return { error: null, notice: "Saved to crash_letters." };
}

export async function addManagerWatch(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  if (!canWriteFamily(session)) {
    return { error: "Viewers cannot add watches.", notice: null };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name required.", notice: null };
  const supabase = await createClient();
  const { error } = await supabase.from("manager_watches").insert({
    family_id: session.familyId,
    name,
    created_by: session.userId,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/research/managers");
  return { error: null, notice: "Watch saved. Scan without confirm inserts no usage_events." };
}

export async function scanManagers(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  await requireDeskSession();
  const confirm = String(formData.get("confirm") ?? "") === "1";
  if (!confirm) {
    return { error: null, notice: "Scan without confirm inserts no usage_events." };
  }
  return {
    error: null,
    notice:
      "13F is idea generation only and 45 days stale. No vendor is named, so no usage_events were inserted.",
  };
}

export async function toggleWeeklyDigest(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  if (session.memberRole !== "owner") {
    return { error: "Only the owner can toggle weekly email.", notice: null };
  }
  const on = String(formData.get("opt_in") ?? "") === "1";
  const confirm = String(formData.get("confirm") ?? "") === "1";
  const supabase = await createClient();
  const { error } = await supabase.rpc("thesis_set_weekly_digest_opt_in", {
    p_opt_in: on,
    p_confirm: confirm,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/billing");
  return {
    error: null,
    notice: on
      ? "Weekly digest opt-in is on. No email is sent until a provider is named."
      : "Weekly digest opt-in is off.",
  };
}

export async function grantSupportAccess(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  if (session.memberRole !== "owner") {
    return { error: "Only the owner can grant support access.", notice: null };
  }
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const supabase = await createClient();
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("email", adminEmail)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!admin?.id) return { error: "That email is not a platform_admin user.", notice: null };
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from("support_access_grants").insert({
    family_id: session.familyId,
    granted_by: session.userId,
    admin_id: admin.id,
    scope: "holdings_read",
    expires_at: expires,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/portfolio");
  return { error: null, notice: "Support may SELECT lots until the grant expires." };
}
