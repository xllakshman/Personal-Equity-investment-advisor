import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "eqveste",
    template: "%s · eqveste",
  },
  description: "Personal equity advisor — research desk for one investor’s book",
  applicationName: "eqveste",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
