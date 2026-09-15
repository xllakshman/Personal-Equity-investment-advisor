"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { QueuedRequest } from "@/lib/analyse/load-request";
import { waitHeadline, waitLede, waitStatusLabel, waitStepIndex } from "@/lib/analyse/wait-status";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  "Queued — waiting for the worker",
  "Reading your position and limits",
  "Getting results, prices and news",
  "Checking it all against your risk limit",
  "Drafting the note",
];

export function WaitPanel({ initial }: { initial: QueuedRequest }) {
  const [row, setRow] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function tick() {
      const { data } = await supabase
        .from("analysis_requests")
        .select("id, ticker, status, model_id, accepted_at, error_text")
        .eq("id", initial.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setRow({
        id: String(data.id),
        ticker: String(data.ticker),
        status: String(data.status),
        modelId: String(data.model_id),
        acceptedAt: String(data.accepted_at),
        errorText: data.error_text ? String(data.error_text) : null,
      });
    }

    const id = window.setInterval(() => {
      void tick();
    }, 4000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.id]);

  const headline = waitHeadline(row.status);
  const step = waitStepIndex(row.status);
  const lede = waitLede(row.status);

  return (
    <div className="bld__wait">
      <p className="desk__kicker">Running</p>
      <h1 className="desk__h1">{row.ticker}</h1>
      <div className="bld__wait-card">
        <div className="bld__spin-row">
          {headline === "working" ? <span className="bld__spin" aria-hidden /> : null}
          <p>{waitStatusLabel(row.status)}</p>
        </div>
        <div className="bld__wait-steps">
          {STEPS.map((label, i) => (
            <p key={label} className={i === step ? "bld__step--cur" : "bld__step"}>
              {label}
            </p>
          ))}
        </div>
        <p className="pf__lede" style={{ marginTop: 20 }}>
          {lede}
        </p>
        {row.errorText ? <p className="pf__error">{row.errorText}</p> : null}
        <p className="bld__actions" style={{ marginTop: 18 }}>
          <Link href="/reports">Open Reports</Link>
          <Link href="/desk">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
