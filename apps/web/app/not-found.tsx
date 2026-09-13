import Link from "next/link";

export default function NotFound() {
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
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p
          style={{
            margin: "0 0 8px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
            fontSize: 13,
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
          This page is not here
        </h1>
        <p style={{ color: "#706d66", lineHeight: 1.6 }}>
          The route does not exist yet, or you followed a stale link.
        </p>
        <p>
          <Link href="/" style={{ color: "#2f5f52" }}>
            Marketing home
          </Link>
          {" · "}
          <Link href="/desk" style={{ color: "#2f5f52" }}>
            Desk
          </Link>
        </p>
      </div>
    </main>
  );
}
