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
            <div className="pf__field">
              <label className="pf__label" htmlFor="manual-ticker">
                Ticker
              </label>
              <input
                id="manual-ticker"
                className="pf__input"
                name="ticker"
                placeholder="e.g. MSFT"
                defaultValue={presetTicker}
                autoCapitalize="characters"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="manual-company">
                Company name
              </label>
              <input
                id="manual-company"
                className="pf__input"
                name="company_name"
                placeholder="e.g. Microsoft"
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="manual-cost">
                Cost / share
              </label>
              <input
                id="manual-cost"
                className="pf__input"
                name="cost_per_share"
                placeholder="e.g. 400"
                inputMode="decimal"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="manual-total">
                Total purchased
              </label>
              <input
                id="manual-total"
                className="pf__input"
                name="total_purchased"
                placeholder="e.g. 4000"
                inputMode="decimal"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="manual-currency">
                Currency
              </label>
              <select
                id="manual-currency"
                className="pf__input"
                name="currency"
                defaultValue="auto"
              >
                <option value="auto">Auto currency from exchange</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
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
