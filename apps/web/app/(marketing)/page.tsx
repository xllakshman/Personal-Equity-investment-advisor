import { redirect } from "next/navigation";

import { HomePage } from "@/components/features/marketing/HomePage";
import { getOptionalUser } from "@/lib/auth/session";

/** Logged-in visitors go to /desk (P1-01 default). Anon see the marketing home. */
export default async function MarketingPage() {
  const user = await getOptionalUser();
  if (user) {
    redirect("/desk");
  }
  return <HomePage />;
}
