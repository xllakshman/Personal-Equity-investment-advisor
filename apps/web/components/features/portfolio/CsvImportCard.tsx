"use client";

import { useActionState, useMemo, useState } from "react";

import { commitCsvImport, EMPTY_PORTFOLIO_STATE } from "@/app/(desk)/portfolio/actions";
import { parsePortfolioCsv } from "@/lib/portfolio/csv";
import type { CurrencyOverride } from "@/lib/portfolio/exchange";

export function CsvImportCard() {
  const [state, action, pending] = useActionState(
    commitCsvImport,
    EMPTY_PORTFOLIO_STATE,
  );
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [override, setOverride] = useState<CurrencyOverride>("auto");

  const preview = useMemo(() => parsePortfolioCsv(csv, override), [csv, override]);
  const accepted = preview.ok ? preview.rows.filter((r) => r.accepted).length : 0;
  const rejected = preview.ok ? preview.rows.filter((r) => !r.accepted).length : 0;

  return (
    <div className="pf__card pf__card--dash">
      <p className="pf__card-title">Upload a spreadsheet</p>
      <p className="pf__lede">
        Four columns: ticker, company, cost, and quantity purchased. We show rows we
        cannot read so you can fix them — nothing is dropped quietly.
      </p>
      <label className="pf__dropzone">
        <strong>Drop a CSV or choose a file</strong>
        <span className="pf__lede" style={{ margin: 0 }}>
          {fileName || "No file chosen yet"}
        </span>
        <input
          className="pf__file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) {
              setCsv("");
              setFileName("");
              return;
            }
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = () => setCsv(String(reader.result ?? ""));
            reader.readAsText(file);
          }}
        />
      </label>
      <label className="pf__label" htmlFor="csv-currency">
        Currency of these costs
      </label>
      <select
        id="csv-currency"
        className="pf__input"
        name="currency"
        form="csv-commit"
        value={override}
        onChange={(e) => setOverride(e.target.value as CurrencyOverride)}
      >
        <option value="auto">Guess from exchange (India → INR, else USD)</option>
        <option value="USD">USD</option>
        <option value="INR">INR</option>
      </select>
      {csv ? (
        <div className="pf__preview">
          <p>
            {fileName || "CSV"} · {preview.ok ? `${accepted} rows parsed, ${rejected} rejected` : preview.error}
          </p>
          {preview.ok && rejected > 0 ? (
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
          <form id="csv-commit" action={action}>
            <input type="hidden" name="csv" value={csv} />
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
        </div>
      ) : null}
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      <p className="pf__foot">
        Currency is guessed from the exchange and you can change it. Re-upload appends
        lots unless you tick replace.
      </p>
    </div>
  );
}
