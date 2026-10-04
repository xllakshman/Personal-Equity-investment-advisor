import { Carlito } from "next/font/google";

/** Desk, report, and Analyse. Marketing / login keep their own stack. */
export const DESK_FONT_STACK = "Calibri, Carlito, sans-serif";

export const deskFont = Carlito({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-carlito",
});
