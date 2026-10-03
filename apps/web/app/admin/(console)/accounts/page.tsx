import { openImpersonation } from "@/app/admin/(console)/console-actions";
import { AccountPlanForm } from "@/components/features/admin/AccountPlanForm";
import { requirePlatformAdmin } from "@/lib/admin/session";
import {
  splitAdminAccounts,
  type AdminAccountRow,
} from "@/lib/admin/account-rows";
import { planCardTitle } from "@/lib/billing/plan-titles";
import { createClient } from "@/lib/supabase/server";
import { meterEventCount } from "@/lib/desk/usage-meter";

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function AccountsTable({
  rows,
  plans,
  empty,
}: {
  rows: AdminAccountRow[];
  plans: { id: string; title: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="admin__hint" style={{ padding: "14px 18px 18px" }}>{empty}</p>;
  }
  return (
    <div className="admin__scroll">
      <table className="admin__table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Residency</th>
            <th>Plan</th>
            <th>Requested</th>
            <th className="admin__num">Searches</th>
            <th className="admin__num">MTD $</th>
            <th className="admin__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <p style={{ margin: 0, fontWeight: 500 }}>{r.name || "—"}</p>
                <p className="admin__email" style={{ margin: "2px 0 0" }}>
                  {r.email}
                </p>
              </td>
              <td className="admin__muted">{r.residency || "—"}</td>
              <td>
                {r.plan}
                <p className="admin__email" style={{ margin: "2px 0 0" }}>
                  {r.billingStatus}
                </p>
              </td>
              <td>{r.pendingTitle ?? "—"}</td>
              <td className="admin__num">
                {r.used} / {r.limit ?? "—"}
              </td>
              <td className="admin__num">{(r.mtd / 100).toFixed(2)}</td>
              <td className="admin__actions">
                <div className="admin__row-actions">
                  {r.familyId ? (
                    <AccountPlanForm
                      familyId={r.familyId}
                      plans={plans}
                      currentPlanId={r.planId}
                      pendingPlanId={r.pendingPlanId}
                    />
                  ) : (
                    <span className="admin__muted">—</span>
                  )}
                  <form action={openImpersonation}>
                    <input type="hidden" name="targetUserId" value={r.id} />
                    <button className="admin__btn" type="submit">
                      View as
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAccountsPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const period = monthStartUtc();
  const { data: planRows } = await supabase
    .from("plans")
    .select("id, slug, name")
    .order("sort_order");
  const plans = (planRows ?? []).map((p) => ({
    id: String(p.id),
    slug: String(p.slug),
    title: planCardTitle(String(p.slug), String(p.name)),
  }));
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, tax_residency, role, created_at")
    .neq("role", "platform_admin")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: AdminAccountRow[] = [];
  for (const u of users ?? []) {
    const { data: mem } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", u.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    let plan = "—";
    let planId: string | null = null;
    let billingStatus = "—";
    let pendingTitle: string | null = null;
    let pendingPlanId: string | null = null;
    let used = 0;
    let limit: number | null = null;
    let mtd = 0;
    const familyId = mem?.family_id ? String(mem.family_id) : "";
    if (familyId) {
      const { data: fam } = await supabase
        .from("families")
        .select("plan_id, billing_status")
        .eq("id", familyId)
        .maybeSingle();
      billingStatus = fam?.billing_status ? String(fam.billing_status) : "—";
      if (fam?.plan_id) {
        planId = String(fam.plan_id);
        const { data: p } = await supabase
          .from("plans")
          .select("slug, name, monthly_analysis_limit")
          .eq("id", fam.plan_id)
          .maybeSingle();
        plan = p?.slug ? planCardTitle(String(p.slug), String(p.name ?? p.slug)) : "—";
        limit = p?.monthly_analysis_limit ?? null;
      }
      const { data: pending } = await supabase
        .from("invoices")
        .select("plan_id")
        .eq("family_id", familyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending?.plan_id) {
        pendingPlanId = String(pending.plan_id);
        pendingTitle =
          plans.find((p) => p.id === pendingPlanId)?.title ?? "Requested";
      }
      const { data: usage } = await supabase
        .from("usage_events")
        .select("kind, cost_cents")
        .eq("family_id", familyId)
        .eq("billing_period", period);
      used = meterEventCount((usage ?? []).map((e) => String(e.kind)));
      mtd = (usage ?? []).reduce((s, e) => s + Number(e.cost_cents ?? 0), 0);
    }
    rows.push({
      id: String(u.id),
      familyId,
      email: String(u.email ?? ""),
      name: String(u.full_name ?? ""),
      residency: String(u.tax_residency ?? ""),
      plan,
      planId,
      billingStatus,
      pendingTitle,
      pendingPlanId,
      used,
      limit,
      mtd,
    });
  }

  const { waiting, existing } = splitAdminAccounts(rows);

  return (
    <div>
      <header className="admin__hero">
        <div>
          <p className="admin__kicker">Platform administration</p>
          <h1 className="admin__h1">Accounts</h1>
          <p className="admin__lede">
            Waiting for activate is Trial families plus invoices.status = pending
            from Subscription Subscribe. Existing is subscribed or cancelled with
            no pending invoice. Activate writes families.plan_id and
            billing_status = subscribed. Deactivate puts the family on Trial.
            Lot quantities are not on this table.
          </p>
        </div>
      </header>
      <section className="admin__card admin__card--table">
        <div className="admin__table-head">
          <h2 className="admin__h2">Waiting for activate</h2>
          <p className="admin__hint">
            New signups still on Trial, and Subscribe requests you have not
            Activated.
          </p>
        </div>
        <AccountsTable
          rows={waiting}
          plans={plans}
          empty="No Trial signups or pending Subscribe invoices."
        />
      </section>
      <section className="admin__card admin__card--table" style={{ marginTop: 16 }}>
        <div className="admin__table-head">
          <h2 className="admin__h2">Existing accounts</h2>
          <p className="admin__hint">
            families.billing_status is subscribed or cancelled, and there is no
            pending invoice.
          </p>
        </div>
        <AccountsTable
          rows={existing}
          plans={plans}
          empty="No activated or cancelled families yet."
        />
      </section>
    </div>
  );
}
