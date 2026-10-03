import type { SupportGrantStatus } from "./load-home";

export type DeskPrivacyView = {
  shared: boolean;
  badge: "Private" | "Shared with admin";
  title: string;
  detail: string;
};

export function deskPrivacyView(grant: SupportGrantStatus): DeskPrivacyView {
  if (grant.active && grant.expiresAt) {
    const until = new Date(grant.expiresAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return {
      shared: true,
      badge: "Shared with admin",
      title: "Shared with admin until it ends on its own",
      detail: `You asked for help. Platform admin may SELECT view holdings for this family until ${until} UTC. Lot quantities stay hidden after that date. Report sections are never in that grant.`,
    };
  }
  return {
    shared: false,
    badge: "Private",
    title: "Your account view is private",
    detail:
      "Nobody at eqveste can see what you own or how much. Only if you ask us for help can you let support look, and access ends on its own.",
  };
}
