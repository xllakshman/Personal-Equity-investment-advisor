import { requireDeskSession } from "@/lib/desk/session";
import { loadDeskHome } from "@/lib/desk/load-home";
import { DeskHomeView } from "@/components/features/desk/DeskHomeView";

function deskNotice(sp: { ok?: string; ticker?: string }): string | null {
  if (sp.ok === "manual" && sp.ticker) {
    return `Added ${sp.ticker}. Open Analyse when you want a request.`;
  }
  if (sp.ok === "edit" && sp.ticker) {
    return `Updated ${sp.ticker}. Stored costs were not converted.`;
  }
  if (sp.ok === "deleted") {
    return "Removed that lot. Saved notes stay on Reports.";
  }
  if (sp.ok === "denied") {
    return "Viewers can read this book but cannot change lots.";
  }
  return null;
}

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; ticker?: string }>;
}) {
  const session = await requireDeskSession();
  const sp = await searchParams;
  const home = await loadDeskHome(session.familyId);
  return (
    <DeskHomeView
      home={home}
      fullName={session.fullName}
      notice={deskNotice(sp)}
    />
  );
}
