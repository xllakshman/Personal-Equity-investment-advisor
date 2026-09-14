"use client";

import { useActionState } from "react";

import {
  EMPTY_FAMILY,
  toggleWeeklyDigest,
} from "@/app/(desk)/settings/family-actions";

export function WeeklyDigestToggle({ optedIn }: { optedIn: boolean }) {
  const [state, action, pending] = useActionState(toggleWeeklyDigest, EMPTY_FAMILY);
  return (
    <form action={action} className="desk__card" style={{ marginTop: 22 }}>
      <h2>Weekly email</h2>
      <p className="desk__lede">
        Quick model, ticker cap from <code>plans.weekly_digest_ticker_limit</code>. Does not
        use monthly Analyse searches. No email is sent until a provider is named.
      </p>
      <input type="hidden" name="opt_in" value={optedIn ? "0" : "1"} />
      <button className="pf__ghost" type="submit" disabled={pending}>
        {optedIn ? "Turn off" : "Turn on (needs confirm)"}
      </button>
      {!optedIn ? (
        <button
          className="pf__primary"
          type="submit"
          name="confirm"
          value="1"
          disabled={pending}
          style={{ marginLeft: 8 }}
        >
          Confirm turn on
        </button>
      ) : null}
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}
