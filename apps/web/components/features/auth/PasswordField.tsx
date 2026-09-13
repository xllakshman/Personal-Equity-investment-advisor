"use client";

import { useState } from "react";

type Props = {
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
};

/** Visibility is React state only — never URL, cookie, or localStorage. */
export function PasswordField({
  name = "password",
  placeholder = "••••••••••",
  autoComplete = "current-password",
  hint,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth__field">
      <div className="auth__pw-row">
        <label className="auth__label" htmlFor={name}>
          Password
        </label>
        <button
          type="button"
          className="auth__pw-toggle"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"} password
        </button>
      </div>
      <input
        id={name}
        className="auth__input"
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
      {hint ? <p className="auth__hint">{hint}</p> : null}
    </div>
  );
}
