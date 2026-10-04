import { AppShell } from "@/components/features/desk/AppShell";
import { analyseRunningChip, analyseWaitHref } from "@/lib/analyse/in-flight";
import { loadInFlightAnalysis } from "@/lib/analyse/load-inflight";
import { requireDeskSession } from "@/lib/desk/session";
import { loadPortfolioSettings } from "@/lib/portfolio/load";
import { loadUsageSnapshot } from "@/lib/usage/load";
import { usageBarPct, usageCaption, usageHumanHint, headerPlanLine } from "@/lib/usage/format";

import "./desk.css";

export default async function DeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireDeskSession();
  const [settings, usage, running] = await Promise.all([
    loadPortfolioSettings(session.familyId),
    loadUsageSnapshot(session.familyId),
    loadInFlightAnalysis(session.familyId),
  ]);
  return (
    <AppShell
      session={session}
      displayCurrency={settings.displayCurrency}
      meterLabel={usageCaption(usage)}
      meterHint={usageHumanHint(usage)}
      meterPct={usageBarPct(usage.used, usage.limit)}
      planChip={headerPlanLine(usage)}
      running={
        running
          ? {
              href: analyseWaitHref(running.id),
              label: analyseRunningChip(running.ticker),
              ticker: running.ticker,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
