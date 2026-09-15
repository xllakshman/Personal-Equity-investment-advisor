import Link from "next/link";

import type { DeskHome } from "@/lib/desk/load-home";
import { analysesThisCycleCaption } from "@/lib/desk/usage-meter";
import { RecheckForm } from "@/components/features/desk/RecheckForm";
import { firstName } from "@/lib/desk/session";

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
}: {
  home: DeskHome;
  fullName: string;
  todayLabel: string;
}) {
  const analysesLabel =
    home.analysisLimit != null
      ? `${home.analysesThisCycle} / ${home.analysisLimit}`
      : String(home.analysesThisCycle);

  return (
    <div>
      <div className="desk__hero">
        <div>
          <p className="desk__kicker">{todayLabel}</p>
          <h1 className="desk__h1">Good morning, {firstName(fullName)}.</h1>
        </div>
        <Link href="/analyse" className="desk__btn">
          Analyse a Stock
        </Link>
      </div>
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
          <p className="desk__kpi-k">Notes this month</p>
          <p className="desk__kpi-v">{analysesLabel}</p>
          <p className="desk__kpi-s">
            {analysesThisCycleCaption(home.planName)}
          </p>
        </div>
      </div>
      <div className="desk__split">
        <div className="desk__card">
          <h2>Allocation</h2>
          {home.holdings.length === 0 ? (
            <p className="desk__kpi-s">No lots yet. Upload a CSV on Portfolio.</p>
          ) : (
            home.holdings.map((h) => (
              <div className="desk__bar" key={h.ticker}>
                <b>{h.ticker}</b>
                <div className="desk__track">
                  <div
                    className="desk__fill"
                    style={{ width: `${Math.min(100, h.weightPct)}%` }}
                  />
                </div>
                <span className="desk__kpi-s" style={{ width: 92, textAlign: "right" }}>
                  {h.weightPct.toFixed(0)}% · {h.lastChecked}
                </span>
              </div>
            ))
          )}
        </div>
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
            <Link href="/reports" style={{ color: "#2f5f52", fontSize: 12, fontWeight: 500 }}>
              All reports
            </Link>
          </div>
          {home.recentNotes.length === 0 ? (
            <p className="desk__kpi-s">No saved notes yet.</p>
          ) : (
            home.recentNotes.map((r) => (
              <div className="desk__note" key={r.id}>
                <span
                  style={{
                    font: "500 12px/1 var(--font-ibm-plex-mono), monospace",
                    width: 76,
                    flex: "none",
                  }}
                >
                  {r.ticker}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{r.name}</span>
                <span className="desk__kpi-s">{r.verdict}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="desk__cta">
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ margin: "0 0 5px", fontWeight: 600 }}>
            Your holdings change the advice
          </p>
          <p style={{ color: "#5c6578", fontSize: 12.5, lineHeight: 1.6 }}>
            Upload ticker, company, cost, and quantity purchased. Analyse only runs
            for names already in your book.
          </p>
        </div>
        <Link href="/portfolio">Upload portfolio</Link>
      </div>
      <RecheckForm tickers={home.holdings.map((h) => h.ticker)} />
      <p className="desk__lede" style={{ marginTop: 18 }}>
        <Link href="/settings/family">Family</Link>
        {" · "}
        <Link href="/settings/crash-letter">Crash letter</Link>
      </p>
    </div>
  );
}
