import Link from "next/link";

import { adminSignOut } from "@/app/admin/actions";
import { AdminConsoleNav } from "@/components/features/admin/AdminConsoleNav";
import { requirePlatformAdmin } from "@/lib/admin/session";

import "./admin.css";

export default async function AdminSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePlatformAdmin();
  return (
    <div className="admin">
      <header className="admin__top">
        <Link href="/admin/accounts" className="admin__brand">
          <span className="admin__mark" aria-hidden />
          <span className="admin__word">eqveste admin</span>
        </Link>
        <AdminConsoleNav />
        <div className="admin__who">
          <span className="admin__chip">Elevated role</span>
          <span className="admin__email">{session.email}</span>
          <form action={adminSignOut}>
            <button className="admin__signout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="admin__main">{children}</main>
    </div>
  );
}
