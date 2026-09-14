"use client";

import { useActionState } from "react";

import { adminSignIn } from "@/app/admin/actions";
import { ErrorBanner } from "@/components/features/auth/ErrorBanner";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { EMPTY_AUTH_STATE } from "@/lib/auth/form-state";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignIn, EMPTY_AUTH_STATE);
  return (
    <div>
      <h2 className="auth__h2">Platform admin</h2>
      <p className="auth__sub">Not the research desk. Desk owners use /login.</p>
      <ErrorBanner error={state.error} />
      <form action={action}>
        <div className="auth__field">
          <label className="auth__label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth__input"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </div>
        <PasswordField autoComplete="current-password" />
        <button className="auth__submit" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in to admin"}
        </button>
      </form>
    </div>
  );
}
