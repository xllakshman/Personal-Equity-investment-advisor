"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/(auth)/actions";
import { ErrorBanner } from "@/components/features/auth/ErrorBanner";
import { GoogleButton } from "@/components/features/auth/GoogleButton";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { EMPTY_AUTH_STATE } from "@/lib/auth/form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, EMPTY_AUTH_STATE);

  return (
    <div>
      <h2 className="auth__h2">Welcome back</h2>
      <p className="auth__sub">Sign in to your research desk.</p>
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
            placeholder="you@domain.com"
            required
          />
        </div>
        <PasswordField autoComplete="current-password" />
        <button className="auth__submit" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="auth__or">or</p>
      <GoogleButton />
      <div className="auth__links">
        <Link href="/reset">Forgot password</Link>
        <Link href="/signup">Create an account</Link>
      </div>
    </div>
  );
}
