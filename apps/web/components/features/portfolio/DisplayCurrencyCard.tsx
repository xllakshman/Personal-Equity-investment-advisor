"use client";

import { useActionState } from "react";

import {
  EMPTY_PORTFOLIO_STATE,
  saveDisplaySettings,
} from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { DEFAULT_USD_INR } from "@/lib/portfolio/fx";

const DISPLAY_CURRENCIES: NativeCurrency[] = ["USD", "INR"];

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

  return (
    <div className="desk__card pf__compact">
      <p className="pf__card-title">Display currency</p>
      <form className="pf__stack" action={action}>
        <label className="pf__label" htmlFor="display_currency">
          Show amounts in
        </label>
        <select
          id="display_currency"
          className="pf__input"
          name="display_currency"
          defaultValue={displayCurrency}
        >
          {DISPLAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <label className="pf__label" htmlFor="fx">
          USD → INR rate
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
        <button className="desk__btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </div>
  );
}
