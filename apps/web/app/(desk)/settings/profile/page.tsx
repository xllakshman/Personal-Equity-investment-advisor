import { ProfileForm } from "@/components/features/profile/ProfileForm";
import { requireDeskSession } from "@/lib/desk/session";
import { loadInvestorProfile } from "@/lib/profile/load";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const session = await requireDeskSession();
  const { ok } = await searchParams;
  const loaded = await loadInvestorProfile(session.familyId, session.userId);

  return (
    <div>
      <h1 className="desk__h1">Profile</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Framework knobs for this family. The worker reads{" "}
        <code>investor_profiles</code> later; this page is the owner save path.
        Defaults are not Maya&apos;s May 2026 book.{" "}
        <a href="/settings/family">Family</a>
        {" · "}
        <a href="/settings/crash-letter">Crash letter</a>
      </p>
      {ok === "1" ? (
        <p className="pf__banner">Saved. Reload still shows the values you just wrote.</p>
      ) : null}
      {!loaded.ok ? (
        <p className={loaded.missingTable ? "pf__banner" : "pf__error"}>{loaded.error}</p>
      ) : (
        <ProfileForm
          residency={loaded.residency}
          isOwner={loaded.isOwner}
          profile={loaded.profile}
        />
      )}
    </div>
  );
}
