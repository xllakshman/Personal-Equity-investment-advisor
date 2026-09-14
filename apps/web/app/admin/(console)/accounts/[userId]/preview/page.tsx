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
      <p>Read-only preview. Run analysis is not on this page.</p>
      <h1>View as {user?.email ?? userId}</h1>
      <p>
        {user?.full_name} · {user?.tax_residency}
      </p>
      <h2>Notes (metadata)</h2>
      <ul>
        {(reports ?? []).map((r) => (
          <li key={String(r.name)}>
            {String(r.ticker)} · {String(r.name)} · {String(r.verdict)}
          </li>
        ))}
      </ul>
      <form action={closeImpersonation}>
        <input type="hidden" name="targetUserId" value={userId} />
        <button type="submit">Close impersonation</button>
      </form>
    </div>
  );
}
