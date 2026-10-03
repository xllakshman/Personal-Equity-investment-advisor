"use client";

import { signOut } from "@/app/(auth)/actions";
import { unsignedVisitorHref } from "@/lib/auth/paths";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        try {
          await signOut();
        } finally {
          window.location.replace(unsignedVisitorHref());
        }
      }}
    >
      <button className="desk__signout" type="submit">
        Sign out
      </button>
    </form>
  );
}
