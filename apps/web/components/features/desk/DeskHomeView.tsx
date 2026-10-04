import Link from "next/link";

import type { DeskHome } from "@/lib/desk/load-home";
import { analysesThisCycleCaption } from "@/lib/desk/usage-meter";
import { RecheckForm } from "@/components/features/desk/RecheckForm";
import { HomeBook } from "@/components/features/desk/HomeBook";
import { AllocationTable } from "@/components/features/desk/AllocationTable";
import { deskPrivacyView } from "@/lib/desk/privacy-status";
import { firstName } from "@/lib/desk/session";
import type { HoldingLotRow } from "@/lib/portfolio/load";

function money(amount: number, ccy: string): string {
  if (ccy === "mixed") return amount.toFixed(0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${ccy}`;
  }
}

export function DeskHomeView({
  home,
  fullName,
  lots,
  canWrite,
  notice,
}: {
  home: DeskHome;
  fullName: string;
  todayLabel: string;
  lots: HoldingLotRow[];
  canWrite: boolean;
  notice: string | null;
}) {
  const analysesLabel =
    home.analysisLimit != null
      ? `${home.analysesThisCycle} of ${home.analysisLimit}`
      : String(home.analysesThisCycle);
  const privacy = deskPrivacyView(home.supportGrant);
  const emptyBook = home.positions === 0;
  const portfolioValue = money(home.costBasis, home.costCurrency === "mixed" ? "USD" : home.costCurrency);

  return (
    <div className="desk__screen">
      <div className="desk__hero">
        <div>
          <p className="desk__kicker">Your desk</p>
          <h1 className="desk__h1">Good morning, {firstName(fullName)}.</h1>
        </div>
        <Link href="/analyse" className="desk__btn">
          Analyse a stock
        </Link>
      </div>
      <div className="desk__kpis">
        <div className="desk__card">
          <p className="desk__kpi-k">Portfolio value</p>
          <p className="desk__kpi-v">{emptyBook ? "$0" : portfolioValue}</p>
          <p className="desk__kpi-s">
            {home.positions} holding{home.positions === 1 ? "" : "s"}
          </p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Gain or loss</p>
          <p className="desk__kpi-v desk__gain">{emptyBook ? "+$0" : "—"}</p>
          <p className="desk__kpi-s desk__gain">{emptyBook ? "—" : "Not a live price"}</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Analyses this month</p>
          <p className="desk__kpi-v">{analysesLabel}</p>
          <p className="desk__kpi-s">{analysesThisCycleCaption(home.planName)}</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Saved notes</p>
          <p className="desk__kpi-v">{home.recentNotes.length}</p>
          <p className="desk__kpi-s">
            {home.sampleCount > 0 ? `plus ${home.sampleCount} samples` : "Your notes"}
          </p>
        </div>
      </div>
      <section
        className={privacy.shared ? "desk__privacy desk__privacy--shared" : "desk__privacy"}
        aria-labelledby="desk-privacy-title"
      >
        <div className="desk__privacy-lock" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="desk__privacy-copy">
          <h2 id="desk-privacy-title" className="desk__privacy-h">
            {privacy.title}
          </h2>
          <p>{privacy.detail}</p>
        </div>
        <div className="desk__privacy-side">
          <p
            className={
              privacy.shared
                ? "desk__privacy-badge desk__privacy-badge--shared"
                : "desk__privacy-badge desk__privacy-badge--private"
            }
          >
            {privacy.shared ? "Support access: on" : "Support access: off"}
          </p>
          <Link href="/portfolio" className="desk__privacy-link">
            Manage access →
          </Link>
        </div>
      </section>
      {emptyBook ? (
        <div className="desk__steps">
          <h2>Three steps to your first decision</h2>
          <p>
            You can analyse any stock straight away. Add your holdings too, and
            every answer is sized to your real money.
          </p>
          <div className="desk__steps-grid">
            <Link href="/portfolio" className="desk__step desk__step--hot">
              <span className="desk__step-k">STEP 1 · OPTIONAL</span>
              <span className="desk__step-t">Add your holdings below</span>
              <span className="desk__step-d">Type them in here, or upload a spreadsheet.</span>
            </Link>
            <div className="desk__step">
              <span className="desk__step-k">STEP 2</span>
              <span className="desk__step-t">Pick a stock and your limits</span>
              <span className="desk__step-d">How big a fall you can take, and the return you want.</span>
            </div>
            <div className="desk__step">
              <span className="desk__step-k">STEP 3</span>
              <span className="desk__step-t">Get a clear plan</span>
              <span className="desk__step-d">How much to buy, when to add, when to sell.</span>
            </div>
          </div>
        </div>
      ) : null}
      {home.flags.length > 0 ? (
        <section className="desk__flags" aria-label="We'll tell you without being asked">
          <h2 className="desk__flags-h">We&apos;ll tell you without being asked</h2>
          <ul className="desk__flags-list">
            {home.flags.map((flag) => (
              <li key={flag.kind} className="desk__flag">
                <span className="desk__flag-dot" aria-hidden />
                <p>{flag.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="desk__book-block">
        <AllocationTable holdings={home.holdings} />
      </div>
      <div className="desk__split">
        <div className="desk__card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              margin: "0 0 14px",
            }}
          >
            <h2 style={{ margin: 0 }}>Recent notes</h2>
            <Link href="/reports" style={{ color: "#9ecbff", fontSize: 12, fontWeight: 500 }}>
              All reports
            </Link>
          </div>
          {home.recentNotes.length === 0 ? (
            <p className="desk__kpi-s">No saved notes yet.</p>
          ) : (
            home.recentNotes.map((r) => (
              <Link className="desk__note" href={`/reports/${r.id}`} key={r.id}>
                <span
                  style={{
                    font: "600 13px/1 inherit",
                    width: 76,
                    flex: "none",
                  }}
                >
                  {r.ticker}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{r.name}</span>
                <span className="desk__kpi-s">{r.verdict}</span>
              </Link>
            ))
          )}
        </div>
      </div>
      {notice ? <p className="pf__banner" style={{ marginTop: 16 }}>{notice}</p> : null}
      <HomeBook lots={lots} canWrite={canWrite} />
      <div className="desk__cta">
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ margin: "0 0 5px", fontWeight: 600 }}>
            CSV upload still lives on Portfolio
          </p>
          <p style={{ color: "rgba(245,245,247,.66)", fontSize: 12.5, lineHeight: 1.6 }}>
            Use Portfolio for a bulk file. Tickers you type on Analyse do not have
            to be in this book. Both paths use one note from this month’s
            allowance. Viewers can open saved notes on Reports.
          </p>
        </div>
        <Link href="/portfolio">Upload CSV</Link>
      </div>
      <RecheckForm tickers={home.holdings.map((h) => h.ticker)} />
      <p className="desk__lede" style={{ marginTop: 18 }}>
        <Link href="/settings/family">Family</Link>
        {" · "}
        <Link href="/settings/crash-letter">Crash letter</Link>
        {" · "}
        <Link href="/contact">Contact us</Link>
      </p>
    </div>
  );
}
