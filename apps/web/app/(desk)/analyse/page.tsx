import { redirect } from "next/navigation";

import { AnalyseWizard } from "@/components/features/builder/AnalyseWizard";
import { analyseWaitHref } from "@/lib/analyse/in-flight";
import { loadAnalyseBuilder } from "@/lib/analyse/load-builder";
import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
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
  if (payload.inFlight?.id) {
    redirect(analyseWaitHref(payload.inFlight.id));
  }
  return (
    <AnalyseWizard
      key={payload.ticker || "new"}
      payload={payload}
      usage={usage}
      canWrite={canWriteFamily(session)}
    />
  );
}
