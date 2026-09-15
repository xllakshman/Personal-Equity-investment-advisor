"use client";

import { useActionState, useState } from "react";

import {
  EMPTY_PROFILE_STATE,
  saveInvestorProfile,
} from "@/app/(desk)/settings/profile/actions";
import {
  showLrsFields,
  type BlackoutWindow,
  type InvestorProfileKnobs,
  type TaxResidency,
} from "@/lib/profile/defaults";

function Field({
  label,
  name,
  defaultValue,
  type = "number",
  step,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="pf__label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        className="pf__input"
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        disabled={disabled}
      />
    </div>
  );
}

export function ProfileForm({
  residency,
  isOwner,
  profile,
}: {
  residency: TaxResidency;
  isOwner: boolean;
  profile: InvestorProfileKnobs;
}) {
  const [state, action, pending] = useActionState(
    saveInvestorProfile,
    EMPTY_PROFILE_STATE,
  );
  const [windows, setWindows] = useState<BlackoutWindow[]>(
    profile.blackout_windows.length > 0
      ? profile.blackout_windows
      : [{ label: "", start: "", end: "" }],
  );
  const lrs = showLrsFields(residency);
  const disabled = !isOwner || pending;

  return (
    <form className="pf__stack" action={action}>
      {!isOwner ? (
        <p className="pf__error">Only the family owner can save this profile.</p>
      ) : null}

      <div className="pf__card">
        <p className="pf__card-title">Book limits</p>
        <p className="pf__lede">
          Tax residency on this desk is <strong>{residency}</strong>. This form saves
          your investment limits only.
        </p>
        <label className="pf__check">
          <input
            type="checkbox"
            name="cannot_trade_us_options"
            value="1"
            defaultChecked={profile.cannot_trade_us_options}
            disabled={disabled}
          />
          Cannot trade US options
        </label>
        <div className="pf__row">
          <Field
            label="Monitors per week"
            name="monitor_per_week"
            defaultValue={profile.monitor_per_week}
            disabled={disabled}
          />
          <Field
            label="Horizon (years)"
            name="horizon_years"
            defaultValue={profile.horizon_years}
            step="0.5"
            disabled={disabled}
          />
        </div>
        <div className="pf__row">
          <Field
            label="Cash reserve min %"
            name="cash_reserve_pct_min"
            defaultValue={profile.cash_reserve_pct_min}
            step="0.1"
            disabled={disabled}
          />
          <Field
            label="Cash reserve max %"
            name="cash_reserve_pct_max"
            defaultValue={profile.cash_reserve_pct_max}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div className="pf__row">
          <Field
            label="Concentration cap %"
            name="concentration_cap_pct"
            defaultValue={profile.concentration_cap_pct}
            step="0.1"
            disabled={disabled}
          />
          <Field
            label="Trim back to %"
            name="trim_to_pct"
            defaultValue={profile.trim_to_pct}
            step="0.1"
            disabled={disabled}
          />
        </div>
        <div className="pf__row">
          <Field
            label="Position size min %"
            name="position_size_min_pct"
            defaultValue={profile.position_size_min_pct}
            step="0.1"
            disabled={disabled}
          />
          <Field
            label="Position size max %"
            name="position_size_max_pct"
            defaultValue={profile.position_size_max_pct}
            step="0.1"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="pf__card">
        <p className="pf__card-title">Entry tranches %</p>
        <div className="pf__row">
          <Field label="T1" name="tranche_t1_pct" defaultValue={profile.tranche_t1_pct} disabled={disabled} />
          <Field label="T2" name="tranche_t2_pct" defaultValue={profile.tranche_t2_pct} disabled={disabled} />
          <Field label="T3" name="tranche_t3_pct" defaultValue={profile.tranche_t3_pct} disabled={disabled} />
          <Field label="T4" name="tranche_t4_pct" defaultValue={profile.tranche_t4_pct} disabled={disabled} />
        </div>
      </div>

      <div className="pf__card">
        <p className="pf__card-title">Tax holding (override)</p>
        <p className="pf__lede">
          India default long-term months is 24; US is 12. You can override.
          Rates are basis points (1500 = 15%).
        </p>
        <div className="pf__row">
          <Field
            label="LTCG holding months"
            name="ltcg_holding_months"
            defaultValue={profile.ltcg_holding_months}
            disabled={disabled}
          />
          <Field
            label="LTCG rate (bps)"
            name="ltcg_rate_bps"
            defaultValue={profile.ltcg_rate_bps}
            disabled={disabled}
          />
          <Field
            label="STCG rate (bps)"
            name="stcg_rate_bps"
            defaultValue={profile.stcg_rate_bps}
            disabled={disabled}
          />
        </div>
        {lrs ? (
          <>
            <label className="pf__check">
              <input
                type="checkbox"
                name="lrs_enabled"
                value="1"
                defaultChecked={profile.lrs_enabled}
                disabled={disabled}
              />
              LRS enabled
            </label>
            <Field
              label="LRS annual cap (USD) — leave blank for no product default"
              name="lrs_annual_cap_usd"
              defaultValue={profile.lrs_annual_cap_usd ?? ""}
              disabled={disabled}
            />
          </>
        ) : (
          <p className="pf__lede">LRS fields are hidden for {residency} residency.</p>
        )}
      </div>

      <div className="pf__card">
        <p className="pf__card-title">Outside the book (optional)</p>
        <div className="pf__row">
          <Field label="Cash" name="outside_cash" defaultValue={profile.outside_book.cash ?? ""} disabled={disabled} />
          <Field label="Gold" name="outside_gold" defaultValue={profile.outside_book.gold ?? ""} disabled={disabled} />
        </div>
        <div className="pf__row">
          <Field label="House" name="outside_house" defaultValue={profile.outside_book.house ?? ""} disabled={disabled} />
          <Field
            label="Unlisted"
            name="outside_unlisted"
            defaultValue={profile.outside_book.unlisted ?? ""}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="pf__card">
        <p className="pf__card-title">Blackout windows</p>
        <p className="pf__lede">Earnings or filing dates you type. Empty by default.</p>
        {windows.map((w, i) => (
          <div className="pf__row" key={`bw-${i}`}>
            <input
              className="pf__input"
              name="blackout_label"
              placeholder="Label"
              defaultValue={w.label}
              disabled={disabled}
            />
            <input
              className="pf__input"
              name="blackout_start"
              type="date"
              defaultValue={w.start}
              disabled={disabled}
            />
            <input
              className="pf__input"
              name="blackout_end"
              type="date"
              defaultValue={w.end}
              disabled={disabled}
            />
          </div>
        ))}
        {isOwner ? (
          <button
            className="pf__ghost"
            type="button"
            onClick={() => setWindows((rows) => [...rows, { label: "", start: "", end: "" }])}
          >
            Add window
          </button>
        ) : null}
        <Field
          label="Timezone"
          name="timezone"
          type="text"
          defaultValue={profile.timezone}
          disabled={disabled}
        />
      </div>

      {state.error ? <p className="pf__error">{state.error}</p> : null}
      <button className="pf__primary" type="submit" disabled={disabled}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
