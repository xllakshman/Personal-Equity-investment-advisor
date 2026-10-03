import { PaymentSlot, PlanCards, TopupForm } from "@/components/features/billing/BillingView";
import { WeeklyDigestToggle } from "@/components/features/billing/WeeklyDigestToggle";
import { planCardTitle, planLimitLabel } from "@/lib/billing/plan-titles";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";
import { loadUsageSnapshot } from "@/lib/usage/load";
import { planStatusLabel, usageCaption, usageHumanHint } from "@/lib/usage/format";

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
    limitLabel: planLimitLabel(String(p.slug), Number(p.monthly_analysis_limit ?? 0)),
    who: String(p.who_copy ?? ""),
    why: String(p.why_copy ?? ""),
    current: snap.planSlug === String(p.slug),
  }));
  const { data: pendingInvoice } = await supabase
    .from("invoices")
    .select("plan_id")
    .eq("family_id", session.familyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pendingPlanId = pendingInvoice?.plan_id ? String(pendingInvoice.plan_id) : null;
  const pendingTitle = pendingPlanId
    ? (cards.find((c) => c.id === pendingPlanId)?.title ?? null)
    : null;

  return (
    <div>
      <h1 className="desk__h1">Subscription</h1>
      <p className="desk__lede">
        Your plan, analyses this month, and wallet. Subscribe saves a request and
        emails the operator. The plan on this page does not change until they
        Activate it. Pay UPI to the VPA below.
      </p>

      <section className="desk__card desk__current-plan" style={{ marginTop: 22 }}>
        <p className="desk__kpi-k">Current subscription</p>
        <p className="desk__kpi-v">{snap.planName ?? "No plan"}</p>
        <p className="desk__kpi-s">
          Status: {planStatusLabel(snap.billingStatus, snap.exhausted)}
          {" · "}
          {usageHumanHint(snap)}
        </p>
      </section>

      <div className="desk__kpis" style={{ marginTop: 22 }}>
        <div className="desk__card">
          <p className="desk__kpi-k">Analyses this month</p>
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
      {pendingTitle ? (
        <p className="pf__banner" style={{ marginTop: 16 }}>
          Requested {pendingTitle}. Pay the UPI VPA below. This page still shows
          your current plan until Admin → Accounts Activate.
        </p>
      ) : null}
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
        <h2>Wallet</h2>
        <p className="desk__kpi-v">${(snap.walletCents / 100).toFixed(2)}</p>
        <TopupForm />
      </div>
      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2>How to pay</h2>
        <PaymentSlot />
      </div>
      {session.memberRole === "owner" ? (
        <WeeklyDigestToggle optedIn={Boolean(family?.weekly_digest_opt_in)} />
      ) : null}
      <PlanCards cards={cards} pendingPlanId={pendingPlanId} />
    </div>
  );
}
