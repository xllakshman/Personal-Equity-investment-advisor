import { CrashLetterForm } from "@/components/features/family/CrashLetterForm";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export default async function CrashLetterPage() {
  const session = await requireDeskSession();
  const supabase = await createClient();
  const { data: holdings } = await supabase
    .from("holdings")
    .select("ticker, qty, cost_per_share, native_currency")
    .eq("family_id", session.familyId)
    .order("ticker");
  const { data: letter } = await supabase
    .from("crash_letters")
    .select("body")
    .eq("family_id", session.familyId)
    .maybeSingle();

  const seed = (holdings ?? [])
    .map(
      (h) =>
        `${h.ticker}: ${h.qty} × ${h.cost_per_share} ${h.native_currency} last cost (not a live price)`,
    )
    .join("\n");
  const defaultBody =
    letter?.body ||
    `If the book drops 30%+, do not abandon the plan.\n\nHoldings:\n${seed}\n`;

  return (
    <div>
      <h1 className="desk__h1">Crash letter</h1>
      <p className="desk__lede">
        A letter you write to yourself for a sharp drop. Names come from your
        portfolio, not a sample book. Opening Home does not call a model.
      </p>
      <CrashLetterForm defaultBody={String(defaultBody)} />
    </div>
  );
}
