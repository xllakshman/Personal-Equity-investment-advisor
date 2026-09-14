import Link from "next/link";

import { PdfDownloadButton, RenameForm } from "@/components/features/report/ReportActions";
import { loadReportList } from "@/lib/reports/load";
import { moneyCents } from "@/lib/reports/sections";
import { requireDeskSession } from "@/lib/desk/session";

export default async function ReportsPage() {
  const session = await requireDeskSession();
  const rows = await loadReportList(session.familyId);

  return (
    <div>
      <h1 className="desk__h1">Reports</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Rows from <code>reports</code> for this family. Queued{" "}
        <code>analysis_requests</code> are not listed until the worker inserts a note.
        Sample rows have cost $0.00 and no refine.
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
                <th>Model</th>
                <th>Verdict</th>
                <th>Cost</th>
                <th>Saved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="pf__ticker">{r.ticker}</td>
                  <td>
                    <Link href={`/reports/${r.id}`} style={{ color: "#2f5f52" }}>
                      {r.name}
                    </Link>
                    {r.isLibrarySample ? (
                      <span className="pf__muted"> · sample</span>
                    ) : null}
                  </td>
                  <td>{r.modelId}</td>
                  <td>{r.verdict}</td>
                  <td>{moneyCents(r.tokenCostCents)}</td>
                  <td className="pf__muted">{r.createdAt.slice(0, 10)}</td>
                  <td>
                    <PdfDownloadButton reportId={r.id} ready={Boolean(r.pdfKey)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows[0] ? (
        <div className="desk__card" style={{ marginTop: 22 }}>
          <RenameForm reportId={rows[0].id} currentName={rows[0].name} />
        </div>
      ) : null}
    </div>
  );
}
