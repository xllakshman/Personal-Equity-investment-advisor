import { notFound } from "next/navigation";

import { WaitPanel } from "@/components/features/builder/WaitPanel";
import { loadAnalysisRequest } from "@/lib/analyse/load-request";
import { requireDeskSession } from "@/lib/desk/session";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AnalyseWaitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireDeskSession();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const row = await loadAnalysisRequest(id);
  if (!row) notFound();
  return <WaitPanel initial={row} />;
}
