import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform admin",
};

/** P7-00 builds the real form. Desk JWT is not enough (D27). */
export default function AdminLoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "48px 24px",
        background: "#f6f5f2",
        color: "#1b1a17",
        fontFamily:
          "var(--font-ibm-plex-sans), 'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <p
          style={{
            margin: "0 0 8px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Thesis
        </p>
        <h1
          style={{
            font: "400 32px/1.15 var(--font-newsreader), Newsreader, serif",
            margin: "0 0 12px",
          }}
        >
          Platform admin
        </h1>
        <p style={{ color: "#706d66", lineHeight: 1.6 }}>
          This is not the research desk. Sign in at{" "}
          <Link href="/login" style={{ color: "#2f5f52" }}>
            /login
          </Link>{" "}
          for a desk session. Admin email+password ships later. A desk session
          cannot open admin tools.
        </p>
      </div>
    </main>
  );
}
