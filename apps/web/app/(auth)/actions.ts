"use server";

import { redirect } from "next/navigation";

import { EMPTY_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { passwordLengthError } from "@/lib/auth/password";
import { loginEmailError, parseSignupFields } from "@/lib/auth/signup-fields";
import { createClient } from "@/lib/supabase/server";

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://127.0.0.1:3100";
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const emailErr = loginEmailError(email);
  if (emailErr) return { error: emailErr, notice: null };
  if (!password) return { error: "Enter a password.", notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: "Wrong email or password.", notice: null };
  }

  redirect("/desk");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseSignupFields({
    fullName: String(formData.get("fullName") ?? ""),
    taxResidency: String(formData.get("taxResidency") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneCc: String(formData.get("phoneCc") ?? ""),
    phoneNational: String(formData.get("phoneNational") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const { value } = parsed;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: value.email,
    password: value.password,
    options: {
      data: {
        full_name: value.fullName,
        tax_residency: value.taxResidency,
        phone_cc: value.phoneCc,
        phone_e164: value.phoneE164,
      },
    },
  });

  if (error) {
    return { error: error.message, notice: null };
  }

  if (data.session) {
    redirect("/desk");
  }

  return {
    error: null,
    notice: "Check your email to confirm the account. Then sign in.",
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const emailErr = loginEmailError(email);
  if (emailErr) return { error: emailErr, notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteOrigin()}/reset`,
  });

  if (error) {
    return { error: error.message, notice: null };
  }

  return {
    error: null,
    notice:
      "If that email has a desk, we sent a single-use link valid for 30 minutes. Existing sessions are revoked when you set the new password.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const lengthErr = passwordLengthError(password);
  if (lengthErr) return { error: lengthErr, notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message, notice: null };
  }

  await supabase.auth.signOut({ scope: "others" });
  redirect("/desk");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
