"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div>
      <label
        htmlFor="waitlist-email"
        style={{
          display: "block",
          margin: "0 0 8px",
          fontSize: "11.5px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(245,245,247,.66)",
        }}
      >
        Your email
      </label>
      <form
        className="mkt__wait-row"
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) setSubscribed(true);
        }}
      >
        <input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="you@example.com"
          className="mkt__input"
        />
        <button type="submit" className="mkt__btn mkt__btn--solid">
          Subscribe
        </button>
      </form>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 13,
          lineHeight: 1.55,
          color: subscribed ? "#30d158" : "rgba(245,245,247,.6)",
        }}
      >
        {subscribed
          ? "You are on the list. The next email goes out Sunday."
          : "Free and weekly. Add your holdings after signing up and the email becomes yours specifically."}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(245,245,247,.5)" }}>
        Nothing is stored yet — no waitlist table in this chunk.
      </p>
    </div>
  );
}
