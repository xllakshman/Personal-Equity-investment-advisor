import { AnalyseWizard } from "@/components/features/builder/AnalyseWizard";
import { loadAnalyseBuilder } from "@/lib/analyse/load-builder";
import { requireDeskSession } from "@/lib/desk/session";
import { loadUsageSnapshot } from "@/lib/usage/load";

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const session = await requireDeskSession();
  const { ticker: raw } = await searchParams;
  const [payload, usage] = await Promise.all([
    loadAnalyseBuilder(session.familyId, session.userId, raw ?? ""),
    loadUsageSnapshot(session.familyId),
  ]);
  return <AnalyseWizard payload={payload} usage={usage} />;
}
