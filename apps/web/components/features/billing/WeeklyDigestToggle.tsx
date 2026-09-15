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
        A short holdings recap using a quick model. It does not use your monthly
        analyses.
      </p>
      <input type="hidden" name="opt_in" value={optedIn ? "0" : "1"} />
      <button className="pf__ghost" type="submit" disabled={pending}>
        {optedIn ? "Turn off" : "Turn on (needs confirm)"}
      </button>
      {!optedIn ? (
        <button
          className="desk__btn"
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
