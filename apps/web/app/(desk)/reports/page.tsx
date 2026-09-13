import { loadReportList } from "@/lib/analyse/load-request";
import { requireDeskSession } from "@/lib/desk/session";

export default async function ReportsPage() {
  const session = await requireDeskSession();
  const rows = await loadReportList(session.familyId);

  return (
    <div>
      <h1 className="desk__h1">Reports</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Saved notes from the <code>reports</code> table. Queued rows on{" "}
        <code>analysis_requests</code> are not listed here until the worker writes a
        ready note. The note reader is not on this page yet.
      </p>
      {rows.length === 0 ? (
        <p className="pf__empty" style={{ marginTop: 22 }}>
          No saved notes yet.
        </p>
      ) : (
        <div className="pf__table-wrap" style={{ marginTop: 22 }}>
          <table className="pf__table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th>Verdict</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="pf__ticker">{r.ticker}</td>
                  <td>{r.name}</td>
                  <td>{r.verdict}</td>
                  <td className="pf__muted">
                    {r.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
