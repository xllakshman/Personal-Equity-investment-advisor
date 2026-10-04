export const DESK_NAV = [
  { href: "/desk", label: "Home", hint: "Overview", dot: "#0a84ff" },
  { href: "/analyse", label: "Analyse a stock", hint: "Get a decision", dot: "#30d158" },
  { href: "/portfolio", label: "Review Portfolio", hint: "Your holdings", dot: "#ff9f0a" },
  { href: "/reports", label: "Reports", hint: "Saved notes", dot: "#bf5af2" },
  { href: "/research/managers", label: "Elite Investors Holdings", hint: "What top investors hold", dot: "#64d2ff" },
  { href: "/billing", label: "Subscription", hint: "Plan & wallet", dot: "#ff375f" },
  { href: "/contact", label: "Contact us", hint: "Ask a question", dot: "#ffd60a" },
] as const;

export const DESK_PATHS = DESK_NAV.map((n) => n.href);

export function isDeskPath(pathname: string): boolean {
  if (DESK_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/research/") ||
    pathname === "/usage" ||
    pathname.startsWith("/usage/") ||
    pathname === "/subscription" ||
    pathname.startsWith("/subscription/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/")
  );
}
