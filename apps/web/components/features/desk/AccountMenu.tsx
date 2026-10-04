import Link from "next/link";

import { SignOutButton } from "@/components/features/desk/SignOutButton";
import { initials } from "@/lib/desk/identity";

export function AccountMenu({
  fullName,
  planLine,
}: {
  fullName: string;
  planLine: string;
}) {
  return (
    <>
      <div className="desk__who-row">
        <div className="desk__who">
          <Link href="/settings/profile">
            <strong>{fullName}</strong>
            <span>{planLine}</span>
          </Link>
        </div>
        <span className="desk__avatar" aria-hidden>
          {initials(fullName)}
        </span>
      </div>
      <SignOutButton />
    </>
  );
}
