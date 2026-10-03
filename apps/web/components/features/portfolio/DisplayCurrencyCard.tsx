"use client";

import { useActionState } from "react";

import {
  EMPTY_PORTFOLIO_STATE,
  saveDisplaySettings,
} from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { roundUsdInr } from "@/lib/portfolio/fx";

const DISPLAY_CURRENCIES: NativeCurrency[] = ["USD", "INR"];

export function DisplayCurrencyCard({
  displayCurrency,
  fxUsdInrOverride,
  liveRate,
  rateSource,
}: {
  displayCurrency: NativeCurrency;
  fxUsdInrOverride: number | null;
  liveRate: number;
  rateSource: "live" | "saved" | "default";
}) {
  const [state, action, pending] = useActionState(
    saveDisplaySettings,
    EMPTY_PORTFOLIO_STATE,
  );
  const shown = roundUsdInr(liveRate);
  const sourceLine =
    rateSource === "live"
      ? "Fetched on this page load. Two decimal places. Does not rewrite stored lots."
      : rateSource === "saved"
        ? "Internet rate unavailable — using your last saved rate, two decimal places."
        : "Internet rate unavailable — using the built-in fallback, two decimal places.";

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
          step="0.01"
          min="0.01"
          name="fx_usd_inr_override"
          defaultValue={shown.toFixed(2)}
        />
        <p className="pf__lede">{sourceLine}</p>
        {fxUsdInrOverride != null ? (
          <p className="pf__lede">Last saved override: {roundUsdInr(fxUsdInrOverride).toFixed(2)}</p>
        ) : null}
        <button className="desk__btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </div>
  );
}
