"use client";

import { useActionState, useState, type ReactNode } from "react";

import { submitContact } from "@/lib/contact/submit";
import { PHONE_COUNTRY_OPTIONS } from "@/lib/auth/signup-fields";
import { EMPTY_CONTACT_STATE } from "@/lib/contact/parse";

const TOPICS = ["Billing", "A report", "My portfolio", "Something else"] as const;

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
        <label className="ct__label" htmlFor={htmlFor}>
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
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Billing");
  const desk = variant === "desk";
  const formClass = desk ? "ct__form" : "mkt__contact";
  const inputClass = desk ? "ct__input" : "mkt__input mkt__input--box";
  const msgClass = desk ? "ct__input" : "mkt__input mkt__input--box mkt__contact-msg";
  const errClass = desk
    ? "pf__error"
    : "mkt__contact-banner mkt__contact-banner--err";
  const okClass = desk
    ? "pf__banner"
    : "mkt__contact-banner mkt__contact-banner--ok";

  if (desk) {
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
        <input type="hidden" name="topic" value={topic} />
        <p className="ct__label">What is it about?</p>
        <div className="ct__topics">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              className={topic === t ? "ct__topic ct__topic--on" : "ct__topic"}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ct__fields">
          <Field desk htmlFor="contact-name" label="Name">
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
          <Field desk htmlFor="contact-email" label="Email">
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
        </div>
        <label className="ct__label" htmlFor="contact-phone">
          Phone (optional)
        </label>
        <span className="ct__phone">
          <select className={inputClass} name="phoneCc" defaultValue="+91" aria-label="Country code">
            {PHONE_COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label.replace(" · ", " ")}
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
          />
        </span>
        <label className="ct__label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          className={msgClass}
          name="message"
          rows={5}
          maxLength={4000}
          required
          placeholder="Tell us what happened, and the stock or report if it's about one."
        />
        <button type="submit" className="ct__send" disabled={pending} style={{ marginTop: 16 }}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </form>
    );
  }

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
      <Field desk={false} htmlFor="contact-name" label="Name">
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
      <Field desk={false} htmlFor="contact-email" label="Email">
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
      <Field desk={false} htmlFor="contact-phone" label="Phone">
        <span className="mkt__contact-phone">
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
      <Field desk={false} htmlFor="contact-message" label="Message">
        <textarea
          id="contact-message"
          className={msgClass}
          name="message"
          rows={5}
          maxLength={4000}
          required
        />
      </Field>
      <button type="submit" className="mkt__btn mkt__btn--solid" disabled={pending}>
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
