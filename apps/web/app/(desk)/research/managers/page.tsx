import { ManagersForms } from "@/components/features/family/ManagersForms";
import { requireDeskSession } from "@/lib/desk/session";
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

  return (
    <div>
      <h1 className="desk__h1">Managers</h1>
      <p className="desk__lede">
        Idea generation only, 13F is 45 days stale, not for timing. Login does not scan.
      </p>
      {(watches ?? []).length === 0 ? (
        <p className="pf__empty">No watches. Empty list shows no clone flags.</p>
      ) : (
        <ul>
          {(watches ?? []).map((w) => (
            <li key={String(w.id)}>{String(w.name)}</li>
          ))}
        </ul>
      )}
      {flags.length > 0 ? (
        <p className="pf__banner">
          F1+F2 trigger:{" "}
          {flags.map(([t]) => (
            <a key={t} href={`/analyse?ticker=${t}`} style={{ marginRight: 8 }}>
              {t}
            </a>
          ))}
        </p>
      ) : null}
      <ManagersForms />
    </div>
  );
}
