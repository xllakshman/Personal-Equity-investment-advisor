"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import { AgentPicker } from "@/components/features/builder/AgentPicker";
import { CancelRunButton } from "@/components/features/builder/CancelRunButton";
import { TickerLookup } from "@/components/features/builder/TickerLookup";
import { ReportNoteBody } from "@/components/features/report/ReportNoteBody";
import { acceptAnalysis } from "@/app/(desk)/analyse/actions";
import { EMPTY_ACCEPT } from "@/lib/analyse/accept-state";
import { guessExchange } from "@/lib/portfolio/exchange";
import { normalizeTicker } from "@/lib/desk/ticker";
import {
  CAGR_BANDS,
  CONFLICT_MSG,
  CONFLICT_TITLE,
  hasRiskCagrSlack,
  isRiskCagrConflict,
  RISK_BANDS,
  SLACK_MSG,
  SLACK_TITLE,
} from "@/lib/analyse/conflict";
import { AVG_DOWN, INTENTS, IN_SLABS, US_SLABS } from "@/lib/analyse/errors";
import {
  allocationNote,
  allocationPct,
  moneyAmount,
} from "@/lib/analyse/format";
import {
  CORE_LENSES,
  isComprehensive,
  LENS_COLORS,
  LENS_COPY,
  selectedLenses,
  toggleLens,
  type LensState,
} from "@/lib/analyse/lenses";
import type { BuilderPayload, HeldLot } from "@/lib/analyse/load-builder";
import { canContinue, defaultModelId, groupModels, modelOnPlan, agentCreditLabel } from "@/lib/analyse/models";
import {
  ANALYSE_STEPS,
  analyseGuide,
  analyseRailItemClass,
  analyseStepsDone,
  firstOpenStep,
} from "@/lib/analyse/steps";
import { analyseWaitHref } from "@/lib/analyse/in-flight";
import { trancheSummary } from "@/lib/profile/tranches";
import { analyseUsageChip, usageCaption } from "@/lib/usage/format";
import type { UsageSnapshot } from "@/lib/usage/types";
import { versionLabel } from "@/lib/reports/versions";

const TAX_RES = [
  { id: "us", label: "US resident" },
  { id: "india", label: "India resident" },
  { id: "uae", label: "Non-resident (UAE / no local CGT)" },
  { id: "nri", label: "Non-resident Indian (NRI)" },
] as const;

const RISK_UI = [
  { id: "low_0_10", label: "Up to 10% fall" },
  { id: "medium_11_20", label: "11–20% fall" },
  { id: "high_21_35", label: "21–35% fall" },
  { id: "extreme_35_plus", label: "More than 35%" },
] as const;

const CAGR_UI = [
  { id: "low_12", label: "Up to 12% a year" },
  { id: "medium_13_18", label: "13–18%" },
  { id: "high_18_25", label: "18–25%" },
  { id: "extreme_25_plus", label: "Above 25%" },
] as const;

const LENS_OPTIONS = [
  ...CORE_LENSES,
  "comprehensive",
  "tax",
] as const;

function nearestSlab(value: string | null, options: readonly string[]): string {
  if (value && options.includes(value)) return value;
  if (value) {
    const hit = options.find((s) => s.replace("%", "") === value.replace("%", ""));
    if (hit) return hit;
  }
  return options[3] ?? options[0] ?? "";
}

function pickHeld(holdings: HeldLot[], ticker: string): HeldLot | null {
  return holdings.find((h) => h.ticker === ticker) ?? null;
}

