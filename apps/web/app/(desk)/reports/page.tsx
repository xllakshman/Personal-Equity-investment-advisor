import { ReportsDeskView } from "@/components/features/report/ReportsDeskView";
import { loadDeskNotes } from "@/lib/reports/load";
import { requireDeskSession } from "@/lib/desk/session";

export default async function ReportsPage() {
  const session = await requireDeskSession();
  const rows = await loadDeskNotes(session.familyId);
  return <ReportsDeskView rows={rows} />;
}
