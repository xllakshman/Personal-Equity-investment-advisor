import { PaymentSlot, PlanCards, TopupForm } from "@/components/features/billing/BillingView";
import { WeeklyDigestToggle } from "@/components/features/billing/WeeklyDigestToggle";
import { planCardTitle } from "@/lib/billing/plan-titles";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";
import { loadUsageSnapshot } from "@/lib/usage/load";
import { usageCaption, usageHumanHint } from "@/lib/usage/format";

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
      <h1 className="desk__h1">Subscription</h1>
      <p className="desk__lede">
        Your plan, notes this month, wallet, and how to pay. Card payments are not
        connected yet — use UPI until they are.
      </p>

      <div className="desk__kpis" style={{ marginTop: 22 }}>
        <div className="desk__card">
          <p className="desk__kpi-k">Notes this month</p>
          <p className="desk__kpi-v">{usageCaption(snap)}</p>
          <p className="desk__kpi-s">{usageHumanHint(snap)}</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Model spend (this month)</p>
          <p className="desk__kpi-v">${(snap.costCents / 100).toFixed(2)}</p>
          <p className="desk__kpi-s">What ran on your book this month</p>
        </div>
        <div className="desk__card">
          <p className="desk__kpi-k">Wallet</p>
          <p className="desk__kpi-v">${(snap.walletCents / 100).toFixed(2)}</p>
          <p className="desk__kpi-s">Pay-as-you-go balance. It does not expire.</p>
        </div>
      </div>
      {snap.exhausted ? (
        <p className="pf__banner" style={{ marginTop: 16 }}>
          Allowance used up. Saved notes stay readable. New runs are blocked until
          next month or an upgrade.
        </p>
      ) : null}
      {snap.notices.map((n) => (
        <p className="pf__banner" key={n.pct} style={{ marginTop: 10 }}>
          {n.message}
        </p>
      ))}

      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2>Wallet top-up</h2>
        <p className="desk__kpi-v">${(snap.walletCents / 100).toFixed(2)}</p>
        <TopupForm />
        <PaymentSlot cta="Top up with UPI" />
      </div>
      {session.memberRole === "owner" ? (
        <WeeklyDigestToggle optedIn={Boolean(family?.weekly_digest_opt_in)} />
      ) : null}
      <PlanCards cards={cards} />
    </div>
  );
}
