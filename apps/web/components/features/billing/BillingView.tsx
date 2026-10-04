"use client";

import { useActionState, useState } from "react";

import { requestCheckout, requestTopup } from "@/app/(desk)/billing/actions";
import { EMPTY_BILLING_STATE } from "@/lib/billing/action-state";
import { PAYMENT_METHODS, UPI_VPA } from "@/lib/billing/upi";

export function TopupForm() {
  const [state, action, pending] = useActionState(requestTopup, EMPTY_BILLING_STATE);
  return (
    <form action={action} className="pf__row" style={{ marginTop: 12, gap: 8 }}>
      <label className="pf__label">
        Amount USD
        <input className="pf__input" name="amount" type="number" min={1} defaultValue={25} />
      </label>
      <button className="desk__btn" type="submit" disabled={pending}>
        {pending ? "…" : "Top up"}
      </button>
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}

export function PaymentSlot() {
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("upi");
  const selected = PAYMENT_METHODS.find((m) => m.id === method) ?? PAYMENT_METHODS[0];

  return (
    <div>
      <label className="pf__label" htmlFor="pay-method">
        Payment type
        <select
          id="pay-method"
          className="pf__input"
          value={method}
          onChange={(e) =>
            setMethod(e.target.value as (typeof PAYMENT_METHODS)[number]["id"])
          }
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      {selected.id === "upi" ? (
        <div>
          <p className="pf__lede" style={{ marginTop: 10 }}>
            {selected.hint}
          </p>
          <p className="pay__vpa">{UPI_VPA}</p>
        </div>
      ) : (
        <p className="pf__lede" style={{ marginTop: 10 }}>
          {selected.hint}. This type is not connected yet.
        </p>
      )}
    </div>
  );
}

export function PlanCards({
  cards,
  pendingPlanId = null,
}: {
  cards: {
    id: string;
    slug: string;
    title: string;
    priceCents: number;
    limitLabel: string;
    who: string;
    why: string;
    current: boolean;
  }[];
  pendingPlanId?: string | null;
}) {
  const [state, action, pending] = useActionState(
    requestCheckout,
    EMPTY_BILLING_STATE,
  );
  return (
    <div className="pf__cards" style={{ marginTop: 22 }}>
      <h2 className="pf__cards-h">Choose a plan</h2>
      {[...cards].sort((a, b) => Number(b.current) - Number(a.current)).map((card) => (
        <div className={card.current ? "pf__card pf__card--current" : "pf__card"} key={card.id}>
          <p className="pf__card-title">{card.title}</p>
          <p className="desk__kpi-v">${(card.priceCents / 100).toFixed(0)}</p>
          <p className="desk__kpi-s">{card.limitLabel}</p>
          <p className="desk__lede">{card.who}</p>
          <p className="desk__lede">{card.why}</p>
          {card.current ? (
            <p className="pf__plan-yours">Your plan</p>
          ) : (
            <form action={action}>
              <input type="hidden" name="planId" value={card.id} />
              <button
                className="desk__btn desk__btn--light"
                type="submit"
                disabled={pending}
              >
                {card.id === pendingPlanId ? "Requested" : "Choose"}
              </button>
            </form>
          )}
        </div>
      ))}
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </div>
  );
}
