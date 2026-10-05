"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { commitCsvImport } from "@/app/(desk)/portfolio/actions";
import { EMPTY_PORTFOLIO_STATE } from "@/lib/portfolio/action-state";
import {
  PORTFOLIO_CSV_TEMPLATE_FILENAME,
  csvTemplateText,
  parsePortfolioCsv,
} from "@/lib/portfolio/csv";
import type { CurrencyOverride } from "@/lib/portfolio/exchange";

function downloadTemplate() {
  const blob = new Blob([csvTemplateText()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = PORTFOLIO_CSV_TEMPLATE_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvImportCard({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(
    commitCsvImport,
    EMPTY_PORTFOLIO_STATE,
  );
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [emptyFile, setEmptyFile] = useState(false);
  const [override, setOverride] = useState<CurrencyOverride>("auto");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => parsePortfolioCsv(csv, override), [csv, override]);
  const accepted = preview.ok ? preview.rows.filter((r) => r.accepted).length : 0;
  const rejected = preview.ok ? preview.rows.filter((r) => !r.accepted).length : 0;
  const parseError = csv ? (preview.ok ? null : preview.error) : null;

  function applyFile(file: File | undefined) {
    if (!file) {
      setCsv("");
      setFileName("");
      setEmptyFile(false);
      return;
    }
    setFileName(file.name);
    if (file.size === 0) {
      setCsv("");
      setEmptyFile(true);
      return;
    }
    setEmptyFile(false);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div className="pf__card pf__card--dash">
      <p className="pf__card-title">Upload a spreadsheet</p>
      <p className="pf__lede">
        Required: ticker, company_name, cost_per_share, total_purchased.
        Optional: lot_kind (retail or esop; blank or missing means retail).
        Currency is chosen below, not a CSV column. Lines starting with # are ignored.
      </p>
      <button className="pf__ghost" type="button" onClick={downloadTemplate}>
        Download CSV template
      </button>
      {!canWrite ? (
        <p className="desk__kpi-s" style={{ marginTop: 10 }}>
          Viewers can read this book but cannot upload a CSV.
        </p>
      ) : (
        <form className="pf__stack" action={action} style={{ marginTop: 12 }}>
          <label
            className={dragOver ? "pf__dropzone pf__dropzone--hot" : "pf__dropzone"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (!file || !fileRef.current) return;
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              applyFile(file);
            }}
          >
            <strong>Drop a CSV or choose a file</strong>
            <span className="pf__lede" style={{ margin: 0 }}>
              {fileName || "No file chosen yet"}
            </span>
            <input
              ref={fileRef}
              className="pf__file"
              type="file"
              name="file"
              accept=".csv,text/csv"
              onChange={(e) => applyFile(e.target.files?.[0])}
            />
          </label>
          <label className="pf__label" htmlFor="csv-currency">
            Currency of these costs
          </label>
          <select
            id="csv-currency"
            className="pf__input"
            name="currency"
            value={override}
            onChange={(e) => setOverride(e.target.value as CurrencyOverride)}
          >
            <option value="auto">Guess from exchange (India → INR, else USD)</option>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
          {emptyFile ? <p className="pf__error">CSV is empty.</p> : null}
          {parseError ? <p className="pf__error">{parseError}</p> : null}
          {preview.ok ? (
            <div className="pf__preview">
              <p>
                {fileName || "CSV"} · {accepted} rows parsed, {rejected} rejected
              </p>
              {rejected > 0 ? (
                <ul className="pf__rejects">
                  {preview.rows
                    .filter((r) => !r.accepted)
                    .map((r) => (
                      <li key={r.line}>
                        Line {r.line}
                        {r.ticker ? ` ${r.ticker}` : ""}: {r.reject_reason}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <label className="pf__check">
            <input type="checkbox" name="replace" value="1" />
            Replace existing lots (default is append)
          </label>
          <button
            className="pf__primary"
            type="submit"
            disabled={pending || !preview.ok || preview.rows.length === 0}
          >
            {pending ? "Saving…" : "Save to portfolio"}
          </button>
        </form>
      )}
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      <p className="pf__foot">
        Currency is guessed from the exchange and you can change it. Re-upload appends
        lots unless you tick replace. Stored costs stay in native currency.
      </p>
    </div>
  );
}
