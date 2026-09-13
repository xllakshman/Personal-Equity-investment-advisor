import { AppShell } from "@/components/features/desk/AppShell";
import { requireDeskSession } from "@/lib/desk/session";
import { loadPortfolioSettings } from "@/lib/portfolio/load";

import "./desk.css";

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireDeskSession();
  const settings = await loadPortfolioSettings(session.familyId);
  return (
    <AppShell session={session} displayCurrency={settings.displayCurrency}>
      {children}
    </AppShell>
  );
}
