"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function productForPath(pathname: string): string {
  if (pathname.startsWith("/analyse")) return "analyse";
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/desk")) return "desk";
  return "desk";
}

export function ObservabilityPing() {
  const pathname = usePathname();
  useEffect(() => {
    void fetch("/api/observability/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productForPath(pathname),
        route: pathname,
      }),
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
