"use client";

import Link from "next/link";
import { useState } from "react";

import { Reveal } from "./Reveal";

const MONTHLY = {
  basic: "$2.99",
  pro: "$5.99",
  plus: "$10",
  ultra: "$15",
  unlim: "$50",
} as const;

const YEARLY = {
  basic: "$32",
  pro: "$60",
  plus: "$100",
  ultra: "$150",
  unlim: "$500",
} as const;

export function PlanGrid() {
  const [annual, setAnnual] = useState(false);
  const p = annual ? YEARLY : MONTHLY;
  const per = annual ? "per year" : "per month";

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
          margin: "0 0 34px",
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <p className="mkt__kicker">Subscription</p>
          <h2 className="mkt__h2">Pick the plan that fits your portfolio.</h2>
          <p className="mkt__lede">
            One analysis means one full note on one stock. How good it is depends on
            the agent you pick, and frontier agents come with Professional and above.{" "}
            {annual
              ? "Yearly prices below — you save about 15%."
              : "Monthly prices below. Switch to yearly and save about 15%."}
          </p>
        </div>
        <button
          type="button"
          className={annual ? "mkt__btn mkt__btn--solid" : "mkt__btn mkt__btn--ghost"}
          onClick={() => setAnnual((v) => !v)}
        >
          {annual ? "Yearly · saving 15%" : "Switch to yearly"}
        </button>
      </div>
      <div className="mkt__grid mkt__grid--6">
        <PlanCard
          name="Free trial"
          price="Free"
          per="no card needed"
          quota="3 sample analyses"
          who="See the work before you pay"
          href="/signup"
          cta="Read the samples"
          delay={0}
        />
        <PlanCard
          name="Basic"
          price={p.basic}
          per={per}
          quota="5 analyses a month"
          who="Up to $15K"
          href="/signup"
          cta="Choose Basic"
          delay={60}
        />
        <PlanCard
          name="Professional"
          price={p.pro}
          per={per}
          quota="20 analyses a month"
          who="Under $50K · frontier agents included"
          href="/signup"
          cta="Choose Professional"
          recommended
          delay={120}
        />
        <PlanCard
          name="Professional +"
          price={p.plus}
          per={per}
          quota="50 analyses a month"
          who="Under $150K"
          href="/signup"
          cta="Choose Professional +"
          delay={180}
        />
        <PlanCard
          name="Ultra"
          price={p.ultra}
          per={per}
          quota="80 analyses a month"
          who="$150K to $500K"
          href="/signup"
          cta="Choose Ultra"
          delay={240}
        />
        <PlanCard
          name="Pay per use"
          price="$1 / $1.50"
          per="wallet"
          quota="No monthly reset"
          who="A couple of decisions a year"
          href="/signup"
          cta="Choose wallet"
          delay={300}
        />
      </div>
    </>
  );
}

function PlanCard({
  name,
  price,
  per,
  quota,
  who,
  href,
  cta,
  recommended,
  delay,
}: {
  name: string;
  price: string;
  per: string;
  quota: string;
  who: string;
  href: string;
  cta: string;
  recommended?: boolean;
  delay: number;
}) {
  return (
    <Reveal
      delay={delay}
      className={
        recommended
          ? "mkt__card mkt__card--lift mkt__card--rec"
          : "mkt__card mkt__card--lift"
      }
      style={
        recommended
          ? {
              background:
                "linear-gradient(160deg, rgba(10,132,255,.22), rgba(255,255,255,.05) 60%)",
              borderColor: "rgba(10,132,255,.4)",
            }
          : undefined
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "#f5f5f7" }}>
          {name}
        </p>
        {recommended ? (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,.18)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Recommended
          </span>
        ) : null}
      </div>
      <div style={{ margin: "12px 0" }}>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#f5f5f7" }}>
          {price}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(245,245,247,.62)" }}>
          {per}
        </p>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 13.5, fontWeight: 600, color: "#f5f5f7" }}>
        {quota}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "rgba(245,245,247,.68)" }}>
        {who}
      </p>
      <Link
        href={href}
        className={recommended ? "mkt__btn mkt__btn--solid" : "mkt__btn mkt__btn--ghost"}
        style={{ width: "100%" }}
      >
        {cta}
      </Link>
    </Reveal>
  );
}
