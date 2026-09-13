import { AnalyseWizard } from "@/components/features/builder/AnalyseWizard";
import { loadAnalyseBuilder } from "@/lib/analyse/load-builder";
import { requireDeskSession } from "@/lib/desk/session";

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const session = await requireDeskSession();
  const { ticker: raw } = await searchParams;
  const payload = await loadAnalyseBuilder(
    session.familyId,
    session.userId,
    raw ?? "",
  );
  return <AnalyseWizard payload={payload} />;
}
