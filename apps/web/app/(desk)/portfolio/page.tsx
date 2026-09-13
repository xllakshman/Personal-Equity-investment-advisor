import { CsvImportCard } from "@/components/features/portfolio/CsvImportCard";
import { DisplayCurrencyCard } from "@/components/features/portfolio/DisplayCurrencyCard";
import { HoldingsTable } from "@/components/features/portfolio/HoldingsTable";
import { ManualAddForm } from "@/components/features/portfolio/ManualAddForm";
import { normalizeTicker } from "@/lib/desk/ticker";
import { displayFxRate } from "@/lib/portfolio/fx";
import { holdingsForDisplay } from "@/lib/portfolio/grid";
import {
  loadHoldingsGrid,
  loadPortfolioSettings,
  loadRecentRejected,
} from "@/lib/portfolio/load";
import { requireDeskSession } from "@/lib/desk/session";

function banner(sp: {
  ok?: string;
  accepted?: string;
  rejected?: string;
  ticker?: string;
  replaced?: string;
}): string | null {
  if (sp.ok === "csv") {
    const a = sp.accepted ?? "0";
    const r = sp.rejected ?? "0";
    const extra = sp.replaced === "1" ? " Existing lots were replaced first." : " Lots were appended.";
    return `Saved ${a} lot(s) from CSV. ${r} row(s) rejected.${extra}`;
  }
  if (sp.ok === "manual" && sp.ticker) {
    return `Added ${sp.ticker}. Open Analyse when you want a request.`;
  }
  if (sp.ok === "fx") {
    return "Display currency saved. Native cost_per_share on lots was not changed.";
  }
  return null;
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    add?: string;
    ok?: string;
    accepted?: string;
    rejected?: string;
    ticker?: string;
    replaced?: string;
  }>;
}) {
  const session = await requireDeskSession();
  const sp = await searchParams;
  const add = sp.add ? normalizeTicker(sp.add) : "";
  const settings = await loadPortfolioSettings(session.familyId);
  const holdings = await loadHoldingsGrid(session.familyId);
  const rejected = await loadRecentRejected(session.familyId);
  const fx = displayFxRate(settings.fxUsdInrOverride);
  const rows = holdingsForDisplay(holdings, settings.displayCurrency, fx);
  const notice = banner(sp);

  return (
    <div>
      <h1 className="desk__h1">Portfolio</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Optional, but it changes the answers: with your holdings loaded,
        position sizes, extra buys and tax all use your real cost.
      </p>
      {notice ? <p className="pf__banner">{notice}</p> : null}
      {add ? (
        <p className="pf__banner">
          Add {add} to the book before analysis. Header search found no row on{" "}
          <code>holdings</code> for this family.
        </p>
      ) : null}

      <div className="pf__cards">
        <CsvImportCard />
        <ManualAddForm presetTicker={add} />
        <DisplayCurrencyCard
          displayCurrency={settings.displayCurrency}
          fxUsdInrOverride={settings.fxUsdInrOverride}
        />
      </div>

      {rejected.length > 0 ? (
        <div className="pf__reject-box">
          <p className="pf__card-title">Rejected import rows</p>
          <ul className="pf__rejects">
            {rejected.map((r, i) => (
              <li key={`${r.created_at}-${i}`}>
                {r.ticker ?? "(blank ticker)"}: {r.reject_reason ?? "rejected"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <HoldingsTable rows={rows} displayCurrency={settings.displayCurrency} />
    </div>
  );
}
