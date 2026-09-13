import { EmptyState } from "@/components/features/desk/EmptyState";
import { normalizeTicker } from "@/lib/desk/ticker";

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker: raw } = await searchParams;
  const ticker = raw ? normalizeTicker(raw) : "";
  const body = ticker
    ? `You asked to analyse ${ticker}. The request builder is not on this page yet. Nothing was queued — this screen does not call thesis_accept_analysis.`
    : "Pick a ticker in the header. Analyse only runs for names already on holdings. The request builder is not on this page yet.";
  return <EmptyState title="New analysis" body={body} />;
}
