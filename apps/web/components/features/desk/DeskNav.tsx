"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { analyseRunningHint } from "@/lib/analyse/in-flight";
import { DESK_NAV } from "@/lib/desk/nav";

export function DeskNav({
  meterLabel,
  meterHint,
  meterPct,
  running = null,
}: {
  meterLabel: string;
  meterHint: string;
  meterPct: number;
  running?: { href: string; label: string; ticker: string } | null;
}) {
  const pathname = usePathname();
  return (
    <nav className="desk__nav" aria-label="Home">
      {DESK_NAV.map((item) => {
        const href = item.href === "/analyse" && running ? running.href : item.href;
        const hint =
          item.href === "/analyse" && running
            ? analyseRunningHint(running.ticker)
            : item.hint;
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={
              pathname === href || pathname.startsWith(`${item.href}/`)
                ? "page"
                : undefined
            }
          >
            <span
              className="desk__nav-dot"
              style={{ background: item.dot, boxShadow: `0 0 10px ${item.dot}` }}
              aria-hidden
            />
            <span className="desk__nav-copy">
              <span className="desk__nav-label">{item.label}</span>
              <span className="desk__nav-hint">{hint}</span>
            </span>
          </Link>
        );
      })}
      <div className="desk__meter">
        <p className="desk__meter-k">This month</p>
        <p className="desk__meter-v">{meterLabel}</p>
        <div className="desk__meter-bar" aria-hidden>
          <div className="desk__meter-fill" style={{ width: `${meterPct}%` }} />
        </div>
        <p className="desk__kpi-s">{meterHint}</p>
        <Link href="/billing" className="desk__upgrade">
          Change Plan
        </Link>
      </div>
    </nav>
  );
}
