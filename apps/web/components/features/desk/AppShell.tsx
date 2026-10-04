import Link from "next/link";

import { EqvesteWordmark } from "@/components/features/brand/EqvesteWordmark";
import { AccountMenu } from "@/components/features/desk/AccountMenu";
import { CurrencyChip } from "@/components/features/desk/CurrencyChip";
import { DeskNav } from "@/components/features/desk/DeskNav";
import { ObservabilityPing } from "@/components/features/desk/ObservabilityPing";
import { TickerSearch } from "@/components/features/desk/TickerSearch";
import type { DeskSession } from "@/lib/desk/session";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function AppShell({
  session,
  displayCurrency,
  meterLabel,
  meterHint,
  meterPct,
  planChip,
  running = null,
  children,
}: {
  session: DeskSession;
  displayCurrency: NativeCurrency;
  meterLabel: string;
  meterHint: string;
  meterPct: number;
  planChip: string;
  running?: { href: string; label: string; ticker: string } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="desk">
      <ObservabilityPing />
      <header className="desk__top">
        <Link href="/desk" className="desk__brand">
          <EqvesteWordmark gid="eqeg-desk" variant="nav" />
        </Link>
        <TickerSearch />
        <div className="desk__right">
          {running ? (
            <Link href={running.href} className="desk__plan-chip" title="Open analysis progress">
              {running.label}
            </Link>
          ) : null}
          <CurrencyChip currency={displayCurrency} />
          <AccountMenu fullName={session.fullName} planLine={planChip} />
        </div>
      </header>
      <div className="desk__body">
        <DeskNav
          meterLabel={meterLabel}
          meterHint={meterHint}
          meterPct={meterPct}
          running={running}
        />
        <main className="desk__main">{children}</main>
      </div>
    </div>
  );
}
