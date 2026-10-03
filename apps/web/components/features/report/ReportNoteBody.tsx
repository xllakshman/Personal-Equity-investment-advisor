import { pickSection, sectionText, BEGINNER_KEYS } from "@/lib/reports/sections";

const SECTION_TITLE: Record<string, string> = {
  verdict: "Verdict",
  step0: "What we checked",
  evidence: "Evidence",
  moat: "Moat",
  execution: "Execution",
  sizing: "Sizing",
  scenarios: "Scenarios",
  tax: "Tax",
  news: "News",
};

export type NoteBody = {
  name: string;
  ticker: string;
  verdict: string;
  sections: Record<string, unknown>;
};

/** Fixed section order for Analyse wait + Reports. Never render HTML from the model. */
export function ReportNoteBody({
  note,
  kicker = "Analysis",
}: {
  note: NoteBody;
  kicker?: string;
}) {
  const keys = BEGINNER_KEYS.filter(
    (k) => k === "verdict" || k in note.sections,
  );
  return (
    <section className="bld__wait-note" aria-label="Analysis output">
      <p className="desk__kicker">{kicker}</p>
      <h2 className="desk__h1">{note.name}</h2>
      <p className="desk__lede">
        {note.ticker} · Verdict {note.verdict}
      </p>
      {keys.map((key) => {
        const raw =
          key === "verdict"
            ? pickSection(note.sections, ["verdict"]) ?? note.verdict
            : pickSection(note.sections, [key]);
        const text = sectionText(raw);
        if (!text) return null;
        return (
          <article key={key} className="desk__card bld__wait-sec">
            <h3>{SECTION_TITLE[key] ?? key.replaceAll("_", " ")}</h3>
            <p>{text}</p>
          </article>
        );
      })}
    </section>
  );
}
