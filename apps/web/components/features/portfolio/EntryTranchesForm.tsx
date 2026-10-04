"use client";

import { useActionState } from "react";

import { saveEntryTranches } from "@/app/(desk)/portfolio/actions";
import { EMPTY_PORTFOLIO_STATE } from "@/lib/portfolio/action-state";
import type { EntryTranches } from "@/lib/profile/tranches";

export function EntryTranchesForm({
  tranches,
  isOwner,
}: {
  tranches: EntryTranches;
  isOwner: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveEntryTranches,
    EMPTY_PORTFOLIO_STATE,
  );
  const disabled = !isOwner || pending;

  return (
    <form id="entry-tranches" className="pf__card" action={action}>
      <p className="pf__card-title">Buy in four slices</p>
      <p className="pf__lede">
        How a new buy is split across four fills. The next analysis uses these
        shares. This does not change lots. Only the owner can save.
      </p>
      {!isOwner ? (
        <p className="pf__error">Only the family owner can save slice sizes.</p>
      ) : null}
      <div className="pf__row">
        <label className="pf__label" htmlFor="tranche_t1_pct">
          T1 %
          <input
            id="tranche_t1_pct"
            className="pf__input"
            name="tranche_t1_pct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={tranches.tranche_t1_pct}
            disabled={disabled}
          />
        </label>
        <label className="pf__label" htmlFor="tranche_t2_pct">
          T2 %
          <input
            id="tranche_t2_pct"
            className="pf__input"
            name="tranche_t2_pct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={tranches.tranche_t2_pct}
            disabled={disabled}
          />
        </label>
        <label className="pf__label" htmlFor="tranche_t3_pct">
          T3 %
          <input
            id="tranche_t3_pct"
            className="pf__input"
            name="tranche_t3_pct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={tranches.tranche_t3_pct}
            disabled={disabled}
          />
        </label>
        <label className="pf__label" htmlFor="tranche_t4_pct">
          T4 %
          <input
            id="tranche_t4_pct"
            className="pf__input"
            name="tranche_t4_pct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={tranches.tranche_t4_pct}
            disabled={disabled}
          />
        </label>
      </div>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
      <button className="desk__btn" type="submit" disabled={disabled}>
        {pending ? "Saving…" : "Save entry tranches"}
      </button>
    </form>
  );
}
