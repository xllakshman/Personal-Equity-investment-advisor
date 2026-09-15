import { AppShell } from "@/components/features/desk/AppShell";
import { requireDeskSession } from "@/lib/desk/session";
import { loadPortfolioSettings } from "@/lib/portfolio/load";
import { loadUsageSnapshot } from "@/lib/usage/load";
import { usageCaption, usageHumanHint } from "@/lib/usage/format";

import "./desk.css";

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireDeskSession();
  const [settings, usage] = await Promise.all([
    loadPortfolioSettings(session.familyId),
    loadUsageSnapshot(session.familyId),
  ]);
  return (
    <AppShell
      session={session}
      displayCurrency={settings.displayCurrency}
      meterLabel={usageCaption(usage)}
      meterHint={usageHumanHint(usage)}
    >
      {children}
    </AppShell>
  );
}
