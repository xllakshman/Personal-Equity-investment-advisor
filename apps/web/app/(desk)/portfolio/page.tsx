import { CsvImportCard } from "@/components/features/portfolio/CsvImportCard";
import { DisplayCurrencyCard } from "@/components/features/portfolio/DisplayCurrencyCard";
import { EntryTranchesForm } from "@/components/features/portfolio/EntryTranchesForm";
import { ManualAddForm } from "@/components/features/portfolio/ManualAddForm";
import { PortfolioHoldingsGrid } from "@/components/features/portfolio/PortfolioHoldingsGrid";
import { normalizeTicker } from "@/lib/desk/ticker";
import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import {
  loadHoldingsGrid,
  loadPortfolioSettings,
  loadRecentRejected,
} from "@/lib/portfolio/load";
import { displayRateThisLoad, fetchUsdInrRate } from "@/lib/portfolio/fx-live";
import { SupportGrantForm } from "@/components/features/portfolio/SupportGrantForm";
import { loadInvestorProfile } from "@/lib/profile/load";

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
    return "Display currency saved. Stored costs were not converted.";
  }
  if (sp.ok === "tranches") {
    return "Entry tranches saved. The next Analyse Submit sends T1–T4 with the pack.";
  }
  if (sp.ok === "edit" && sp.ticker) {
    return `Updated ${sp.ticker}. Stored costs were not converted.`;
  }
  if (sp.ok === "deleted") {
    return "Removed that name. Saved notes stay on Reports.";
  }
  if (sp.ok === "denied") {
    return "Viewers can read this book but cannot change lots.";
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
  const liveFx = await fetchUsdInrRate();
  const fxThisLoad = displayRateThisLoad(liveFx, settings.fxUsdInrOverride);
  const notice = banner(sp);
  const profileLoad = await loadInvestorProfile(session.familyId, session.userId);

  return (
    <div className="desk__screen">
      <p className="desk__kicker">Portfolio</p>
      <h1 className="desk__h1">Your holdings</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Upload a spreadsheet or add a name. Display currency does not change stored
        costs. You can still analyse a stock that is not in this book.
      </p>
      {notice ? <p className="pf__banner">{notice}</p> : null}
      {add ? (
        <p className="pf__banner">
          Add {add} to the book if you want qty and cost on Analyse. Header search
          already opened the builder for that ticker.
        </p>
      ) : null}

      <div className="pf__trio">
        <DisplayCurrencyCard
          displayCurrency={settings.displayCurrency}
          fxUsdInrOverride={settings.fxUsdInrOverride}
          liveRate={fxThisLoad.rate}
          rateSource={fxThisLoad.source}
        />
        <CsvImportCard />
        <ManualAddForm presetTicker={add} />
      </div>

      {profileLoad.ok ? (
        <div style={{ marginTop: 16 }}>
          <EntryTranchesForm
            isOwner={profileLoad.isOwner}
            tranches={{
              tranche_t1_pct: profileLoad.profile.tranche_t1_pct,
              tranche_t2_pct: profileLoad.profile.tranche_t2_pct,
              tranche_t3_pct: profileLoad.profile.tranche_t3_pct,
              tranche_t4_pct: profileLoad.profile.tranche_t4_pct,
            }}
          />
        </div>
      ) : (
        <p className={profileLoad.missingTable ? "pf__banner" : "pf__error"}>
          {profileLoad.error}
        </p>
      )}

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

      <PortfolioHoldingsGrid
        holdings={holdings}
        canWrite={canWriteFamily(session)}
      />
      {session.memberRole === "owner" ? <SupportGrantForm /> : null}
    </div>
  );
}
