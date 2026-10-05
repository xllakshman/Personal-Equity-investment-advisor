"use client";

import { useActionState } from "react";

import { addManualLot } from "@/app/(desk)/portfolio/actions";
import { LotKindFields } from "@/components/features/portfolio/LotKindFields";
import { EMPTY_PORTFOLIO_STATE } from "@/lib/portfolio/action-state";

export function ManualAddForm({
  presetTicker,
  returnTo = "/portfolio",
  canWrite = true,
}: {
  presetTicker: string;
  returnTo?: string;
  canWrite?: boolean;
}) {
  const [state, action, pending] = useActionState(addManualLot, EMPTY_PORTFOLIO_STATE);

  return (
    <div className="pf__card">
      <p className="pf__card-title">Or enter manually</p>
      {!canWrite ? (
        <p className="desk__kpi-s">
          Viewers can read this book but cannot add lots.
        </p>
      ) : (
        <>
          {presetTicker ? (
            <p className="pf__lede">
              Header search opened Analyse for unknown names. Adding {presetTicker} here
              is optional — it fills qty and cost on the next run.
            </p>
          ) : null}
          <form className="pf__stack" action={action}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              className="pf__input"
              name="ticker"
              placeholder="Ticker"
              defaultValue={presetTicker}
              autoCapitalize="characters"
              required
            />
            <input
              className="pf__input"
              name="company_name"
              placeholder="Company name"
            />
            <div className="pf__row">
              <input
                className="pf__input"
                name="cost_per_share"
                placeholder="Cost / share"
                inputMode="decimal"
                required
              />
              <input
                className="pf__input"
                name="total_purchased"
                placeholder="Total purchased"
                inputMode="decimal"
                required
              />
            </div>
            <select className="pf__input" name="currency" defaultValue="auto">
              <option value="auto">Auto currency from exchange</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
            <LotKindFields />
            <button className="pf__ghost" type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add position"}
            </button>
          </form>
          {state.error ? <p className="pf__error">{state.error}</p> : null}
        </>
      )}
    </div>
  );
}
