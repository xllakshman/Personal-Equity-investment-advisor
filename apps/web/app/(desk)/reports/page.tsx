import { ReportsDeskView } from "@/components/features/report/ReportsDeskView";
import { loadDeskNotes } from "@/lib/reports/load";
import { requireDeskSession } from "@/lib/desk/session";

/** Open PDF on a card waits on GET /reports/:id/pdf Playwright re-render. */
export const maxDuration = 60;

export default async function ReportsPage() {
  const session = await requireDeskSession();
  const rows = await loadDeskNotes(session.familyId);
  return <ReportsDeskView rows={rows} />;
}
