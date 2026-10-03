"use client";

import { adminSignOut } from "@/app/admin/actions";

export function AdminSignOutButton() {
  return (
    <form
      action={async () => {
        try {
          await adminSignOut();
        } finally {
          window.location.replace("/admin/login");
        }
      }}
    >
      <button className="desk__signout" type="submit">
        Sign out
      </button>
    </form>
  );
}
