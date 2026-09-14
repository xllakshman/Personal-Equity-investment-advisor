import { redirect } from "next/navigation";

import { getOptionalUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  email: string | null;
  fullName: string;
};

export async function requirePlatformAdmin(): Promise<AdminSession> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/admin/login");
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (data?.role !== "platform_admin") {
    redirect("/admin/login");
  }
  return {
    userId: user.id,
    email: data?.email ?? user.email ?? null,
    fullName: data?.full_name ?? user.email ?? "Admin",
  };
}
