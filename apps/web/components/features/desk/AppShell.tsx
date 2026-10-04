import Link from "next/link";

import { EqvesteMark } from "@/components/features/brand/EqvesteMark";
import { EqvesteWord } from "@/components/features/brand/EqvesteWord";
import { AccountMenu } from "@/components/features/desk/AccountMenu";
import { CurrencyChip } from "@/components/features/desk/CurrencyChip";
import { DeskNav } from "@/components/features/desk/DeskNav";
import { ObservabilityPing } from "@/components/features/desk/ObservabilityPing";
import { TickerSearch } from "@/components/features/desk/TickerSearch";
import { deskFont } from "@/lib/desk/font";
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
    <div className={`desk ${deskFont.variable}`}>
      <div className="desk__blobs" aria-hidden>
        <span className="desk__blob desk__blob--a" />
        <span className="desk__blob desk__blob--b" />
        <span className="desk__blob desk__blob--c" />
      </div>
      <ObservabilityPing />
      <header className="desk__top">
        <Link href="/desk" className="desk__brand">
          <EqvesteMark gid="eqeg-desk" size={28} />
          <EqvesteWord className="desk__word" />
        </Link>
        <TickerSearch />
        <div className="desk__right">
          {running ? (
            <Link href={running.href} className="desk__plan-chip" title="Open analysis progress">
              {running.label}
            </Link>
          ) : null}
          <Link href="/billing" className="desk__plan-chip" title="Open Subscription">
            Subscription · {planChip}
          </Link>
          <CurrencyChip currency={displayCurrency} />
          <AccountMenu fullName={session.fullName} />
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
