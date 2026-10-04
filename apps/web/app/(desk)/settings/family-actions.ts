"use server";

import { revalidatePath } from "next/cache";

import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { parseSupportDays } from "@/lib/desk/support-days";
import { type FamilyState } from "@/lib/family/action-state";
import { ELITE_INVESTORS } from "@/lib/research/elite-catalog";
import { persistEliteBook } from "@/lib/research/elite-store";
import { eliteMatchWatch } from "@/lib/research/issuer-ticker";
import { refreshInvestor } from "@/lib/research/refresh-investor";
import { createClient } from "@/lib/supabase/server";

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
  return { error: null, notice: "Watch saved. Scan does not run until you confirm." };
}

export async function scanManagers(
  _prev: FamilyState,
  formData: FormData,
): Promise<FamilyState> {
  const session = await requireDeskSession();
  const confirm = String(formData.get("confirm") ?? "") === "1";
  if (!confirm) {
    return { error: null, notice: "Scan does not run until you confirm." };
  }
  if (!canWriteFamily(session)) {
    return { error: "Viewers cannot scan watches.", notice: null };
  }
  const supabase = await createClient();
  const { data: watches, error: watchErr } = await supabase
    .from("manager_watches")
    .select("id, name")
    .eq("family_id", session.familyId);
  if (watchErr) return { error: watchErr.message, notice: null };
  if (!watches?.length) {
    return {
      error: null,
      notice:
        "No watches. Nothing written to manager_holdings_snapshots. Public filings are idea generation only and often 45 days old.",
    };
  }
  let matched = 0;
  let rows = 0;
  const missed: string[] = [];
  for (const watch of watches) {
    const hit = eliteMatchWatch(String(watch.name), ELITE_INVESTORS);
    if (!hit) {
      missed.push(String(watch.name));
      continue;
    }
    const book = await refreshInvestor(hit.slug);
    await persistEliteBook(supabase, book);
    matched += 1;
    const asOf = book.filingAsOf || new Date().toISOString().slice(0, 10);
    await supabase
      .from("manager_holdings_snapshots")
      .delete()
      .eq("family_id", session.familyId)
      .eq("manager_id", watch.id)
      .eq("as_of", asOf);
    const tickers = [
      ...new Set(
        book.holdings
          .map((h) => h.ticker)
          .filter((t): t is string => Boolean(t)),
      ),
    ];
    if (tickers.length === 0) continue;
    const { error: insErr } = await supabase.from("manager_holdings_snapshots").insert(
      tickers.map((ticker) => ({
        family_id: session.familyId,
        manager_id: watch.id,
        ticker,
        as_of: asOf,
      })),
    );
    if (insErr) return { error: insErr.message, notice: null };
    rows += tickers.length;
  }
  revalidatePath("/research/managers");
  const miss =
    missed.length > 0
      ? ` No catalog 13F for ${missed.join(", ")}.`
      : "";
  return {
    error: null,
    notice: `Scanned ${watches.length} watch${watches.length === 1 ? "" : "es"}; matched ${matched}; wrote ${rows} rows to manager_holdings_snapshots.${miss} Public filings are idea generation only and often 45 days old.`,
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
  const days = parseSupportDays(formData.get("days"));
  const expires = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from("support_access_grants").insert({
    family_id: session.familyId,
    granted_by: session.userId,
    admin_id: admin.id,
    scope: "holdings_read",
    expires_at: expires,
  });
  if (error) return { error: error.message, notice: null };
  revalidatePath("/portfolio");
  revalidatePath("/desk");
  return {
    error: null,
    notice: `Support may SELECT lots for ${days} day${days === 1 ? "" : "s"}. Access ends on its own.`,
  };
}
