import Link from "next/link";

import { adminSignOut } from "@/app/admin/actions";
import { requirePlatformAdmin } from "@/lib/admin/session";

import "./admin.css";

const ADMIN_NAV = [
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/prompt", label: "Prompt" },
  { href: "/admin/observability", label: "Observability" },
] as const;

export default async function AdminSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePlatformAdmin();
  return (
    <div className="admin">
      <header className="admin__top">
        <strong>eqveste admin</strong>
        <nav className="admin__nav">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span>{session.email}</span>
        <form action={adminSignOut}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main className="admin__main">{children}</main>
    </div>
  );
}
