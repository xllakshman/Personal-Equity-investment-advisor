import { TopupForm, PlanCards } from "@/components/features/billing/BillingView";
import { WeeklyDigestToggle } from "@/components/features/billing/WeeklyDigestToggle";
import { planCardTitle } from "@/lib/billing/plan-titles";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";
import { loadUsageSnapshot } from "@/lib/usage/load";

export default async function BillingPage() {
  const session = await requireDeskSession();
  const supabase = await createClient();
  const snap = await loadUsageSnapshot(session.familyId);
  const { data: family } = await supabase
    .from("families")
    .select("weekly_digest_opt_in")
    .eq("id", session.familyId)
    .maybeSingle();
  const { data: plans } = await supabase
    .from("plans")
    .select("id, slug, name, price_cents, monthly_analysis_limit, who_copy, why_copy")
    .eq("is_active", true)
    .order("sort_order");

  const cards = (plans ?? []).map((p) => ({
    id: String(p.id),
    slug: String(p.slug),
    title: planCardTitle(String(p.slug), String(p.name)),
    name: String(p.name),
    priceCents: Number(p.price_cents ?? 0),
    limit: Number(p.monthly_analysis_limit ?? 0),
    who: String(p.who_copy ?? ""),
    why: String(p.why_copy ?? ""),
    current: snap.planSlug === String(p.slug),
  }));

  return (
    <div>
      <h1 className="desk__h1">Plans & wallet</h1>
      <p className="desk__lede">
        Cards from <code>plans</code>. Current plan is <code>families.plan_id</code>. Pay
        does not insert <code>invoices</code> until a merchant is named (P6-03 placeholder).
      </p>
      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2>Wallet</h2>
        <p className="desk__kpi-v">${(snap.walletCents / 100).toFixed(2)}</p>
        <p className="desk__kpi-s">wallets.balance_cents for this family</p>
        <TopupForm />
      </div>
      {session.memberRole === "owner" ? (
        <WeeklyDigestToggle optedIn={Boolean(family?.weekly_digest_opt_in)} />
      ) : null}
      <PlanCards cards={cards} />
    </div>
  );
}