export function AnalyseWizard({
  payload,
  usage,
  canWrite = true,
}: {
  payload: BuilderPayload;
  usage: UsageSnapshot;
  canWrite?: boolean;
}) {
  const [step, setStep] = useState<"build" | "clarify">("build");
  const [lenses, setLenses] = useState<LensState>({
    fundamental: true,
    technical: true,
    macro: false,
    news: false,
    tax: false,
  });
  const [srcMode, setSrcMode] = useState<"any" | "book">(
    payload.ticker || payload.holdings.length === 0 ? "any" : "book",
  );
  const [ticker, setTicker] = useState(
    () => payload.ticker || payload.holdings[0]?.ticker || "",
  );
  const held = pickHeld(payload.holdings, ticker);
  const [qty, setQty] = useState(held?.qty ?? 0);
  const [cost, setCost] = useState(held?.cost_per_share ?? 0);
  const [portfolio, setPortfolio] = useState(payload.portfolioSize);
  const [intended, setIntended] = useState(0);
  const [intent, setIntent] = useState<(typeof INTENTS)[number]["id"]>("long_term");
  const [avgDown, setAvgDown] = useState<(typeof AVG_DOWN)[number]["id"]>(
    "planned_tranches",
  );
  const [risk, setRisk] = useState<(typeof RISK_BANDS)[number]["id"]>("medium_11_20");
  const [cagr, setCagr] = useState<(typeof CAGR_BANDS)[number]["id"]>("medium_13_18");
  const [taxResidency, setTaxResidency] = useState(payload.taxResidency || "us");
  const [taxSlab, setTaxSlab] = useState(() => {
    const opts = payload.taxResidency === "india" ? IN_SLABS : US_SLABS;
    return nearestSlab(payload.taxSlab, opts);
  });
  const [modelId, setModelId] = useState<string | null>(
    defaultModelId(payload.models, payload.allowedModelIds, payload.planSlug),
  );
  const [conviction, setConviction] = useState("");
  const [addFunds, setAddFunds] = useState("");
  const [exitRule, setExitRule] = useState("");
  const [state, action, pending] = useActionState(acceptAnalysis, EMPTY_ACCEPT);

  useEffect(() => {
    if (!state.requestId) return;
    window.location.assign(analyseWaitHref(state.requestId));
  }, [state.requestId]);

  useEffect(() => {
    if (payload.ticker) setTicker(payload.ticker);
  }, [payload.ticker]);

  useEffect(() => {
    const next = pickHeld(payload.holdings, ticker);
    setQty(next?.qty ?? 0);
    setCost(next?.cost_per_share ?? 0);
  }, [ticker, payload.holdings]);

  const invested = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(cost) ? cost : 0);
  const currency = held?.native_currency ?? payload.currency;
  const picked = selectedLenses(lenses);
  const conflict = isRiskCagrConflict(risk, cagr);
  const slack = hasRiskCagrSlack(risk, cagr);
  const groups = groupModels(payload.models);
  const chosen = payload.models.find((m) => m.id === modelId) ?? null;
  const onPlan = chosen
    ? modelOnPlan(chosen, payload.allowedModelIds, payload.planSlug)
    : false;
  const ok = canContinue({
    hasTicker: Boolean(normalizeTicker(ticker)),
    lensCount: picked.length,
    conflict,
    modelId,
    modelOnPlan: onPlan,
  }) && canWrite && !payload.inFlight;
  const stepDone = analyseStepsDone({
    hasTicker: Boolean(normalizeTicker(ticker)),
    lensCount: picked.length,
    conflict,
    hasTaxResidency: Boolean(taxResidency),
    modelOnPlan: onPlan && Boolean(modelId),
  });
  const guide = analyseGuide(stepDone);
  const currentStep = firstOpenStep(stepDone);
  const alloc = allocationPct(invested, portfolio);
  const coreCount = CORE_LENSES.filter((k) => lenses[k]).length;
  const kindSummary = `${coreCount} of 4`;
  const shareGiven = portfolio > 0 && (invested > 0 || intended > 0);
  const sharePct = allocationPct(invested > 0 ? invested : intended, portfolio);
  const allocS = shareGiven ? `${sharePct.toFixed(0)}%` : "Not given";
  const allocNote = shareGiven
    ? allocationNote(sharePct)
    : "Optional — tell us what you hold and your total, and we will size the answer";
  const lockedFrontier = groups.frontier.some(
    (m) => !modelOnPlan(m, payload.allowedModelIds, payload.planSlug),
  );
  const upgradeNudge = Boolean(chosen && chosen.thesis_class !== "frontier" && lockedFrontier);
  const exchange = held?.exchange || guessExchange(ticker);
  const priorForTicker = payload.priorNotes.filter(
    (n) => n.ticker === normalizeTicker(ticker),
  );

  const runNote = useMemo(() => {
    if (payload.inFlight) {
      return `Finish ${payload.inFlight.ticker} first. Submit stays off until that run is ready or failed.`;
    }
    if (!canWrite) return "Viewers can read notes but cannot start an analysis.";
    if (!normalizeTicker(ticker)) return "Type or pick a stock first";
    if (conflict) return "Your risk limit and return goal don't match yet";
    if (picked.length === 0) return "Pick at least one check";
    if (!onPlan || !modelId) return "Change your plan to run this agent";
    return "Uses 1 analysis from your plan";
  }, [canWrite, ticker, conflict, picked.length, onPlan, modelId, chosen, payload.inFlight]);

  function setResidency(next: string) {
    setTaxResidency(next);
    const opts = next === "india" ? IN_SLABS : US_SLABS;
    setTaxSlab((prev) => nearestSlab(prev, opts));
  }

  function toggleCheck(id: (typeof LENS_OPTIONS)[number]) {
    setLenses((s) => toggleLens(s, id));
  }

  const slabOptions = taxResidency === "india" ? IN_SLABS : US_SLABS;
  const showSlab = taxResidency === "us" || taxResidency === "india";

  return (
    <>
      {payload.inFlight ? (
        <div className="pf__banner">
          {payload.inFlight.ticker} is still {payload.inFlight.status}.{" "}
          <Link href={`/analyse/${payload.inFlight.id}`}>Open that wait page</Link>
          . Submit for analysis stays off until it finishes, or you reset it.
          {canWrite ? (
            <CancelRunButton requestId={payload.inFlight.id} />
          ) : null}
        </div>
      ) : null}
    <form className="bld desk__screen" action={action}>
      <input type="hidden" name="ticker" value={normalizeTicker(ticker)} />
      <input type="hidden" name="exchange" value={exchange} />
      <input type="hidden" name="invested_currency" value={currency} />
      <input type="hidden" name="invested_amount" value={String(invested)} />
      <input type="hidden" name="portfolio_size" value={String(portfolio)} />
      <input type="hidden" name="intended_investment" value={String(intended)} />
      <input type="hidden" name="run_qty" value={String(Number.isFinite(qty) ? qty : 0)} />
      <input type="hidden" name="run_cost_per_share" value={String(Number.isFinite(cost) ? cost : 0)} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="avg_down" value={avgDown} />
      <input type="hidden" name="risk" value={risk} />
      <input type="hidden" name="cagr" value={cagr} />
      <input type="hidden" name="tax_residency" value={taxResidency} />
      <input type="hidden" name="tax_slab" value={taxSlab} />
      <input type="hidden" name="model_id" value={modelId ?? ""} />
      {picked.map((k) => (
        <input key={k} type="hidden" name="lenses" value={k} />
      ))}

      {step === "build" ? (
        <>
          <div className="desk__toolbar">
            <div>
              <p className="desk__kicker">Analyse a stock</p>
              <h1 className="desk__h1">What do you want to decide?</h1>
              <p className="desk__lede">
                Analyse any stock, or one from your portfolio. Either way it uses one
                analysis and the note lands in Reports.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="bld__toolbar-chip">{analyseUsageChip(usage)}</span>
              <Link href="/billing" className="desk__btn desk__btn--light">
                Change Plan
              </Link>
            </div>
          </div>
          <ol className="bld__rail" aria-label="Analysis steps">
            {ANALYSE_STEPS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={analyseRailItemClass(
                    Boolean(stepDone[i]),
                    s.n === currentStep,
                  )}
                >
                  <span>Step {s.n}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
          <p className="bld__guide">{guide}</p>
          {priorForTicker.length > 0 ? (
            <p className="pf__lede" style={{ marginTop: 10 }}>
              Saved research for {normalizeTicker(ticker)}:{" "}
              {priorForTicker.map((n, i) => (
                <span key={n.id}>
                  {i > 0 ? " · " : ""}
                  <Link href={`/reports/${n.id}`}>
                    {n.version != null && n.versionCount > 1
                      ? `v${n.version} of ${n.versionCount}`
                      : n.name}
                  </Link>
                </span>
              ))}
              . A new Submit stores another version; it does not rewrite the last one.
            </p>
          ) : null}

          <div className="bld__grid" style={{ marginTop: 18 }}>
              <div className="bld__col">
                <section className="pf__card" id="analyse-step-1">
                  <h2 className="bld__h2">1 · Which stock?</h2>
                  <p className="pf__lede">Type any stock, or pick one you already own.</p>
                  <div className="bld__src">
                    <button
                      type="button"
                      className={srcMode === "any" ? "bld__src-btn bld__src-btn--on" : "bld__src-btn"}
                      onClick={() => setSrcMode("any")}
                    >
                      Any stock
                    </button>
                    <button
                      type="button"
                      className={srcMode === "book" ? "bld__src-btn bld__src-btn--on" : "bld__src-btn"}
                      onClick={() => {
                        setSrcMode("book");
                        if (!held && payload.holdings[0]) setTicker(payload.holdings[0].ticker);
                      }}
                    >
                      From my portfolio
                    </button>
                  </div>
                  {srcMode === "any" ? (
                    <div className="bld__fields">
                      <label className="pf__label">
                        Stock
                        <TickerLookup
                          value={ticker}
                          onChange={setTicker}
                          placeholder="Ticker, e.g. NVDA"
                        />
                      </label>
                      <label className="pf__label">
                        You hold or plan to put in
                        <input
                          className="pf__input"
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Optional, e.g. 5000"
                          value={intended || ""}
                          onChange={(e) => setIntended(Number(e.target.value) || 0)}
                        />
                      </label>
                      <label className="pf__label">
                        Your total portfolio
                        <input
                          className="pf__input"
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Optional, e.g. 60000"
                          value={portfolio || ""}
                          onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
                        />
                      </label>
                    </div>
                  ) : payload.holdings.length > 0 ? (
                    <div className="bld__picks">
                      {payload.holdings.map((h) => (
                        <button
                          key={`${h.ticker}-${h.exchange}`}
                          type="button"
                          className={ticker === h.ticker ? "bld__src-btn bld__src-btn--on" : "bld__src-btn"}
                          onClick={() => setTicker(h.ticker)}
                        >
                          {h.ticker}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bld__intent" style={{ marginBottom: 14 }}>
                      <span className="bld__intent-dot" aria-hidden />
                      <div>
                        <p>Your portfolio is empty. Add stocks on Review Portfolio, or analyse any stock now.</p>
                        <span>
                          <Link href="/portfolio">Review Portfolio</Link>
                          {" · "}
                          <button type="button" className="desk__privacy-link" onClick={() => setSrcMode("any")}>
                            Any stock
                          </button>
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="bld__share">
                    <div>
                      <p className="bld__share-k">Share of portfolio</p>
                      <p className="bld__share-v">{allocS}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bld__track">
                        <div
                          className="bld__fill"
                          style={{ width: `${shareGiven ? Math.min(100, sharePct) : 0}%` }}
                        />
                      </div>
                      <p className="pf__lede">{allocNote}</p>
                    </div>
                  </div>
                </section>

                <section className="pf__card" id="analyse-step-2">
                  <h2 className="bld__h2">2 · What should we check?</h2>
                  <p className="pf__lede">
                    Pick one or all four — it still counts as one analysis.
                  </p>
                  <div className="bld__kinds" role="group" aria-label="What should we check">
                    {CORE_LENSES.map((id) => {
                      const on = lenses[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className={on ? "bld__kind bld__kind--on" : "bld__kind"}
                          style={{ ["--lens" as string]: LENS_COLORS[id] }}
                          aria-pressed={on}
                          onClick={() => toggleCheck(id)}
                        >
                          <span className={on ? "bld__box bld__box--on" : "bld__box"} />
                          <span>
                            <strong>{LENS_COPY[id].label}</strong>
                            <em>{LENS_COPY[id].desc}</em>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="bld__kinds" style={{ marginTop: 10 }}>
                    {(["comprehensive", "tax"] as const).map((id) => {
                      const on = id === "comprehensive" ? isComprehensive(lenses) : lenses.tax;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={on ? "bld__kind bld__kind--on" : "bld__kind"}
                          aria-pressed={on}
                          onClick={() => toggleCheck(id)}
                        >
                          <span className={on ? "bld__box bld__box--on" : "bld__box"} />
                          <span>
                            <strong>{LENS_COPY[id].label}</strong>
                            <em>{LENS_COPY[id].desc}</em>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="pf__card" id="analyse-step-3">
                  <h2 className="bld__h2">Your position</h2>
                  <p className="pf__lede">
                    If this ticker is in your book, qty and cost are filled. Change
                    them for this run only — that does not edit lots on Home.
                    {payload.entryTranches
                      ? ` Entry plan ${trancheSummary(payload.entryTranches)}. Edit on Review Portfolio.`
                      : " Entry tranches live on Review Portfolio and go with this pack."}{" "}
                    <Link href="/portfolio#entry-tranches">Open Review Portfolio</Link>
                  </p>
                  <div className="bld__pos">
                    <label className="pf__label">
                      <span>Quantity</span>
                      <input
                        className="pf__input bld__mono"
                        type="number"
                        min={0}
                        step="any"
                        value={Number.isFinite(qty) ? qty : 0}
                        onChange={(e) => setQty(Number(e.target.value) || 0)}
                      />
                    </label>
                    <label className="pf__label">
                      <span>Cost per share</span>
                      <input
                        className="pf__input bld__mono"
                        type="number"
                        min={0}
                        step="any"
                        value={Number.isFinite(cost) ? cost : 0}
                        onChange={(e) => setCost(Number(e.target.value) || 0)}
                      />
                    </label>
                    <div>
                      <p className="pf__label">
                        <span>Current value</span>
                      </p>
                      <p className="bld__alloc">{moneyAmount(invested, currency)}</p>
                      <p className="pf__lede">Quantity × cost, in {currency}.</p>
                    </div>
                    <label className="pf__label">
                      <span>Total portfolio size</span>
                      <input
                        className="pf__input bld__mono"
                        type="number"
                        value={Number.isFinite(portfolio) ? portfolio : 0}
                        onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
                      />
                      <span className="bld__meta">{moneyAmount(portfolio, currency)}</span>
                    </label>
                    <div>
                      <p className="pf__label">
                        <span>Share of the book</span>
                      </p>
                      <p className="bld__alloc">{alloc.toFixed(1)}%</p>
                      <div className="bld__track">
                        <div
                          className="bld__fill"
                          style={{ width: `${Math.min(100, alloc)}%` }}
                        />
                      </div>
                      <p className="pf__lede">{allocationNote(alloc)}</p>
                    </div>
                    <label className="pf__label">
                      <span>I plan to invest</span>
                      <input
                        className="pf__input bld__mono"
                        type="number"
                        min={0}
                        step="any"
                        value={Number.isFinite(intended) ? intended : 0}
                        onChange={(e) => setIntended(Number(e.target.value) || 0)}
                      />
                      <span className="bld__meta">
                        Extra capital for this stock, saved with the request.
                        {intended > 0 ? ` ${moneyAmount(intended, currency)}` : ""}
                      </span>
                    </label>
                  </div>
                  <div className="bld__two">
                    <label className="pf__label">
                      <span>Intent</span>
                      <select
                        className="pf__input"
                        value={intent}
                        onChange={(e) =>
                          setIntent(e.target.value as (typeof INTENTS)[number]["id"])
                        }
                      >
                        {INTENTS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pf__label">
                      <span>Willing to average down</span>
                      <select
                        className="pf__input"
                        value={avgDown}
                        onChange={(e) =>
                          setAvgDown(e.target.value as (typeof AVG_DOWN)[number]["id"])
                        }
                      >
                        {AVG_DOWN.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="pf__card" id="analyse-step-4">
                  <h2 className="bld__h2">3 · Your limits</h2>
                  <p className="pf__lede">
                    These two have to match, and we check before spending an analysis.
                  </p>
                  <p className="pf__lede" style={{ fontWeight: 600 }}>
                    How big a fall can you sit through?
                  </p>
                  <div className="bld__pills">
                    {RISK_UI.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={
                          risk === r.id ? "bld__pill bld__pill--risk bld__pill--on" : "bld__pill bld__pill--risk"
                        }
                        onClick={() => setRisk(r.id)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p className="pf__lede" style={{ fontWeight: 600 }}>
                    What return are you aiming for?
                  </p>
                  <div className="bld__pills">
                    {CAGR_UI.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={
                          cagr === c.id ? "bld__pill bld__pill--cagr bld__pill--on" : "bld__pill bld__pill--cagr"
                        }
                        onClick={() => setCagr(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {conflict ? (
                    <div className="bld__alert bld__alert--bad">
                      <p>{CONFLICT_TITLE}</p>
                      <span>
                        A return that high comes with bigger falls than you&apos;ve said you can take. Allow a bigger fall, or aim a little lower — we won&apos;t plan for something that can&apos;t happen.
                      </span>
                    </div>
                  ) : null}
                  {slack ? (
                    <div className="bld__alert bld__alert--warn">
                      <p>{SLACK_TITLE}</p>
                      <span>{SLACK_MSG}</span>
                    </div>
                  ) : null}
                </section>

                <section className="pf__card" id="analyse-step-5">
                  <h2 className="bld__h2">Tax treatment</h2>
                  <p className="pf__lede">
                    Decides how long to hold, and when selling actually makes sense.
                  </p>
                  <div className="bld__two">
                    <label className="pf__label">
                      <span>Residency for tax</span>
                      <select
                        className="pf__input"
                        value={taxResidency}
                        onChange={(e) => setResidency(e.target.value)}
                      >
                        {TAX_RES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {showSlab ? (
                      <label className="pf__label">
                        <span>
                          {taxResidency === "india"
                            ? "Income slab"
                            : "Federal marginal bracket"}
                        </span>
                        <select
                          className="pf__input"
                          value={taxSlab}
                          onChange={(e) => setTaxSlab(e.target.value)}
                        >
                          {slabOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="bld__alert bld__alert--ok">
                        <p>No local capital-gains charge modelled</p>
                        <span>
                          Gains are modelled gross. Indian-listed holdings still
                          attract TDS at source — declare those separately.
                        </span>
                      </div>
                    )}
                  </div>
                  {payload.ltcgHoldingMonths != null ? (
                    <p className="pf__lede">
                      Your profile holding months for long-term: {payload.ltcgHoldingMonths}.
                      {payload.ltcgRateBps != null
                        ? ` Long-term ${(payload.ltcgRateBps / 100).toFixed(2)}%.`
                        : ""}
                      {payload.stcgRateBps != null
                        ? ` Short-term ${(payload.stcgRateBps / 100).toFixed(2)}%.`
                        : ""}
                    </p>
                  ) : null}
                </section>
              </div>

              <aside className="bld__side">
                <section className="bld__ready">
                  <p className="desk__kicker">Ready to run</p>
                  <div className="bld__kv">
                    <span>Stock</span>
                    <b>{normalizeTicker(ticker) || "—"}</b>
                    <span>Checks</span>
                    <b>{kindSummary}</b>
                    <span>Share of portfolio</span>
                    <b>{allocS}</b>
                    <span>Agent</span>
                    <b>{chosen?.label ?? "Basic agent"}</b>
                  </div>
                  <button
                    className="bld__continue"
                    type="submit"
                    name="skip_clarify"
                    value="1"
                    disabled={!ok || pending || Boolean(state.requestId)}
                  >
                    {pending || state.requestId ? "Opening wait page…" : "Run analysis"}
                  </button>
                  <p className="bld__run-note">{runNote}</p>
                </section>
                <div className="bld__intent">
                  <span className="bld__intent-dot" aria-hidden />
                  <div>
                    <p>Run it with a decision in mind</p>
                    <span>
                      Each run costs real compute and uses your allowance. Start one when
                      you&apos;re ready to buy, add, trim or leave it — and finish knowing which.
                    </span>
                  </div>
                </div>
                <section className="pf__card" id="analyse-step-6">
                  <h2 className="bld__h2">4 · Choose your agent</h2>
                  <p className="pf__lede">
                    Ultra, Professional, and Professional + can run Quick and Frontier
                    agents. Trial does not run Frontier. Plan: {payload.planName}.{" "}
                    {usageCaption(usage)} used this cycle.
                  </p>
                  <AgentPicker
                    models={payload.models}
                    allowedIds={payload.allowedModelIds}
                    planSlug={payload.planSlug}
                    planName={payload.planName}
                    selectedId={modelId}
                    onSelect={setModelId}
                  />
                  {upgradeNudge ? (
                    <div className="bld__alert bld__alert--warn">
                      <span>
                        A comprehensive run on a frontier model typically adds two
                        extra evidence layers. On this model the note will be shorter.
                      </span>
                      <Link href="/billing" className="desk__btn" style={{ marginTop: 8 }}>
                        Change Plan
                      </Link>
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          {payload.latestNote ? (
            <ReportNoteBody
              note={payload.latestNote}
              kicker={
                payload.latestNote.version
                  ? `Latest saved research · ${versionLabel(payload.latestNote.version, payload.latestNote.versionCount)} for ${payload.latestNote.ticker}`
                  : `Latest saved research for ${payload.latestNote.ticker}`
              }
            />
          ) : null}
        </>
      ) : (
        <div className="bld__clarify">
          <p className="desk__kicker">Before it runs</p>
          <h1 className="desk__h1">Three things that change the answer</h1>
          <p className="desk__lede">
            We only ask when your answers leave something genuinely open. Skip any
            and the note will tell you what it assumed. Your allowance is not used
            until you run the analysis.
          </p>
          <label className="pf__card bld__q">
            <p>
              {held
                ? `You already hold ${alloc.toFixed(1)}% of your book in ${normalizeTicker(ticker) || "this ticker"}. Is this a conviction position or a legacy one?`
                : `${normalizeTicker(ticker) || "This ticker"} is not in your book yet. Are you starting a position, or researching only?`}
            </p>
            <span>Decides whether the note argues for adding or cutting back.</span>
            <input
              className="pf__input"
              name="conviction"
              value={conviction}
              onChange={(e) => setConviction(e.target.value)}
              placeholder="e.g. conviction — I want it to be 10% eventually"
            />
          </label>
          <label className="pf__card bld__q">
            <p>How much fresh capital could you deploy over the next two quarters?</p>
            <span>Needed to size the extra slices you said you are open to buying.</span>
            <input
              className="pf__input"
              name="addFunds"
              value={addFunds}
              onChange={(e) => setAddFunds(e.target.value)}
              placeholder="e.g. about 8,000 in two tranches"
            />
          </label>
          <label className="pf__card bld__q">
            <p>What would make you sell — price, thesis break, or a time limit?</p>
            <span>
              Your exit rule goes into the note, so it can be checked against the tax
              result.
            </span>
            <input
              className="pf__input"
              name="exitRule"
              value={exitRule}
              onChange={(e) => setExitRule(e.target.value)}
              placeholder="e.g. thesis break — if cloud growth falls below 18%"
            />
          </label>
          <div className="bld__actions">
            <button className="desk__btn" type="submit" disabled={pending || !ok || Boolean(state.requestId)}>
              {pending || state.requestId
                ? "Opening wait page…"
                : `Run analysis · ${chosen ? agentCreditLabel(chosen.thesis_class) : ""}`}
            </button>
            <button
              className="pf__ghost"
              type="submit"
              name="skip_clarify"
              value="1"
              disabled={pending || !ok || Boolean(state.requestId)}
            >
              Skip — record assumptions
            </button>
            <button
              className="pf__ghost"
              type="button"
              onClick={() => setStep("build")}
              disabled={pending}
            >
              Back to inputs
            </button>
          </div>
        </div>
      )}
      {state.error && !state.requestId ? <p className="pf__error">{state.error}</p> : null}
    </form>
    </>
  );
}
