import type { Metadata } from "next";

import "./marketing.css";

export const metadata: Metadata = {
  title: {
    absolute: "eqveste",
  },
  description:
    "An institutional-grade AI agent that underwrites a stock for one investor’s book.",
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
