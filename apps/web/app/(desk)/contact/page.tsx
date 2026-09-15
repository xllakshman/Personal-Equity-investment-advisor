import { ContactForm } from "@/components/features/marketing/ContactForm";
import { requireDeskSession } from "@/lib/desk/session";

export default async function ContactPage() {
  const session = await requireDeskSession();

  return (
    <div>
      <h1 className="desk__h1">Contact us</h1>
      <p className="desk__lede" style={{ maxWidth: "62ch" }}>
        Name, email, phone, and your question. We reply to the inbox you give us,
        usually within 24–48 hours.
      </p>
      <div className="desk__card" style={{ marginTop: 22, maxWidth: 560 }}>
        <ContactForm
          variant="desk"
          defaults={{
            fullName: session.fullName === "Desk" ? "" : session.fullName,
            email: session.email ?? "",
          }}
        />
      </div>
    </div>
  );
}
