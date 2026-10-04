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
      title: "Your portfolio is private. We can't see it.",
      detail: `Nobody at eqveste can see what you own or how much. You asked for help — support may look until ${until} UTC, your choice — and access ends on its own.`,
    };
  }
  return {
    shared: false,
    badge: "Private",
    title: "Your portfolio is private. We can't see it.",
    detail:
      "Nobody at eqveste can see what you own or how much. Only if you ask us for help can you let support look — for 3 to 15 days, your choice — and access ends on its own.",
  };
}
