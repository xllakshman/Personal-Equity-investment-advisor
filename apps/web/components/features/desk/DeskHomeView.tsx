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
  todayLabel,
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
      ? `${home.analysesThisCycle} / ${home.analysisLimit}`
      : String(home.analysesThisCycle);
  const privacy = deskPrivacyView(home.supportGrant);

  return (
    <div>
      <div className="desk__hero">
        <div>
          <p className="desk__kicker">{todayLabel}</p>
          <h1 className="desk__h1">Good morning, {firstName(fullName)}.</h1>
        </div>
        <Link href="/analyse" className="desk__btn">
          Analyse a stock
        </Link>
      </div>
      <section
        className={privacy.shared ? "desk__privacy desk__privacy--shared" : "desk__privacy"}
        aria-labelledby="desk-privacy-title"
      >
        <div>
          <p
            className={
              privacy.shared
                ? "desk__privacy-badge desk__privacy-badge--shared"
                : "desk__privacy-badge desk__privacy-badge--private"
            }
          >
            {privacy.badge}
          </p>
          <h2 id="desk-privacy-title" className="desk__privacy-h">
            {privacy.title}
          </h2>
          <p>{privacy.detail}</p>
        </div>
        <Link href="/portfolio" className="desk__btn desk__btn--ghost">
          Manage access
        </Link>
      </section>
      {home.flags.length > 0 ? (
        <section className="desk__flags" aria-label="We tell you without being asked">
          <h2 className="desk__flags-h">We tell you without being asked</h2>
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
      <div className="desk__kpis">
        <div className="desk__card">
          <p className="desk__kpi-k">At last cost</p>
          <p className="desk__kpi-v">
            {home.positions === 0 ? "—" : money(home.costBasis, home.costCurrency)}
          </p>
          <p className="desk__kpi-s">What you paid × how many shares — not today’s price.</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Unrealised P&amp;L</p>
          <p className="desk__kpi-v">—</p>
          <p className="desk__kpi-s">Needs a current price. Not shown yet.</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Positions</p>
          <p className="desk__kpi-v">{home.positions}</p>
          <p className="desk__kpi-s">Names in your book.</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Analyses this month</p>
          <p className="desk__kpi-v">{analysesLabel}</p>
          <p className="desk__kpi-s">
            {analysesThisCycleCaption(home.planName)}
          </p>
        </div>
      </div>
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
