import { ReportReader } from "@/components/features/report/ReportReader";
import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { requireReportDetail } from "@/lib/reports/load";

export default async function ReportReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireDeskSession();
  const { id } = await params;
  const loaded = await requireReportDetail(session.familyId, id);

  return (
    <ReportReader
      report={loaded.report}
      evidence={loaded.evidence}
      refinements={loaded.refinements}
      feedbackSubmitted={loaded.feedbackSubmitted}
      canWrite={canWriteFamily(session)}
    />
  );
}
