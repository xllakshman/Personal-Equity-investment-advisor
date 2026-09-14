"use client";

import { useActionState } from "react";

import {
  EMPTY_FAMILY,
  grantSupportAccess,
} from "@/app/(desk)/settings/family-actions";

export function SupportGrantForm() {
  const [state, action, pending] = useActionState(grantSupportAccess, EMPTY_FAMILY);
  return (
    <form action={action} className="desk__card" style={{ marginTop: 22 }}>
      <h2>Allow support to see holdings</h2>
      <p className="desk__lede">
        Writes <code>support_access_grants</code>. Without an unexpired grant, platform
        admin cannot SELECT lot quantities.
      </p>
      <label className="pf__label">
        Platform admin email
        <input className="pf__input" type="email" name="adminEmail" required />
      </label>
      <button className="pf__ghost" type="submit" disabled={pending} style={{ marginTop: 10 }}>
        Grant 7 days
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}
