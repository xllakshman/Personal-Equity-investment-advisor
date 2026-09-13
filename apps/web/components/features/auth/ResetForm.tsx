"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, updatePassword } from "@/app/(auth)/actions";
import { ErrorBanner } from "@/components/features/auth/ErrorBanner";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { EMPTY_AUTH_STATE } from "@/lib/auth/form-state";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    EMPTY_AUTH_STATE,
  );

  return (
    <div>
      <h2 className="auth__h2">Reset password</h2>
      <p className="auth__sub">
        We send a single-use link valid for 30 minutes. Existing sessions are
        revoked on reset.
      </p>
      <ErrorBanner error={state.error} notice={state.notice} />
      <form action={action}>
        <div className="auth__field">
          <label className="auth__label" htmlFor="email">
            Account email
          </label>
          <input
            id="email"
            className="auth__input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@domain.com"
            required
          />
        </div>
        <button className="auth__submit" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="auth__center">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}

export function ResetUpdateForm() {
  const [state, action, pending] = useActionState(
    updatePassword,
    EMPTY_AUTH_STATE,
  );

  return (
    <div>
      <h2 className="auth__h2">Set a new password</h2>
      <p className="auth__sub">
        This link is valid for 30 minutes. Other sessions are signed out when
        you save.
      </p>
      <ErrorBanner error={state.error} />
      <form action={action}>
        <PasswordField
          autoComplete="new-password"
          placeholder="12+ characters"
          hint="Minimum 12 characters."
        />
        <button className="auth__submit" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
