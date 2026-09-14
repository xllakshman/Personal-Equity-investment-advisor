import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type DeskSession = {
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  memberRole: string;
  familyId: string;
};

export function canWriteFamily(session: DeskSession): boolean {
  return session.memberRole === "owner" || session.memberRole === "member";
}

export async function requireDeskSession(): Promise<DeskSession> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, email")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "desk_owner";
  if (role === "platform_admin") {
    redirect("/admin/accounts");
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id, member_role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.family_id) {
    redirect("/login");
  }

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.email ?? "Desk",
    role,
    memberRole: String(membership.member_role ?? "owner"),
    familyId: membership.family_id,
  };
}

export function firstName(fullName: string): string {
  const part = fullName.replace(/\s+/g, " ").trim().split(" ")[0];
  return part || "there";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleLabel(role: string, memberRole?: string): string {
  if (role === "platform_admin") return "Platform admin";
  if (memberRole === "viewer") return "Viewer";
  if (memberRole === "member" || role === "member") return "Family member";
  return "Desk owner";
}
