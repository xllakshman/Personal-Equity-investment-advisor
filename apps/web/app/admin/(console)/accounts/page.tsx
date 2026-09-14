import { openImpersonation } from "@/app/admin/(console)/console-actions";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { meterEventCount } from "@/lib/desk/usage-meter";

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default async function AdminAccountsPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const period = monthStartUtc();
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, tax_residency, role, created_at")
    .neq("role", "platform_admin")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = [];
  for (const u of users ?? []) {
    const { data: mem } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", u.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    let plan = "—";
    let used = 0;
    let limit: number | null = null;
    let mtd = 0;
    if (mem?.family_id) {
      const { data: fam } = await supabase
        .from("families")
        .select("plan_id")
        .eq("id", mem.family_id)
        .maybeSingle();
      if (fam?.plan_id) {
        const { data: p } = await supabase
          .from("plans")
          .select("slug, monthly_analysis_limit")
          .eq("id", fam.plan_id)
          .maybeSingle();
        plan = p?.slug ?? "—";
        limit = p?.monthly_analysis_limit ?? null;
      }
      const { data: usage } = await supabase
        .from("usage_events")
        .select("kind, cost_cents")
        .eq("family_id", mem.family_id)
        .eq("billing_period", period);
      used = meterEventCount((usage ?? []).map((e) => String(e.kind)));
      mtd = (usage ?? []).reduce((s, e) => s + Number(e.cost_cents ?? 0), 0);
    }
    rows.push({
      id: String(u.id),
      email: String(u.email ?? ""),
      name: String(u.full_name ?? ""),
      residency: String(u.tax_residency ?? ""),
      plan,
      used,
      limit,
      mtd,
    });
  }

  return (
    <div>
      <h1>Accounts</h1>
      <p>Metadata only. Lot quantities are not on this table.</p>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Residency</th>
            <th>Plan</th>
            <th>Searches</th>
            <th>MTD $</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.email}</td>
              <td>{r.name}</td>
              <td>{r.residency}</td>
              <td>{r.plan}</td>
              <td>
                {r.used} / {r.limit ?? "—"}
              </td>
              <td>{(r.mtd / 100).toFixed(2)}</td>
              <td>
                <form action={openImpersonation}>
                  <input type="hidden" name="targetUserId" value={r.id} />
                  <button type="submit">View as</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
