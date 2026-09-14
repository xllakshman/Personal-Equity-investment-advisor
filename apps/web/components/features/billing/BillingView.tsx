"use client";

import { useActionState } from "react";

import {
  EMPTY_BILLING_STATE,
  requestCheckout,
  requestTopup,
} from "@/app/(desk)/billing/actions";

export function TopupForm() {
  const [state, action, pending] = useActionState(requestTopup, EMPTY_BILLING_STATE);
  return (
    <form action={action} className="pf__row" style={{ marginTop: 12, gap: 8 }}>
      <label className="pf__label">
        Amount USD
        <input className="pf__input" name="amount" type="number" min={1} defaultValue={25} />
      </label>
      <button className="pf__primary" type="submit" disabled={pending}>
        {pending ? "…" : "Top up"}
      </button>
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}

export function PlanCards({
  cards,
}: {
  cards: {
    id: string;
    slug: string;
    title: string;
    priceCents: number;
    limit: number;
    who: string;
    why: string;
    current: boolean;
  }[];
}) {
  const [state, action, pending] = useActionState(requestCheckout, EMPTY_BILLING_STATE);
  return (
    <div className="pf__cards" style={{ marginTop: 22 }}>
      {cards.map((card) => (
        <form action={action} className="pf__card" key={card.id}>
          <input type="hidden" name="planId" value={card.id} />
          <p className="pf__card-title">
            {card.title}
            {card.current ? " · current" : ""}
          </p>
          <p className="desk__kpi-v">${(card.priceCents / 100).toFixed(0)}</p>
          <p className="desk__kpi-s">{card.limit} analyses / month</p>
          <p className="desk__lede">{card.who}</p>
          <p className="desk__lede">{card.why}</p>
          <button className="pf__ghost" type="submit" disabled>
            Pay (UPI not connected)
          </button>
        </form>
      ))}
      {pending ? null : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </div>
  );
}
