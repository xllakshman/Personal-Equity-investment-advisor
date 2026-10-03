import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { EqvesteMark } from "@/components/features/brand/EqvesteMark";
import { EqvesteWord } from "@/components/features/brand/EqvesteWord";
import { CurrencyChip } from "@/components/features/desk/CurrencyChip";
import { DeskNav } from "@/components/features/desk/DeskNav";
import { ObservabilityPing } from "@/components/features/desk/ObservabilityPing";
import { TickerSearch } from "@/components/features/desk/TickerSearch";
import { initials, roleLabel, type DeskSession } from "@/lib/desk/session";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function AppShell({
  session,
  displayCurrency,
  meterLabel,
  meterHint,
  meterPct,
  planChip,
  children,
}: {
  session: DeskSession;
  displayCurrency: NativeCurrency;
  meterLabel: string;
  meterHint: string;
  meterPct: number;
  planChip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="desk">
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
          <Link href="/billing" className="desk__plan-chip" title="Subscription">
            <span className="desk__plan-chip-k">Subscription</span>
            <span className="desk__plan-chip-v">{planChip}</span>
          </Link>
          <CurrencyChip currency={displayCurrency} />
          <div className="desk__who">
            <strong>
              <Link href="/settings/profile">{session.fullName}</Link>
            </strong>
            <span>
              <Link href="/settings/profile">Profile</Link>
              {" · "}
              {roleLabel(session.role, session.memberRole)}
            </span>
          </div>
          <span className="desk__avatar" aria-hidden>
            {initials(session.fullName)}
          </span>
          <form action={signOut}>
            <button className="desk__signout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="desk__body">
        <DeskNav
          meterLabel={meterLabel}
          meterHint={meterHint}
          meterPct={meterPct}
        />
        <main className="desk__main">{children}</main>
      </div>
    </div>
  );
}
