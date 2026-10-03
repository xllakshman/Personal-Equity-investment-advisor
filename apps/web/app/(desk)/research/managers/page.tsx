import { ManagersForms } from "@/components/features/family/ManagersForms";
import { EliteInvestorDesk } from "@/components/features/research/EliteInvestorDesk";
import { requireDeskSession } from "@/lib/desk/session";
import { loadPersistedSnapshot } from "@/lib/research/elite-store";
import { createClient } from "@/lib/supabase/server";

export default async function ManagersPage() {
  const session = await requireDeskSession();
  const supabase = await createClient();
  const { data: watches } = await supabase
    .from("manager_watches")
    .select("id, name")
    .eq("family_id", session.familyId)
    .order("name");
  const { data: snaps } = await supabase
    .from("manager_holdings_snapshots")
    .select("ticker, manager_id")
    .eq("family_id", session.familyId);
  const { data: held } = await supabase
    .from("holdings")
    .select("ticker")
    .eq("family_id", session.familyId);
  const heldSet = new Set((held ?? []).map((h) => String(h.ticker)));
  const counts = new Map<string, number>();
  for (const s of snaps ?? []) {
    const t = String(s.ticker);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const flags = [...counts.entries()].filter(([t, n]) => n >= 3 && !heldSet.has(t));
  const elite = await loadPersistedSnapshot(supabase);

  return (
    <div>
      <h1 className="desk__h1">Elite Investor Portfolios</h1>
      <p className="desk__lede">
        Twenty well-known investors. Company weights come from the filer’s latest
        13F-HR on SEC EDGAR. This is not a broker and not your personal book.
        Filings are often about 45 days old, so they are not for timing a trade.
      </p>
      <EliteInvestorDesk initial={elite} />
      {(watches ?? []).length === 0 ? null : (
        <ul className="admin__list" style={{ marginTop: 18 }}>
          {(watches ?? []).map((w) => (
            <li key={String(w.id)}>{String(w.name)}</li>
          ))}
        </ul>
      )}
      {flags.length > 0 ? (
        <p className="pf__banner">
          Names several managers hold that you do not:{" "}
          {flags.map(([t]) => (
            <a key={t} href={`/analyse?ticker=${t}`} style={{ marginRight: 8 }}>
              {t}
            </a>
          ))}
        </p>
      ) : null}
      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2 className="bld__h2">Watch another name</h2>
        <p className="pf__lede">
          Add a public manager beyond the twenty above. Scanning looks for
          overlapping names across the people you watch. Confirm scan pulls the
          latest 13F for a watched name that matches the twenty-investor catalog
          and writes <code>manager_holdings_snapshots</code>. Public filings are
          idea generation only and often 45 days old.
        </p>
        <ManagersForms />
      </div>
    </div>
  );
}
