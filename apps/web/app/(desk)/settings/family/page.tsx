import { InviteForm } from "@/components/features/family/InviteForm";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export default async function FamilySettingsPage() {
  const session = await requireDeskSession();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("family_members")
    .select("user_id, member_role, is_active")
    .eq("family_id", session.familyId);

  return (
    <div>
      <h1 className="desk__h1">Family</h1>
      <p className="desk__lede">
        Invites add <code>family_members</code> on this <code>family_id</code>. Existing{" "}
        <code>reports</code> stay on that family. Viewers cannot call{" "}
        <code>thesis_accept_analysis</code>.
      </p>
      <div className="desk__card" style={{ marginTop: 22 }}>
        {(members ?? []).map((m) => (
          <p key={String(m.user_id)}>
            {String(m.user_id).slice(0, 8)} · {String(m.member_role)}
            {m.is_active ? "" : " (inactive)"}
          </p>
        ))}
      </div>
      {session.memberRole === "owner" ? (
        <div className="desk__card" style={{ marginTop: 22 }}>
          <InviteForm />
        </div>
      ) : (
        <p className="desk__lede">Only the owner can invite.</p>
      )}
    </div>
  );
}
