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
  modelCost,
  moneyAmount,
} from "@/lib/analyse/format";
import {
  CORE_LENSES,
  isComprehensive,
  LENS_COPY,
  selectedLenses,
  toggleLens,
  type LensState,
} from "@/lib/analyse/lenses";
import type { BuilderPayload, HeldLot } from "@/lib/analyse/load-builder";
import { canContinue, defaultModelId, groupModels, modelOnPlan } from "@/lib/analyse/models";
import {
  ANALYSE_STEPS,
  analyseGuide,
  analyseRailItemClass,
  analyseStepsDone,
  firstOpenStep,
} from "@/lib/analyse/steps";
import { analyseWaitHref } from "@/lib/analyse/in-flight";
import { trancheSummary } from "@/lib/profile/tranches";
import { usageCaption, usageHumanHint } from "@/lib/usage/format";
import type { UsageSnapshot } from "@/lib/usage/types";
import { versionLabel } from "@/lib/reports/versions";

const TAX_RES = [
  { id: "us", label: "US resident" },
  { id: "india", label: "India resident" },
  { id: "uae", label: "Non-resident (UAE / no local CGT)" },
  { id: "nri", label: "Non-resident Indian (NRI)" },
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
  const kindSummary = picked.length
    ? picked.map((k) => LENS_COPY[k as keyof typeof LENS_COPY]?.label ?? k).join(" · ")
    : "Nothing picked yet";
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
    if (!normalizeTicker(ticker)) return "Enter a ticker, or pick one from your book.";
    if (conflict) return "Fix the risk and return mismatch to continue";
    if (picked.length === 0) return "Pick at least one check";
    if (!onPlan || !modelId) return "Upgrade your plan to run this agent";
    return `Runs on ${chosen?.label ?? modelId} · uses 1 note, or ${modelCost(chosen?.cost_cents_per_run ?? 0)}`;
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
    <form className="bld" action={action}>
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
              <p className="desk__kicker">Research</p>
              <h1 className="desk__h1">Analyse a stock</h1>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="desk__consume">{usageHumanHint(usage)}</span>
              <Link href="/billing" className="desk__btn desk__btn--ghost">
                Upgrade Plan
              </Link>
            </div>
          </div>
          <p className="desk__lede">
            Complete steps 1 to 6. Type any ticker, or pick a name from your book.
            A holding fills qty and cost; you can still change the numbers for this
            run. Each run uses one note from this month’s allowance. One Submit at
            a time — wait until the current run is ready or failed.
          </p>
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
                  <h2 className="bld__h2">Step 1 · Stock to research</h2>
                  <p className="pf__lede">Your own ticker or a name you already hold.</p>
                  <label className="pf__label">
                    Ticker
                    <TickerLookup value={ticker} onChange={setTicker} />
                  </label>
                  {payload.holdings.length > 0 ? (
                    <label className="pf__label">
                      From your book
                      <select
                        className="pf__input"
                        value={held ? ticker : ""}
                        onChange={(e) => {
                          if (e.target.value) setTicker(e.target.value);
                        }}
                      >
                        <option value="">Type a ticker above, or pick a holding</option>
                        {payload.holdings.map((h) => (
                          <option key={`${h.ticker}-${h.exchange}`} value={h.ticker}>
                            {h.ticker}
                            {h.company_name ? ` · ${h.company_name}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="pf__lede">
                      No lots yet. You can still run a note; add holdings on Home if
                      you want size and cost in the pack.
                    </p>
                  )}
                </section>

                <section className="pf__card" id="analyse-step-2">
                  <div className="bld__sec-head">
                    <h2 className="bld__h2">Step 2 · What to check</h2>
                    <span className="bld__meta">{kindSummary}</span>
                  </div>
                  <p className="pf__lede">
                    Pick one kind of check, or run them together. This stays open —
                    it is required before Submit for analysis.
                  </p>
                  <div className="bld__kinds" role="group" aria-label="What to check">
                    {LENS_OPTIONS.map((id) => {
                      const on =
                        id === "comprehensive"
                          ? isComprehensive(lenses)
                          : id === "tax"
                            ? lenses.tax
                            : lenses[id];
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
                  <h2 className="bld__h2">Step 3 · Your position</h2>
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
                  <h2 className="bld__h2">Step 4 · Risk and return</h2>
                  <p className="pf__lede">
                    These two have to match. We check before spending a note.
                  </p>
                  <div className="bld__two">
                    <label className="pf__label">
                      <span>Risk appetite · drawdown you can hold through</span>
                      <select
                        className="pf__input"
                        value={risk}
                        onChange={(e) =>
                          setRisk(e.target.value as (typeof RISK_BANDS)[number]["id"])
                        }
                      >
                        {RISK_BANDS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pf__label">
                      <span>Return target · CAGR you are underwriting</span>
                      <select
                        className="pf__input"
                        value={cagr}
                        onChange={(e) =>
                          setCagr(e.target.value as (typeof CAGR_BANDS)[number]["id"])
                        }
                      >
                        {CAGR_BANDS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {conflict ? (
                    <div className="bld__alert bld__alert--bad">
                      <p>{CONFLICT_TITLE}</p>
                      <span>{CONFLICT_MSG}</span>
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
                  <h2 className="bld__h2">Step 5 · Tax treatment</h2>
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
                <section className="pf__card" id="analyse-step-6">
                  <h2 className="bld__h2">Step 6 · Choose your agent</h2>
                  <p className="pf__lede">
                    Frontier agents come with Professional and above. Quick agents
                    are on Trial and Basic. Plan: {payload.planName}.{" "}
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
                        Upgrade Plan
                      </Link>
                    </div>
                  ) : null}
                </section>

                <section className="bld__ready">
                  <p className="desk__kicker">Ready to run</p>
                  <div className="bld__kv">
                    <span>Ticker</span>
                    <b>{ticker || "—"}</b>
                    <span>Checks</span>
                    <b>{kindSummary}</b>
                    <span>Allocation</span>
                    <b>{alloc.toFixed(1)}%</b>
                    <span>I plan to invest</span>
                    <b>{intended > 0 ? moneyAmount(intended, currency) : "—"}</b>
                    <span>Model</span>
                    <b>{chosen?.label ?? "—"}</b>
                    <span>Cost</span>
                    <b>{chosen ? modelCost(chosen.cost_cents_per_run) : "—"}</b>
                  </div>
                  <button
                    className="bld__continue"
                    type="submit"
                    name="skip_clarify"
                    value="1"
                    disabled={!ok || pending || Boolean(state.requestId)}
                  >
                    {pending || state.requestId ? "Opening wait page…" : "Submit for analysis"}
                  </button>
                  <button
                    className="pf__ghost"
                    type="button"
                    disabled={!ok}
                    onClick={() => setStep("clarify")}
                    style={{ marginTop: 8, width: "100%" }}
                  >
                    Add three clarifications first
                  </button>
                  <p className="bld__run-note">{runNote}</p>
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
                : `Run analysis · ${chosen ? modelCost(chosen.cost_cents_per_run) : ""}`}
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
