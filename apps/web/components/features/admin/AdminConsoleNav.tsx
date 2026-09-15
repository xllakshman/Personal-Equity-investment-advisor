"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_NAV = [
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/prompt", label: "Prompt" },
  { href: "/admin/observability", label: "Observability" },
] as const;

export function AdminConsoleNav() {
  const pathname = usePathname();
  return (
    <nav className="admin__nav" aria-label="Admin console">
      {ADMIN_NAV.map((item) => {
        const current =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={current ? "admin__tab admin__tab--on" : "admin__tab"}
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
