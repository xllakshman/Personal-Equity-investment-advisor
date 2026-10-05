import Link from "next/link";

import type { DeskHome } from "@/lib/desk/load-home";
import { analysesThisCycleCaption, formatCreditAmount } from "@/lib/desk/usage-meter";
import { RecheckForm } from "@/components/features/desk/RecheckForm";
import { AllocationTable } from "@/components/features/desk/AllocationTable";
import { PortfolioTrendCard } from "@/components/features/desk/PortfolioTrendCard";
import { deskPrivacyView } from "@/lib/desk/privacy-status";
import { firstName } from "@/lib/desk/identity";
import { splitByLotKind } from "@/lib/portfolio/lot-kind";
import { formatPnlPct } from "@/lib/portfolio/unrealized-pnl";

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
  notice,
}: {
  home: DeskHome;
  fullName: string;
  notice: string | null;
}) {
  const analysesLabel =
    home.analysisLimit != null
      ? `${formatCreditAmount(home.analysesThisCycle)} of ${home.analysisLimit}`
      : formatCreditAmount(home.analysesThisCycle);
  const privacy = deskPrivacyView(home.supportGrant);
  const emptyBook = home.positions === 0;
  const portfolioValue = money(home.costBasis, home.costCurrency === "mixed" ? "USD" : home.costCurrency);
  const { retail, esop } = splitByLotKind(home.holdings);

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
          <p className="desk__kpi-v">{formatPnlPct(home.unrealizedPnlPct)}</p>
          <p className="desk__kpi-s">
            {emptyBook ? "—" : "Unrealized vs cost (previous close)"}
          </p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Analyses this month</p>
          <p className="desk__kpi-v">{analysesLabel}</p>
          <p className="desk__kpi-s">{analysesThisCycleCaption(home.planName)}</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Saved notes</p>
          <p className="desk__kpi-v">{home.savedNotesCount}</p>
          <p className="desk__kpi-s">
            {home.sampleCount > 0 ? `plus ${home.sampleCount} samples` : "Your notes"}
          </p>
        </div>
      </div>
      <PortfolioTrendCard trend={home.trend} />
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
            You can analyse any stock straight away. Add your holdings on Review
            Portfolio, and every answer is sized to your real money.
          </p>
          <div className="desk__steps-grid">
            <Link href="/portfolio" className="desk__step desk__step--hot">
              <span className="desk__step-k">STEP 1 · OPTIONAL</span>
              <span className="desk__step-t">Add your holdings on Review Portfolio</span>
              <span className="desk__step-d">Type them in, or upload a spreadsheet there.</span>
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
        <p className="pf__sleeve-totals">
          Overall unrealized P&amp;L % {formatPnlPct(home.unrealizedPnlPct)}
          {" · "}
          Retail {formatPnlPct(home.retailPnlPct)}
          {" · "}
          ESOP {formatPnlPct(home.esopPnlPct)}
        </p>
        <AllocationTable
          title="Retail"
          holdings={retail}
          quotes={home.quotes}
          displayCurrency={home.displayCurrency}
          fxUsdInr={home.fxUsdInr}
          emptyCopy="No retail lots yet."
        />
        <AllocationTable
          title="ESOP"
          holdings={esop}
          quotes={home.quotes}
          displayCurrency={home.displayCurrency}
          fxUsdInr={home.fxUsdInr}
          emptyCopy="No ESOP lots yet."
        />
        <p className="desk__lede" style={{ marginTop: 10 }}>
          <Link href="/portfolio">Review Portfolio</Link>
          {" — add, edit, delete, or upload a CSV. Home only shows this book."}
        </p>
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
            <Link href="/reports" className="desk__privacy-link">
              All Reports
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
      <RecheckForm tickers={[...new Set(home.holdings.map((h) => h.ticker))]} />
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
