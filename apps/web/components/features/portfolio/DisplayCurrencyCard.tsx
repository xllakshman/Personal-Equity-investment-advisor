"use client";

import { useActionState } from "react";

import {
  EMPTY_PORTFOLIO_STATE,
  saveDisplaySettings,
  toggleDisplayCurrency,
} from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { DEFAULT_USD_INR } from "@/lib/portfolio/fx";

export function DisplayCurrencyCard({
  displayCurrency,
  fxUsdInrOverride,
}: {
  displayCurrency: NativeCurrency;
  fxUsdInrOverride: number | null;
}) {
  const [state, action, pending] = useActionState(
    saveDisplaySettings,
    EMPTY_PORTFOLIO_STATE,
  );
  const other: NativeCurrency = displayCurrency === "USD" ? "INR" : "USD";

  return (
    <div className="pf__card">
      <p className="pf__card-title">Display currency</p>
      <p className="pf__lede">
        We store each holding in its own currency and only convert it for
        display. Lots keep their native <code>cost_per_share</code>.
      </p>
      <form action={toggleDisplayCurrency}>
        <button className="pf__chip-btn" type="submit">
          Showing {displayCurrency} · switch to {other}
        </button>
      </form>
      <form className="pf__stack" action={action} style={{ marginTop: 12 }}>
        <input type="hidden" name="display_currency" value={displayCurrency} />
        <label className="pf__label" htmlFor="fx">
          USD → INR rate (override)
        </label>
        <input
          id="fx"
          className="pf__input"
          type="number"
          step="0.1"
          min="0.000001"
          name="fx_usd_inr_override"
          defaultValue={fxUsdInrOverride ?? DEFAULT_USD_INR}
        />
        <button className="pf__ghost" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save rate"}
        </button>
      </form>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </div>
  );
}
