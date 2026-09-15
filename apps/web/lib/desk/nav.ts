export const DESK_NAV = [
  { href: "/desk", label: "Home", hint: "Overview" },
  { href: "/analyse", label: "Analyse a Stock", hint: "Request builder" },
  { href: "/portfolio", label: "Portfolio", hint: "Holdings & CSV" },
  { href: "/reports", label: "Reports", hint: "Saved notes" },
  { href: "/research/managers", label: "Managers", hint: "Public filings" },
  { href: "/billing", label: "Subscription", hint: "Plan & wallet" },
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
    pathname.startsWith("/subscription/")
  );
}
