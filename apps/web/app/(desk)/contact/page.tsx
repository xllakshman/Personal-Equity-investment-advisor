import Link from "next/link";

import { ContactForm } from "@/components/features/marketing/ContactForm";
import { requireDeskSession } from "@/lib/desk/session";

export default async function ContactPage() {
  const session = await requireDeskSession();

  return (
    <div className="desk__screen">
      <p className="desk__kicker">Contact us</p>
      <h1 className="desk__h1">How can we help?</h1>
      <p className="desk__lede" style={{ marginBottom: 24, maxWidth: "58ch" }}>
        A real person replies to the email you give us, usually within 24 to 48 hours.
      </p>
      <div className="ct__grid">
        <ContactForm
          variant="desk"
          defaults={{
            fullName: session.fullName === "Desk" ? "" : session.fullName,
            email: session.email ?? "",
          }}
        />
        <div className="ct__side">
          <div className="ct__card">
            <strong>Reply time</strong>
            <p>24 to 48 hours, Monday to Saturday. Billing questions are answered first.</p>
          </div>
          <div className="ct__card">
            <strong>Question about your holdings?</strong>
            <p>We can&apos;t see them unless you allow it for 3 to 15 days.</p>
            <Link href="/portfolio">Allow access in Portfolio →</Link>
          </div>
          <div className="ct__card">
            <strong>Plans and billing</strong>
            <p>Change plan, add money or switch to yearly any time.</p>
            <Link href="/billing">Go to Subscription →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
