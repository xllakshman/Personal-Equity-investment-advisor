"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/app/(auth)/actions";
import { ErrorBanner } from "@/components/features/auth/ErrorBanner";
import { GoogleButton } from "@/components/features/auth/GoogleButton";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { EMPTY_AUTH_STATE } from "@/lib/auth/form-state";
import {
  PHONE_COUNTRY_OPTIONS,
  TAX_RESIDENCY_OPTIONS,
} from "@/lib/auth/signup-fields";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, EMPTY_AUTH_STATE);

  return (
    <div>
      <h2 className="auth__h2">Open your desk</h2>
      <p className="auth__sub">
        Tax residency sets how gains are modelled. You can change it later.
      </p>
      <ErrorBanner error={state.error} notice={state.notice} />
      <form action={action}>
        <div className="auth__field">
          <label className="auth__label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            className="auth__input"
            name="fullName"
            autoComplete="name"
            placeholder="As it appears on your broker account"
            required
          />
        </div>
        <div className="auth__field">
          <label className="auth__label" htmlFor="taxResidency">
            Tax residency
          </label>
          <select
            id="taxResidency"
            className="auth__select"
            name="taxResidency"
            defaultValue="us"
            required
          >
            {TAX_RESIDENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
        <div className="auth__field">
          <label className="auth__label" htmlFor="phoneNational">
            Phone
          </label>
          <div className="auth__phone">
            <select
              className="auth__select"
              name="phoneCc"
              defaultValue="+91"
              aria-label="Country code"
            >
              {PHONE_COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              id="phoneNational"
              className="auth__input"
              name="phoneNational"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="Mobile number"
              required
            />
          </div>
        </div>
        <PasswordField
          autoComplete="new-password"
          placeholder="12+ characters"
          hint="Minimum 12 characters. Visibility is off by default and never persisted."
        />
        <button className="auth__submit" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account · start 14-day trial"}
        </button>
      </form>
      <p className="auth__or">or</p>
      <GoogleButton />
      <p className="auth__center">
        Already have a desk? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
