import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { CurrencyChip } from "@/components/features/desk/CurrencyChip";
import { DeskNav } from "@/components/features/desk/DeskNav";
import { TickerSearch } from "@/components/features/desk/TickerSearch";
import { initials, roleLabel, type DeskSession } from "@/lib/desk/session";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function AppShell({
  session,
  displayCurrency,
  children,
}: {
  session: DeskSession;
  displayCurrency: NativeCurrency;
  children: React.ReactNode;
}) {
  return (
    <div className="desk">
      <header className="desk__top">
        <Link href="/desk" className="desk__brand">
          <span className="desk__mark" />
          <span className="desk__word">Thesis</span>
        </Link>
        <TickerSearch />
        <div className="desk__right">
          <CurrencyChip currency={displayCurrency} />
          <div className="desk__who">
            <strong>
              <Link href="/settings/profile">{session.fullName}</Link>
            </strong>
            <span>
              <Link href="/settings/profile">Profile</Link>
              {" · "}
              {roleLabel(session.role)}
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
        <DeskNav />
        <main className="desk__main">{children}</main>
      </div>
    </div>
  );
}
