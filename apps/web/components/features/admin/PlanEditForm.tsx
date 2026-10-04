"use client";

import { useActionState } from "react";

import { savePlan } from "@/app/admin/(console)/console-actions";
import {
  EMPTY_PLAN_EDIT,
  limitChoices,
  priceUsdChoices,
  weeklyTickerChoices,
} from "@/lib/admin/plan-edit";
import { planCardTitle } from "@/lib/billing/plan-titles";

export type AdminPlanFormValues = {
  id: string;
  slug: string;
  name: string;
  monthlyAnalysisLimit: number;
  priceCents: number;
  weeklyDigestTickerLimit: number;
  isActive: boolean;
  whyCopy: string;
  notices: { pct: number; message: string }[];
};

export function PlanEditForm({ plan }: { plan: AdminPlanFormValues }) {
  const [state, action, pending] = useActionState(savePlan, EMPTY_PLAN_EDIT);
  const title = planCardTitle(plan.slug, plan.name);

  return (
    <form action={action} className="admin__card admin__form">
      <input type="hidden" name="planId" value={plan.id} />
      <div>
        <h2 className="admin__h2">{title}</h2>
        <p className="admin__hint">
          Slug {plan.slug} stays fixed. This card is the {title} row on
          Subscription. Agents and who-it-is-for sit in the shared block above.
        </p>
      </div>
      <label className="admin__field">
        Notes per month
        <select
          className="admin__input"
          name="monthly_analysis_limit"
          defaultValue={String(plan.monthlyAnalysisLimit)}
        >
          {limitChoices(plan.monthlyAnalysisLimit).map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "0 — no new notes" : `${n} analyses`}
            </option>
          ))}
        </select>
      </label>
      <label className="admin__field">
        Monthly price (USD)
        <select
          className="admin__input"
          name="price_usd"
          defaultValue={String(Math.round(plan.priceCents / 100))}
        >
          {priceUsdChoices(plan.priceCents).map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "$0 — Trial" : `$${n} / month`}
            </option>
          ))}
        </select>
      </label>
      <label className="admin__field">
        Weekly email ticker cap
        <select
          className="admin__input"
          name="weekly_digest_ticker_limit"
          defaultValue={String(plan.weeklyDigestTickerLimit)}
        >
          {weeklyTickerChoices(plan.weeklyDigestTickerLimit).map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "0 — no names" : `${n} names`}
            </option>
          ))}
        </select>
      </label>
      <label className="admin__field">
        Listed on Subscription
        <select
          className="admin__input"
          name="is_active"
          defaultValue={plan.isActive ? "true" : "false"}
        >
          <option value="true">Yes — families can pick this plan</option>
          <option value="false">No — hidden on the desk</option>
        </select>
      </label>
      <label className="admin__field">
        Why the price
        <textarea
          className="admin__textarea"
          name="why_copy"
          rows={3}
          defaultValue={plan.whyCopy}
          required
        />
      </label>
      {plan.notices.map((n) => (
        <label className="admin__field" key={n.pct}>
          Notice at {n.pct}% of the month
          <textarea
            className="admin__textarea"
            name={`notice_${n.pct}`}
            rows={2}
            defaultValue={n.message}
            required
          />
        </label>
      ))}
      <button className="admin__btn admin__btn--solid" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save this plan"}
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
