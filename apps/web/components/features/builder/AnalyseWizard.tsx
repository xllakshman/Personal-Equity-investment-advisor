"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { acceptAnalysis, EMPTY_ACCEPT } from "@/app/(desk)/analyse/actions";
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
import type { BuilderPayload } from "@/lib/analyse/load-builder";
import { canContinue, defaultModelId, groupModels, modelAllowed } from "@/lib/analyse/models";

const TAX_RES = [
  { id: "us", label: "US resident" },
  { id: "india", label: "India resident" },
  { id: "uae", label: "Non-resident (UAE / no local CGT)" },
  { id: "nri", label: "Non-resident Indian (NRI)" },
] as const;

function nearestSlab(value: string | null, options: readonly string[]): string {
  if (value && options.includes(value)) return value;
  if (value) {
    const hit = options.find((s) => s.replace("%", "") === value.replace("%", ""));
    if (hit) return hit;
  }
  return options[3] ?? options[0] ?? "";
}

export function AnalyseWizard({ payload }: { payload: BuilderPayload }) {
  const [step, setStep] = useState<"build" | "clarify">("build");
  const [lenses, setLenses] = useState<LensState>({
    fundamental: true,
    technical: true,
    macro: false,
    news: false,
    tax: false,
  });
  const [invested, setInvested] = useState(payload.invested);
  const [portfolio, setPortfolio] = useState(payload.portfolioSize);
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
    defaultModelId(payload.models, payload.allowedModelIds),
  );
  const [conviction, setConviction] = useState("");
  const [addFunds, setAddFunds] = useState("");
  const [exitRule, setExitRule] = useState("");
  const [state, action, pending] = useActionState(acceptAnalysis, EMPTY_ACCEPT);

  const picked = selectedLenses(lenses);
  const conflict = isRiskCagrConflict(risk, cagr);
  const slack = hasRiskCagrSlack(risk, cagr);
  const onPlan = modelId ? modelAllowed(modelId, payload.allowedModelIds) : false;
  const ok = canContinue({
    held: Boolean(payload.held),
    lensCount: picked.length,
    conflict,
    modelId,
    modelOnPlan: onPlan,
  });
  const groups = groupModels(payload.models);
  const chosen = payload.models.find((m) => m.id === modelId) ?? null;
  const alloc = allocationPct(invested, portfolio);
  const kindSummary = picked.length
    ? picked.map((k) => LENS_COPY[k as keyof typeof LENS_COPY]?.label ?? k).join(" · ")
    : "Nothing picked yet";
  const lockedFrontier = groups.frontier.some(
    (m) => !modelAllowed(m.id, payload.allowedModelIds),
  );
  const upgradeNudge = Boolean(chosen && chosen.thesis_class !== "frontier" && lockedFrontier);

  const runNote = useMemo(() => {
    if (!payload.held) return "Add this ticker on Portfolio before Continue.";
    if (conflict) return "Fix the risk and return mismatch to continue";
    if (picked.length === 0) return "Pick at least one check";
    if (!onPlan || !modelId) return "This model needs a higher plan";
    return `Runs on ${chosen?.label ?? modelId} · uses 1 analysis, or ${modelCost(chosen?.cost_cents_per_run ?? 0)}`;
  }, [payload.held, conflict, picked.length, onPlan, modelId, chosen]);

  function setResidency(next: string) {
    setTaxResidency(next);
    const opts = next === "india" ? IN_SLABS : US_SLABS;
    setTaxSlab((prev) => nearestSlab(prev, opts));
  }

  const slabOptions = taxResidency === "india" ? IN_SLABS : US_SLABS;
  const showSlab = taxResidency === "us" || taxResidency === "india";

  return (
    <form className="bld" action={action}>
      <input type="hidden" name="ticker" value={payload.ticker} />
      <input type="hidden" name="exchange" value={payload.held?.exchange ?? ""} />
      <input type="hidden" name="invested_currency" value={payload.currency} />
      <input type="hidden" name="invested_amount" value={String(invested)} />
      <input type="hidden" name="portfolio_size" value={String(portfolio)} />
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
          <div className="bld__hero">
            <div>
              <p className="desk__kicker">Request builder</p>
              <h1 className="desk__h1">
                Analyse{" "}
                <span className="bld__ticker">{payload.ticker || "—"}</span>
              </h1>
            </div>
            <p className="desk__lede" style={{ margin: 0, maxWidth: "38ch" }}>
              Everything here is filled in from your profile and holdings. Change
              anything you like. Continue does not call{" "}
              <code>thesis_accept_analysis</code>.
            </p>
          </div>

          {!payload.ticker ? (
            <p className="pf__banner">
              Pick a ticker already on <code>holdings</code>. Unknown names go to
              Portfolio first.
            </p>
          ) : null}
          {payload.ticker && !payload.held ? (
            <p className="pf__banner">
              {payload.ticker} is not on <code>holdings</code> for this family.{" "}
              <Link href={`/portfolio?add=${encodeURIComponent(payload.ticker)}`}>
                Add it on Portfolio
              </Link>{" "}
              before Continue.
            </p>
          ) : null}

          {!payload.ticker && payload.holdings.length > 0 ? (
            <div className="bld__picks">
              {payload.holdings.map((h) => (
                <Link
                  key={h.ticker}
                  className="bld__pick"
                  href={`/analyse?ticker=${encodeURIComponent(h.ticker)}`}
                >
                  {h.ticker}
                  {h.company_name ? ` · ${h.company_name}` : ""}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="bld__grid">
            <div className="bld__col">
              <section className="pf__card">
                <div className="bld__sec-head">
                  <h2 className="bld__h2">1 · What to check</h2>
                  <span className="bld__meta">{kindSummary}</span>
                </div>
                <p className="pf__lede">
                  Pick one kind of check, or run them all together.
                </p>
                <div className="bld__kinds">
                  {CORE_LENSES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={lenses[id] ? "bld__kind bld__kind--on" : "bld__kind"}
                      onClick={() => setLenses((s) => toggleLens(s, id))}
                    >
                      <span className={lenses[id] ? "bld__box bld__box--on" : "bld__box"} />
                      <span>
                        <strong>{LENS_COPY[id].label}</strong>
                        <span>{LENS_COPY[id].desc}</span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={
                      isComprehensive(lenses) ? "bld__kind bld__kind--on" : "bld__kind"
                    }
                    onClick={() => setLenses((s) => toggleLens(s, "comprehensive"))}
                  >
                    <span
                      className={
                        isComprehensive(lenses) ? "bld__box bld__box--on" : "bld__box"
                      }
                    />
                    <span>
                      <strong>{LENS_COPY.comprehensive.label}</strong>
                      <span>{LENS_COPY.comprehensive.desc}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={lenses.tax ? "bld__kind bld__kind--on" : "bld__kind"}
                    onClick={() => setLenses((s) => toggleLens(s, "tax"))}
                  >
                    <span className={lenses.tax ? "bld__box bld__box--on" : "bld__box"} />
                    <span>
                      <strong>{LENS_COPY.tax.label}</strong>
                      <span>{LENS_COPY.tax.desc}</span>
                    </span>
                  </button>
                </div>
              </section>

              <section className="pf__card">
                <h2 className="bld__h2">2 · Your position</h2>
                <p className="pf__lede">We work out your share of the portfolio for you.</p>
                <div className="bld__pos">
                  <label className="pf__label">
                    Currently invested in {payload.ticker || "this name"}
                    <input
                      className="pf__input bld__mono"
                      type="number"
                      value={Number.isFinite(invested) ? invested : 0}
                      onChange={(e) => setInvested(Number(e.target.value) || 0)}
                    />
                    <span className="bld__meta">
                      {moneyAmount(invested, payload.currency)}
                      {payload.held
                        ? ` · ${payload.held.qty} × ${payload.held.cost_per_share}`
                        : ""}
                    </span>
                  </label>
                  <label className="pf__label">
                    Total portfolio size
                    <input
                      className="pf__input bld__mono"
                      type="number"
                      value={Number.isFinite(portfolio) ? portfolio : 0}
                      onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
                    />
                    <span className="bld__meta">
                      {moneyAmount(portfolio, payload.currency)}
                    </span>
                  </label>
                  <div>
                    <p className="pf__label">Derived allocation</p>
                    <p className="bld__alloc">{alloc.toFixed(1)}%</p>
                    <div className="bld__track">
                      <div
                        className="bld__fill"
                        style={{ width: `${Math.min(100, alloc)}%` }}
                      />
                    </div>
                    <p className="pf__lede">{allocationNote(alloc)}</p>
                  </div>
                </div>
                <div className="bld__two">
                  <label className="pf__label">
                    Intent
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
                    Willing to average down
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

              <section className="pf__card">
                <h2 className="bld__h2">3 · Risk and return</h2>
                <p className="pf__lede">
                  These two have to match. We check before spending an analysis.
                </p>
                <div className="bld__two">
                  <div>
                    <p className="bld__sub">Risk appetite · drawdown you can hold through</p>
                    <div className="bld__radios">
                      {RISK_BANDS.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={risk === r.id ? "bld__radio bld__radio--on" : "bld__radio"}
                          onClick={() => setRisk(r.id)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="bld__sub">Return target · CAGR you are underwriting</p>
                    <div className="bld__radios">
                      {CAGR_BANDS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={cagr === c.id ? "bld__radio bld__radio--on" : "bld__radio"}
                          onClick={() => setCagr(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
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

              <section className="pf__card">
                <h2 className="bld__h2">4 · Tax treatment</h2>
                <p className="pf__lede">
                  Decides how long to hold, and when selling actually makes sense.
                </p>
                <div className="bld__two">
                  <label className="pf__label">
                    Residency for tax
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
                      {taxResidency === "india"
                        ? "Income slab"
                        : "Federal marginal bracket"}
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
                    Profile holding months for long-term: {payload.ltcgHoldingMonths}.
                    Rates from <code>investor_profiles</code>
                    {payload.ltcgRateBps != null
                      ? ` · LTCG ${(payload.ltcgRateBps / 100).toFixed(2)}%`
                      : ""}
                    {payload.stcgRateBps != null
                      ? ` · STCG ${(payload.stcgRateBps / 100).toFixed(2)}%`
                      : ""}
                    .
                  </p>
                ) : null}
              </section>
            </div>

            <aside className="bld__side">
              <section className="pf__card">
                <h2 className="bld__h2">5 · Model</h2>
                <p className="pf__lede">
                  Frontier agents come with Professional and above. Plan:{" "}
                  {payload.planName}.
                </p>
                {groups.frontier.length > 0 ? (
                  <>
                    <p className="bld__group">Frontier</p>
                    {groups.frontier.map((m) => {
                      const locked = !modelAllowed(m.id, payload.allowedModelIds);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={
                            modelId === m.id ? "bld__model bld__model--on" : "bld__model"
                          }
                          style={{ opacity: locked ? 0.62 : 1 }}
                          onClick={() => {
                            if (!locked) setModelId(m.id);
                          }}
                        >
                          <span className="bld__model-row">
                            <strong>{m.label}</strong>
                            <span>{modelCost(m.cost_cents_per_run)}</span>
                          </span>
                          <span>
                            {m.provider} · {m.vendor_class}
                          </span>
                          {locked ? (
                            <em>Requires a higher plan than {payload.planName}.</em>
                          ) : null}
                        </button>
                      );
                    })}
                  </>
                ) : null}
                {groups.quick.length > 0 ? (
                  <>
                    <p className="bld__group">Quick</p>
                    {groups.quick.map((m) => {
                      const locked = !modelAllowed(m.id, payload.allowedModelIds);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={
                            modelId === m.id ? "bld__model bld__model--on" : "bld__model"
                          }
                          style={{ opacity: locked ? 0.62 : 1 }}
                          onClick={() => {
                            if (!locked) setModelId(m.id);
                          }}
                        >
                          <span className="bld__model-row">
                            <strong>{m.label}</strong>
                            <span>{modelCost(m.cost_cents_per_run)}</span>
                          </span>
                          <span>
                            {m.provider} · {m.vendor_class}
                          </span>
                        </button>
                      );
                    })}
                  </>
                ) : null}
                {upgradeNudge ? (
                  <div className="bld__alert bld__alert--warn">
                    <span>
                      A comprehensive run on a frontier model typically adds two
                      extra evidence layers. On this model the note will be shorter.
                    </span>
                    <Link href="/billing" className="desk__btn" style={{ marginTop: 8 }}>
                      Compare plans
                    </Link>
                  </div>
                ) : null}
              </section>

              <section className="bld__ready">
                <p className="desk__kicker" style={{ color: "#8f8b82" }}>
                  Ready to run
                </p>
                <div className="bld__kv">
                  <span>Ticker</span>
                  <b>{payload.ticker || "—"}</b>
                  <span>Checks</span>
                  <b>{kindSummary}</b>
                  <span>Allocation</span>
                  <b>{alloc.toFixed(1)}%</b>
                  <span>Model</span>
                  <b>{chosen?.label ?? "—"}</b>
                  <span>Cost</span>
                  <b>{chosen ? modelCost(chosen.cost_cents_per_run) : "—"}</b>
                </div>
                <button
                  className="bld__continue"
                  type="button"
                  disabled={!ok}
                  onClick={() => setStep("clarify")}
                >
                  Continue
                </button>
                <p className="bld__run-note">{runNote}</p>
              </section>
            </aside>
          </div>
        </>
      ) : (
        <div className="bld__clarify">
          <p className="desk__kicker">Before it runs</p>
          <h1 className="desk__h1">Three things that change the answer</h1>
          <p className="desk__lede">
            We only ask when your answers leave something genuinely open. Skip any
            and the note will tell you what it assumed. Quota is not consumed until
            Run analysis.
          </p>
          <label className="pf__card bld__q">
            <p>
              You already hold {alloc.toFixed(1)}% of your book in{" "}
              {payload.ticker}. Is this a conviction position or a legacy one?
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
            <button className="desk__btn" type="submit" disabled={pending || !ok}>
              {pending
                ? "Queuing…"
                : `Run analysis · ${chosen ? modelCost(chosen.cost_cents_per_run) : ""}`}
            </button>
            <button
              className="pf__ghost"
              type="submit"
              name="skip_clarify"
              value="1"
              disabled={pending || !ok}
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
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
