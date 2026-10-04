import Link from "next/link";

import { AdminConsoleNav } from "@/components/features/admin/AdminConsoleNav";
import { AdminSignOutButton } from "@/components/features/admin/AdminSignOutButton";
import { EqvesteMark } from "@/components/features/brand/EqvesteMark";
import { EqvesteWord } from "@/components/features/brand/EqvesteWord";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { deskFont } from "@/lib/desk/font";
import { initials } from "@/lib/desk/session";

import "../../(desk)/desk.css";
import "./admin.css";

export default async function AdminSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePlatformAdmin();
  return (
    <div className={`desk ${deskFont.variable}`}>
      <div className="desk__blobs" aria-hidden>
        <span className="desk__blob desk__blob--a" />
        <span className="desk__blob desk__blob--b" />
        <span className="desk__blob desk__blob--c" />
      </div>
      <header className="desk__top">
        <Link href="/admin/accounts" className="desk__brand">
          <EqvesteMark gid="eqeg-admin" size={28} />
          <EqvesteWord className="desk__word" />
        </Link>
        <p className="admin__top-title">Platform admin</p>
        <div className="desk__right">
          <span className="desk__plan-chip" title="Elevated role">
            Role · platform admin
          </span>
          <div className="desk__who">
            <strong>{session.fullName}</strong>
            <span>{session.email}</span>
          </div>
          <span className="desk__avatar" aria-hidden>
            {initials(session.fullName)}
          </span>
          <AdminSignOutButton />
        </div>
      </header>
      <div className="desk__body">
        <AdminConsoleNav />
        <main className="desk__main admin__main">{children}</main>
      </div>
    </div>
  );
}
