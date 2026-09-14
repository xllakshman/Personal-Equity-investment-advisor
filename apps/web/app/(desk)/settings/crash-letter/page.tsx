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
    `If the book drops 30%+, do not abandon F1–F6.\n\nHoldings from view holdings:\n${seed}\n`;

  return (
    <div>
      <h1 className="desk__h1">Crash letter</h1>
      <p className="desk__lede">
        Saved on <code>crash_letters</code> for this family. Names come from view{" "}
        <code>holdings</code>, not a personal AMZN book. Opening Desk does not call a model.
      </p>
      <CrashLetterForm defaultBody={String(defaultBody)} />
    </div>
  );
}
