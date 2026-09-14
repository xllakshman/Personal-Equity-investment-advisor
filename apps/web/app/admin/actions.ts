"use server";

import { redirect } from "next/navigation";

import { EMPTY_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { loginEmailError } from "@/lib/auth/signup-fields";
import { createClient } from "@/lib/supabase/server";

export async function adminSignIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const emailErr = loginEmailError(email);
  if (emailErr) return { error: emailErr, notice: null };
  if (!password) return { error: "Enter a password.", notice: null };

  const supabase = await createClient();
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", existing.user.id)
      .maybeSingle();
    if (profile?.role === "platform_admin") {
      redirect("/admin/accounts");
    }
    const incoming = email.trim().toLowerCase();
    const current = (existing.user.email ?? "").toLowerCase();
    if (incoming === current) {
      return {
        error: "This is not a platform admin account. Use /login for the research desk.",
        notice: null,
      };
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { error: "Wrong email or password.", notice: null };
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: "Wrong email or password.", notice: null };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", uid)
    .maybeSingle();
  if (profile?.role !== "platform_admin") {
    await supabase.auth.signOut();
    return {
      error: "This is not a platform admin account. Use /login for the research desk.",
      notice: null,
    };
  }
  redirect("/admin/accounts");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
