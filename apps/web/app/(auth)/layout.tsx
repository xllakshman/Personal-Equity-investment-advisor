import type { Metadata } from "next";

import "./auth.css";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
