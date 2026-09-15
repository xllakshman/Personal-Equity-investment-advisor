import { closeImpersonation } from "@/app/admin/(console)/console-actions";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export default async function ImpersonationPreviewPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requirePlatformAdmin();
  const { userId } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("email, full_name, tax_residency")
    .eq("id", userId)
    .maybeSingle();
  const { data: mem } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const { data: reports } = mem?.family_id
    ? await supabase
        .from("reports_admin_meta")
        .select("ticker, name, verdict, created_at")
        .eq("family_id", mem.family_id)
        .limit(8)
    : { data: [] };

  return (
    <div>
      <div className="admin__impersonate">
        <span className="admin__chip">Read-only</span>
        <span>
          Viewing {user?.email ?? userId} as platform admin · every action is
          written to the audit log
        </span>
      </div>
      <header className="admin__hero" style={{ marginTop: 20 }}>
        <div>
          <p className="admin__kicker">Platform administration</p>
          <h1 className="admin__h1">View as {user?.email ?? userId}</h1>
          <p className="admin__lede">
            {user?.full_name} · {user?.tax_residency}. Run analysis is not on
            this page. Notes are metadata only — not report sections.
          </p>
        </div>
      </header>
      <section className="admin__card">
        <h2 className="admin__h2">Notes (metadata)</h2>
        <ul className="admin__list">
          {(reports ?? []).map((r) => (
            <li key={String(r.name)}>
              {String(r.ticker)} · {String(r.name)} · {String(r.verdict)}
            </li>
          ))}
        </ul>
        <form action={closeImpersonation} style={{ marginTop: 16 }}>
          <input type="hidden" name="targetUserId" value={userId} />
          <button className="admin__btn admin__btn--solid" type="submit">
            Close impersonation
          </button>
        </form>
      </section>
    </div>
  );
}
