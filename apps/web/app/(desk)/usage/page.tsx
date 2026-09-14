import { loadUsageSnapshot, usageCaption } from "@/lib/usage/load";
import { requireDeskSession } from "@/lib/desk/session";

export default async function UsagePage() {
  const session = await requireDeskSession();
  const snap = await loadUsageSnapshot(session.familyId);
  const label = usageCaption(snap);

  return (
    <div>
      <h1 className="desk__h1">Usage</h1>
      <p className="desk__lede">
        Counts <code>usage_events</code> kinds search, refine, and refine_gate for this
        billing month — the same set as <code>thesis_family_meter_count</code>. Opening this
        page does not insert a row.
      </p>
      <div className="desk__kpis" style={{ marginTop: 22 }}>
        <div className="desk__card">
          <p className="desk__kpi-k">Analyses this cycle</p>
          <p className="desk__kpi-v">{label}</p>
          <p className="desk__kpi-s">{snap.planName ?? "No plan"} · searches meter</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Model spend (MTD)</p>
          <p className="desk__kpi-v">${(snap.costCents / 100).toFixed(2)}</p>
          <p className="desk__kpi-s">Sum of usage_events.cost_cents this month</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Wallet</p>
          <p className="desk__kpi-v">${(snap.walletCents / 100).toFixed(2)}</p>
          <p className="desk__kpi-s">wallets.balance_cents</p>
        </div>
      </div>
      {snap.exhausted ? (
        <p className="pf__banner" style={{ marginTop: 16 }}>
          Allowance exhausted. Saved notes stay readable. New model calls are blocked.
        </p>
      ) : null}
      {snap.notices.map((n) => (
        <p className="pf__banner" key={n.pct} style={{ marginTop: 10 }}>
          {n.message}
        </p>
      ))}
    </div>
  );
}
