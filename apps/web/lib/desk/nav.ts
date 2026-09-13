export const DESK_NAV = [
  { href: "/desk", label: "Desk", hint: "Overview" },
  { href: "/analyse", label: "New analysis", hint: "Request builder" },
  { href: "/portfolio", label: "Portfolio", hint: "Holdings & CSV" },
  { href: "/reports", label: "Reports", hint: "Saved notes" },
  { href: "/usage", label: "Usage", hint: "Quota & wallet" },
  { href: "/billing", label: "Plans & wallet", hint: "Subscription" },
] as const;

export const DESK_PATHS = DESK_NAV.map((n) => n.href);

export function isDeskPath(pathname: string): boolean {
  if (DESK_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return pathname === "/settings" || pathname.startsWith("/settings/");
}
