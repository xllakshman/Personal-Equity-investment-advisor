"use client";

import { useActionState, useState } from "react";

import { grantSupportAccess } from "@/app/(desk)/settings/family-actions";
import { EMPTY_FAMILY } from "@/lib/family/action-state";
import {
  SUPPORT_DAYS_DEFAULT,
  SUPPORT_DAYS_MAX,
  SUPPORT_DAYS_MIN,
} from "@/lib/desk/support-days";

export function SupportGrantForm() {
  const [state, action, pending] = useActionState(grantSupportAccess, EMPTY_FAMILY);
  const [days, setDays] = useState(SUPPORT_DAYS_DEFAULT);
  return (
    <form action={action} className="desk__card pf__support" style={{ marginTop: 22 }}>
      <h2>Let support see your holdings</h2>
      <p className="desk__lede">
        Only when you&apos;ve asked us for help. You choose how long — 3 to 15 days —
        and access switches off on its own. Until you turn it on, nobody at eqveste
        can see your holdings.
      </p>
      <label className="pf__label" htmlFor="support-days">
        Access length · {days} days
      </label>
      <input
        id="support-days"
        className="pf__range"
        type="range"
        name="days"
        min={SUPPORT_DAYS_MIN}
        max={SUPPORT_DAYS_MAX}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      />
      <label className="pf__label">
        Platform admin email
        <input className="pf__input" type="email" name="adminEmail" required />
      </label>
      <button className="desk__btn" type="submit" disabled={pending} style={{ marginTop: 14 }}>
        {pending ? "Saving…" : `Turn on for ${days} days`}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}
