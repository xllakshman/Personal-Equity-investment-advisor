"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { QueuedRequest } from "@/lib/analyse/load-request";
import {
  WAIT_STEPS,
  investingWaitMessage,
  waitHeadline,
  waitLede,
  waitProgressPct,
  waitStatusLabel,
  waitStepIndex,
} from "@/lib/analyse/wait-status";
import { ReportNoteBody } from "@/components/features/report/ReportNoteBody";
import { createClient } from "@/lib/supabase/client";
import { versionLabel } from "@/lib/reports/versions";

type NotePreview = {
  id: string;
  name: string;
  ticker: string;
  verdict: string;
  sections: Record<string, unknown>;
};

export function WaitPanel({ initial }: { initial: QueuedRequest }) {
  const [row, setRow] = useState(initial);
  const [note, setNote] = useState<NotePreview | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

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
      const { data: report } = await supabase
        .from("reports")
        .select("id")
        .eq("request_id", initial.id)
        .maybeSingle();
      const reportId = report?.id ? String(report.id) : null;
      setRow((prev) => ({
        ...prev,
        id: String(data.id),
        ticker: String(data.ticker),
        status: String(data.status),
        modelId: String(data.model_id),
        acceptedAt: String(data.accepted_at),
        errorText: data.error_text ? String(data.error_text) : null,
        reportId,
      }));
      if (reportId) {
        const { data: body } = await supabase
          .from("reports")
          .select("id, name, ticker, verdict, sections")
          .eq("id", reportId)
          .maybeSingle();
        if (!cancelled && body) {
          const sections =
            body.sections &&
            typeof body.sections === "object" &&
            !Array.isArray(body.sections)
              ? (body.sections as Record<string, unknown>)
              : {};
          setNote({
            id: String(body.id),
            name: String(body.name),
            ticker: String(body.ticker),
            verdict: String(body.verdict),
            sections,
          });
        }
      }
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
  const pct = waitProgressPct(row.status);
  const quote =
    headline === "working"
      ? investingWaitMessage(tick)
      : headline === "ready"
        ? "The note below is the saved row on Reports."
        : "This run stopped. Saved notes were not rewritten.";

  return (
    <div className="bld__wait">
      <p className="desk__kicker">Progress is on this page</p>
      <h1 className="desk__h1">{row.ticker}</h1>
      <div className="bld__wait-card">
        <div className="bld__spin-row">
          {headline === "working" ? <span className="bld__spin" aria-hidden /> : null}
          <p>
            {waitStatusLabel(row.status)}
            {headline === "working" ? ` · ${pct}%` : ""}
          </p>
        </div>
        <div
          className="bld__wait-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Analysis progress"
        >
          <span className="bld__wait-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="bld__wait-quote">{quote}</p>
        <div className="bld__wait-steps">
          {WAIT_STEPS.map((label, i) => (
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
          {row.reportId ? (
            <Link href={`/reports/${row.reportId}`} className="desk__btn">
              Open this note
            </Link>
          ) : null}
          <Link href="/reports">Open Reports</Link>
          <Link href="/analyse">New analysis</Link>
          <Link href="/desk">Back to Home</Link>
        </p>
      </div>
      {note ? (
        <ReportNoteBody
          note={note}
          kicker={
            row.version
              ? `Output on this page · ${versionLabel(row.version, row.versionCount)} for ${row.ticker}`
              : "Output on this page"
          }
        />
      ) : null}
      {row.priorNotes?.length ? (
        <p className="pf__lede" style={{ marginTop: 16 }}>
          Earlier saved research for {row.ticker}:{" "}
          {row.priorNotes.map((p, i) => (
            <span key={p.id}>
              {i > 0 ? " · " : ""}
              <Link href={`/reports/${p.id}`}>
                {versionLabel(p.version, p.versionCount)}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
