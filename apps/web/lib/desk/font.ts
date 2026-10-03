import { Inter } from "next/font/google";

/** Desk (and admin shell) UI face. Marketing / login layouts keep their own stack. */
export const deskFont = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
