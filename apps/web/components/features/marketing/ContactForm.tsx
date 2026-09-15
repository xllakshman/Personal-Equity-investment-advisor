"use client";

import { useActionState, type ReactNode } from "react";

import { submitContact } from "@/app/(marketing)/actions";
import { PHONE_COUNTRY_OPTIONS } from "@/lib/auth/signup-fields";
import { EMPTY_CONTACT_STATE } from "@/lib/contact/parse";

function Field({
  desk,
  htmlFor,
  label,
  children,
}: {
  desk: boolean;
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  if (desk) {
    return (
      <div>
        <label className="pf__label" htmlFor={htmlFor}>
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <label className="mkt__contact-label" htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}

export function ContactForm({
  variant = "marketing",
  defaults,
}: {
  variant?: "marketing" | "desk";
  defaults?: { fullName?: string; email?: string };
}) {
  const [state, action, pending] = useActionState(
    submitContact,
    EMPTY_CONTACT_STATE,
  );
  const desk = variant === "desk";
  const formClass = desk ? "pf__stack" : "mkt__contact";
  const inputClass = desk ? "pf__input" : "mkt__input mkt__input--box";
  const phoneClass = desk ? "pf__phone" : "mkt__contact-phone";
  const msgClass = desk
    ? "pf__input pf__contact-msg"
    : "mkt__input mkt__input--box mkt__contact-msg";
  const btnClass = desk ? "desk__btn" : "mkt__btn mkt__btn--solid";
  const errClass = desk
    ? "pf__error"
    : "mkt__contact-banner mkt__contact-banner--err";
  const okClass = desk
    ? "pf__banner"
    : "mkt__contact-banner mkt__contact-banner--ok";

  return (
    <form className={formClass} action={action}>
      {state.error ? (
        <p className={errClass} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className={okClass} role="status">
          {state.notice}
        </p>
      ) : null}
      <Field desk={desk} htmlFor="contact-name" label="Name">
        <input
          id="contact-name"
          className={inputClass}
          name="fullName"
          autoComplete="name"
          maxLength={120}
          required
          defaultValue={defaults?.fullName ?? ""}
        />
      </Field>
      <Field desk={desk} htmlFor="contact-email" label="Email">
        <input
          id="contact-email"
          className={inputClass}
          type="email"
          name="email"
          autoComplete="email"
          maxLength={200}
          required
          defaultValue={defaults?.email ?? ""}
        />
      </Field>
      <Field desk={desk} htmlFor="contact-phone" label="Phone">
        <span className={phoneClass}>
          <select
            className={inputClass}
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
            id="contact-phone"
            className={inputClass}
            name="phoneNational"
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="Mobile number"
            maxLength={20}
            required
          />
        </span>
      </Field>
      <Field desk={desk} htmlFor="contact-message" label="Message">
        <textarea
          id="contact-message"
          className={msgClass}
          name="message"
          rows={5}
          maxLength={4000}
          required
        />
      </Field>
      <button type="submit" className={btnClass} disabled={pending}>
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
