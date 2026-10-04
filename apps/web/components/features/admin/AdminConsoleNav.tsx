"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_NAV = [
  { href: "/admin/accounts", label: "Accounts", hint: "Customers", dot: "#0a84ff" },
  { href: "/admin/plans", label: "Plans", hint: "Limits and agents", dot: "#ff9f0a" },
  { href: "/admin/prompt", label: "Prompt", hint: "What Analyse writes", dot: "#30d158" },
  { href: "/admin/observability", label: "Observability", hint: "Calls and watches", dot: "#bf5af2" },
] as const;

export function AdminConsoleNav() {
  const pathname = usePathname();
  return (
    <nav className="desk__nav" aria-label="Admin console">
      {ADMIN_NAV.map((item) => {
        const current =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
          >
            <span
              className="desk__nav-dot"
              style={{ background: item.dot, boxShadow: `0 0 10px ${item.dot}` }}
              aria-hidden
            />
            <span className="desk__nav-copy">
              <span className="desk__nav-label">{item.label}</span>
              <span className="desk__nav-hint">{item.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
