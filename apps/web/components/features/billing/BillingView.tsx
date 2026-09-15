"use client";

import { useActionState, useState } from "react";

import {
  EMPTY_BILLING_STATE,
  requestCheckout,
  requestTopup,
} from "@/app/(desk)/billing/actions";
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

export function PaymentSlot({
  planId,
  cta,
}: {
  planId?: string;
  cta: string;
}) {
  const [method, setMethod] = useState<"upi" | "credit" | "debit">("upi");
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(requestCheckout, EMPTY_BILLING_STATE);

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(UPI_VPA);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p className="pf__label">How to pay</p>
      <div className="pay__grid">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={
              !m.available
                ? "pay__method pay__method--off"
                : method === m.id
                  ? "pay__method pay__method--on"
                  : "pay__method"
            }
            disabled={!m.available}
            onClick={() => {
              if (m.available) setMethod(m.id);
            }}
          >
            <strong>{m.label}</strong>
            <p className="pf__lede" style={{ marginTop: 4 }}>
              {m.hint}
            </p>
          </button>
        ))}
      </div>
      {method === "upi" ? (
        <div>
          <p className="pf__lede">Pay with GPay or any UPI app to</p>
          <p className="pay__vpa">{UPI_VPA}</p>
          <div className="bld__actions">
            <button className="desk__btn" type="button" onClick={() => void copyVpa()}>
              {copied ? "UPI ID copied" : "Copy UPI ID"}
            </button>
            <form action={action}>
              {planId ? <input type="hidden" name="planId" value={planId} /> : null}
              <button className="pf__ghost" type="submit" disabled={pending}>
                {cta}
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </div>
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
  return (
    <div className="pf__cards" style={{ marginTop: 22 }}>
      {cards.map((card) => (
        <div className="pf__card" key={card.id}>
          <p className="pf__card-title">
            {card.title}
            {card.current ? " · current" : ""}
          </p>
          <p className="desk__kpi-v">${(card.priceCents / 100).toFixed(0)}</p>
          <p className="desk__kpi-s">{card.limit} notes / month</p>
          <p className="desk__lede">{card.who}</p>
          <p className="desk__lede">{card.why}</p>
          <PaymentSlot planId={card.id} cta="Subscribe" />
        </div>
      ))}
    </div>
  );
}
