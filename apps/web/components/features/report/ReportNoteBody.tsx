import { ReportDocument } from "@/components/features/report/ReportDocument";
import { isFinishedNote } from "@/lib/reports/sections";

export type NoteBody = {
  name: string;
  ticker: string;
  verdict: string;
  sections: Record<string, unknown>;
};

/** Wait page + Reports share the same typeset document. Never render HTML from the model. */
export function ReportNoteBody({
  note,
  kicker = "Analysis",
}: {
  note: NoteBody;
  kicker?: string;
}) {
  if (isFinishedNote(note.sections)) {
    return (
      <section className="bld__wait-note" aria-label="Analysis output">
        <ReportDocument
          name={note.name}
          ticker={note.ticker}
          verdict={note.verdict}
          sections={note.sections}
        />
      </section>
    );
  }
  return (
    <section className="bld__wait-note" aria-label="Analysis output">
      <p className="desk__kicker">{kicker}</p>
      <h2 className="desk__h1">{note.name}</h2>
      <p className="desk__lede">
        {note.ticker} · Verdict {note.verdict}. The finished note is not on this
        row yet.
      </p>
    </section>
  );
}
