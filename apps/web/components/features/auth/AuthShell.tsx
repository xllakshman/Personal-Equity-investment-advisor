import Link from "next/link";
import type { ReactNode } from "react";

const POINTS = [
  { color: "#0a84ff", text: "Sized to your capital, drawdown tolerance and CAGR target" },
  { color: "#30d158", text: "Built to disagree with you — never a flattering answer" },
  { color: "#bf5af2", text: "Choose your model — you only pay for what you run" },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__brand-col">
        <div
          className="auth__blob auth__blob--a"
          style={{
            top: "-16vh",
            left: "-10vw",
            width: "60vh",
            height: "60vh",
            background:
              "radial-gradient(circle at 35% 35%, rgba(10,132,255,.15), rgba(10,132,255,0) 62%)",
          }}
          aria-hidden
        />
        <div
          className="auth__blob auth__blob--b"
          style={{
            bottom: "-20vh",
            right: "-14vw",
            width: "58vh",
            height: "58vh",
            background:
              "radial-gradient(circle at 55% 45%, rgba(48,209,88,.11), rgba(48,209,88,0) 62%)",
          }}
          aria-hidden
        />
        <Link href="/" className="auth__wordmark">
          <span className="auth__mark" />
          eqveste
        </Link>
        <div style={{ position: "relative", maxWidth: 480 }}>
          <p className="auth__pill">
            <span className="auth__dot" />
            Equity growth advisory, built on agentic AI
          </p>
          <h1 className="auth__h1">
            An institutional-grade AI agent built to grow your equity portfolio.
          </h1>
          <p className="auth__lede">
            We do not rate stocks. We underwrite them — we prove the business with
            real numbers, argue the case against buying, split your entry into four
            slices, and write your exit rule before you put money in.
          </p>
          <ul className="auth__points">
            {POINTS.map((p) => (
              <li key={p.text}>
                <span style={{ background: p.color }} />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <Link href="/" className="auth__back">
          ← Back to home
        </Link>
      </div>
      <div className="auth__form-col">
        <div className="auth__card">{children}</div>
      </div>
    </div>
  );
}
