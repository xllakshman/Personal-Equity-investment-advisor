"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DESK_NAV } from "@/lib/desk/nav";

export function DeskNav({
  meterLabel,
  meterHint,
}: {
  meterLabel: string;
  meterHint: string;
}) {
  const pathname = usePathname();
  return (
    <nav className="desk__nav" aria-label="Desk">
      {DESK_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
              ? "page"
              : undefined
          }
        >
          <span className="desk__nav-label">{item.label}</span>
          <span className="desk__nav-hint">{item.hint}</span>
        </Link>
      ))}
      <div className="desk__meter">
        <p className="desk__meter-k">This cycle</p>
        <p className="desk__meter-v">{meterLabel}</p>
        <p className="desk__kpi-s">{meterHint}</p>
      </div>
    </nav>
  );
}
