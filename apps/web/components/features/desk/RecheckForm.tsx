"use client";

import { useActionState } from "react";

import { EMPTY_RECHECK, recheckHoldings } from "@/app/(desk)/desk/recheck-actions";

export function RecheckForm({ tickers }: { tickers: string[] }) {
  const [state, action, pending] = useActionState(recheckHoldings, EMPTY_RECHECK);
  if (tickers.length === 0) return null;
  return (
    <form action={action} className="desk__card" style={{ marginTop: 22 }}>
      <h2>Re-check holdings</h2>
      <p className="desk__lede">
        Login does not start a run. Confirm names the count and uses one note per
        stock from this month’s allowance.
      </p>
      <input type="hidden" name="tickers" value={tickers.join(",")} />
      <button className="pf__ghost" type="submit" disabled={pending}>
        Re-check all (no confirm)
      </button>
      <button
        className="pf__primary"
        type="submit"
        name="confirm"
        value="1"
        disabled={pending}
        style={{ marginLeft: 8 }}
      >
        Confirm {tickers.length} names
      </button>
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
