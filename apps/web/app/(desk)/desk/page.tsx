import { DeskHomeView } from "@/components/features/desk/DeskHomeView";
import { loadDeskHome } from "@/lib/desk/load-home";
import { requireDeskSession } from "@/lib/desk/session";

export default async function DeskPage() {
  const session = await requireDeskSession();
  const home = await loadDeskHome(session.familyId);
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date());
  return (
    <DeskHomeView home={home} fullName={session.fullName} todayLabel={todayLabel} />
  );
}
