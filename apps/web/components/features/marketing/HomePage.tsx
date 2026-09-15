import Link from "next/link";

import { ContactForm } from "./ContactForm";
import { PlanGrid } from "./PlanGrid";
import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

const DECISIONS = [
  {
    title: "Is this a good business?",
    body: "Seven questions, each answered with real numbers and a source. We prove the company can keep competitors out, and we state the strongest reason not to buy before we say anything positive. Vague answers mean no position.",
    color: "#0a84ff",
  },
  {
    title: "How much, and when?",
    body: "You buy in four slices instead of all at once, sized by how sure you are. The last slice stays untouched for a really bad fall. Before each new slice, five health checks have to pass — a falling price alone is never a reason to buy more.",
    color: "#30d158",
  },
  {
    title: "When to take profits",
    body: "The selling rules are written before you buy, and they differ by how much you believe in the stock. If it gets expensive, that alone triggers a trim. If one holding grows too big, it gets cut back — no debating it in a good week.",
    color: "#bf5af2",
  },
  {
    title: "A portfolio, not a pile",
    body: "Steady compounders, faster growers and short-term bets each get a set share of your money. Cash is treated as a real position. And there is a cap on how many stocks you hold, because nobody can follow thirty of them properly.",
    color: "#ff9f0a",
  },
];

const CHECKS = [
  ["CHECK 01", "Today's real price", "Looked up, never guessed. A wrong price makes everything after it wrong.", false],
  ["CHECK 02", "The last 90 days of news", "Deals, recalls, lawsuits, people leaving.", false],
  ["CHECK 03", "The latest results", "Sales, profit and what management said about next quarter.", false],
  ["CHECK 04", "The case against buying", "What the people betting against this stock actually say — in their words.", true],
  ["CHECK 05", "The biggest threat, head on", "The risk is searched on its own, not filtered through company statements.", true],
  ["CHECK 06", "What rivals are up to", "Lost business shows up in the competitor's news first, never in the company's.", true],
  ["CHECK 07", "People who know the industry", "Specialists who follow this sector full time, not headlines.", false],
  ["THEN, TWICE", "We mark our own work", "The draft is checked against every rule, twice. Anything missing gets redone.", false],
] as const;

const RULEBOOKS = [
  {
    n: "RULEBOOK 01",
    color: "#0a84ff",
    title: "Can it keep rivals out?",
    body: "A real advantage shows up in seven to ten years of numbers. A good story is not proof.",
    bullets: [
      "Profit on capital, high and heading the right way",
      "The one number that matters in this industry",
      "Five warning signs — any one of them is flagged",
      'A "what could make this company obsolete?" test, every time',
    ],
  },
  {
    n: "RULEBOOK 02",
    color: "#30d158",
    title: "Seven questions before you buy",
    body: "Each one answered with evidence you can check — and the case against buying sits right in the middle, on purpose.",
    bullets: [
      "How the company actually makes and keeps cash",
      "What specifically drives the next five years of growth",
      "What the price already assumes, versus the company's own history",
      "What you see that the market doesn't — stated clearly enough to be proven wrong",
    ],
  },
  {
    n: "RULEBOOK 03",
    color: "#bf5af2",
    title: "Buying in slices",
    body: "Four slices, cash that changes with the market, and a health check before any money follows a falling price.",
    bullets: [
      "First slice only after the homework is done",
      "Later slices need proof the fall is temporary, not terminal",
      "Last slice held back for the worst drops",
      "Each stock judged against its own high, not the index",
    ],
  },
  {
    n: "RULEBOOK 04",
    color: "#ff9f0a",
    title: "Taking money off the table",
    body: "Trim rules set by how strong the case is — and if the stock gets expensive, that fires first.",
    bullets: [
      "Your best long-term holdings are trimmed lightly and late",
      "Faster growers pay back your original money first",
      "Short-term bets are sold down hard and early",
      "A size check every quarter that you can't skip",
    ],
  },
  {
    n: "RULEBOOK 05",
    color: "#0a84ff",
    title: "Building the portfolio",
    body: "Set shares for three kinds of holdings, cash you don't spend on a whim, and a limit on how many names you own.",
    bullets: [
      "Steady compounders hold most of the money",
      "Faster growers sized for a two to four year window",
      "Short-term bets kept deliberately small",
      "Past about fifteen stocks you're working against your own goal",
    ],
  },
  {
    n: "RULEBOOK 06",
    color: "#30d158",
    title: "Short-term trades, kept separate",
    body: "You can trade shorter moves without wrecking the long-term book — separate size limits, separate exits, separate scorecard.",
    bullets: [
      "Dip buys only on companies you already know well",
      "New ideas traded small before they earn a permanent slot",
      "A trade becomes a long-term holding by decision, never as a rescue",
      "Trading profits go straight to cash",
    ],
  },
];

const WHY = [
  [
    "We answer for your money, not in general",
    "The same stock gets a different answer depending on how much you already hold, how big a fall you can live with, and where you pay tax. A rating out of five can't do that.",
  ],
  [
    "We never just agree with you",
    "Every positive note has to state the strongest argument against buying, and beat it with evidence. If we can't, we tell you to stay out. That single rule is what most tools quietly skip.",
  ],
  [
    "We tell you what to do next",
    "How much to buy today, at what price to buy the next slice, how much to keep in cash, when to take profits, and the one thing that means you sell. Not \"looks attractive at these levels\".",
  ],
  [
    "Same rules, every time",
    "Six rulebooks, seven checks, in the same order for every stock. So a note from today and one from six months ago can actually be compared — and you can see what changed.",
  ],
  [
    "You choose the agent",
    "How good a note is depends on which agent runs it, so we show you the price of each one and let you decide. Quick agent for a first look, frontier agent when real money is on the line.",
  ],
  [
    "Your notes stay yours",
    "Every analysis is saved as a PDF you can reread, rename and open anywhere. We are not a broker, we never place a trade, and nobody else sees your holdings.",
  ],
];

const TICKER = [
  "Is Azure losing ground to AWS?",
  "Bad loans in its lending arm",
  "Rival drug pipelines",
  "Price war in security software",
  "Are insiders buying?",
  "What the short sellers say",
];

export function HomePage() {
  return (
    <div className="mkt">
      <div className="mkt__blobs" aria-hidden>
        <div
          className="mkt__blob"
          style={{
            top: "-14vh",
            left: "-6vw",
            width: "52vw",
            height: "52vw",
            background:
              "radial-gradient(circle at 30% 30%, rgba(10,132,255,.15), rgba(10,132,255,0) 64%)",
            animation: "thesis-flo1 26s ease-in-out infinite",
          }}
        />
        <div
          className="mkt__blob"
          style={{
            top: "24vh",
            right: "-12vw",
            width: "46vw",
            height: "46vw",
            background:
              "radial-gradient(circle at 60% 40%, rgba(255,105,180,.11), rgba(255,105,180,0) 64%)",
            animation: "thesis-flo2 32s ease-in-out infinite",
          }}
        />
        <div
          className="mkt__blob"
          style={{
            top: "58vh",
            left: "36vw",
            width: "40vw",
            height: "40vw",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,159,10,.08), rgba(255,159,10,0) 62%)",
            animation: "thesis-flo2 29s ease-in-out infinite",
          }}
        />
        <div
          className="mkt__blob"
          style={{
            bottom: "-18vh",
            left: "18vw",
            width: "48vw",
            height: "48vw",
            background:
              "radial-gradient(circle at 40% 60%, rgba(48,209,88,.10), rgba(48,209,88,0) 62%)",
            animation: "thesis-flo3 38s ease-in-out infinite",
          }}
        />
      </div>
      <div className="mkt__wrap">
        <header className="mkt__nav-outer">
          <nav className="mkt__nav" aria-label="Marketing">
            <a href="#top" className="mkt__brand">
              <span className="mkt__mark" />
              eqveste
            </a>
            <div className="mkt__nav-links">
              <a href="#solutions">What it does</a>
              <a href="#method">How it works</a>
              <a href="#frameworks">The rules</a>
              <a href="#whyus">Why us</a>
              <a href="#pricing">Subscription</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="mkt__nav-cta">
              <Link href="/login" className="mkt__btn mkt__btn--login">
                Log in
              </Link>
              <Link href="/signup" className="mkt__btn mkt__btn--solid">
                Create account
              </Link>
            </div>
          </nav>
        </header>

        <section id="top" className="mkt__hero">
          <div className="mkt__rise">
            <p className="mkt__pill">
              <span className="mkt__dot" />
              An AI agent for your equity portfolio
            </p>
            <h1 className="mkt__h1">
              An institutional-grade AI agent built to{" "}
              <span className="mkt__h1-grad">grow your equity portfolio</span>
            </h1>
            <p className="mkt__lede" style={{ fontSize: 19, marginBottom: 32 }}>
              We don&apos;t hand you a rating. We check the business with real numbers,
              argue the case against buying, tell you how much to buy and when to add
              more, and write your exit rule before you put money in. All of it sized
              to your money, your risk limit and your return goal.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 34 }}>
              <Link href="/signup" className="mkt__btn mkt__btn--solid">
                Create a free account
              </Link>
              <a href="#method" className="mkt__btn mkt__btn--ghost">
                See how it works
              </a>
            </div>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>7</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(245,245,247,.62)" }}>
                  checks before any opinion
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>6</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(245,245,247,.62)" }}>
                  rulebooks applied every time
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>100%</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(245,245,247,.62)" }}>
                  of notes argue the other side
                </p>
              </div>
            </div>
          </div>
          <div className="mkt__example mkt__rise mkt__rise--late">
            <div className="mkt__sweep" aria-hidden />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,245,247,.62)" }}>
                  Example note
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 700 }}>
                  A large online marketplace
                </p>
              </div>
              <span
                style={{
                  padding: "7px 13px",
                  borderRadius: 999,
                  background: "rgba(48,209,88,.16)",
                  border: "1px solid rgba(48,209,88,.35)",
                  color: "#30d158",
                  fontSize: 12,
                  fontWeight: 700,
                  alignSelf: "flex-start",
                }}
              >
                BUY SLICE 2 OF 4
              </span>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.6 }}>
              All five health checks still pass, with sources. You buy in four slices
              rather than all at once — this is slice two, a quarter of your target
              size. The last slice stays back in case it falls much further.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              <div className="mkt__card" style={{ padding: 14 }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,245,247,.62)" }}>
                  Profit on capital
                </p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f5f5f7" }}>21.4%</p>
              </div>
              <div className="mkt__card" style={{ padding: 14 }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,245,247,.62)" }}>
                  Fees it keeps
                </p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f5f5f7" }}>Rising</p>
              </div>
              <div className="mkt__card" style={{ padding: 14, background: "rgba(255,159,10,.1)", borderColor: "rgba(255,159,10,.28)" }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,159,10,.95)" }}>
                  Main worry
                </p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#f5f5f7" }}>
                  Bad loans in its lending arm
                </p>
              </div>
              <div className="mkt__card" style={{ padding: 14 }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,245,247,.62)" }}>
                  Max size
                </p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f5f5f7" }}>12%</p>
              </div>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 12, color: "rgba(245,245,247,.64)" }}>
              Buying plan · slice 1 done, slice 2 ready, slice 3 if it falls further, slice 4 held back
            </p>
          </div>
        </section>

        <section className="mkt__section" style={{ paddingTop: 28, paddingBottom: 10 }}>
          <div className="mkt__ticker">
            <div className="mkt__ticker-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={`${t}-${i}`} style={{ whiteSpace: "nowrap" }}>
                  {t}
                  <span style={{ color: "rgba(245,245,247,.25)", margin: "0 14px" }}>·</span>
                </span>
              ))}
            </div>
          </div>
          <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12.5, color: "rgba(245,245,247,.64)" }}>
            Every time you log in, we re-check the open questions on the stocks you own
          </p>
        </section>

        <section id="solutions" className="mkt__section">
          <Reveal style={{ maxWidth: 760, marginBottom: 40 }}>
            <p className="mkt__kicker">What it does</p>
            <h2 className="mkt__h2">Four decisions decide your returns. We handle all four.</h2>
            <p className="mkt__lede">
              Most tools tell you what a stock is worth. Almost none tell you how much to
              buy, when to buy more, when to take money off the table, and what has to go
              wrong for you to leave.
            </p>
          </Reveal>
          <div className="mkt__grid mkt__grid--4">
            {DECISIONS.map((d, i) => (
              <Reveal key={d.title} delay={i * 90} className="mkt__card mkt__card--lift">
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    background: `linear-gradient(150deg, ${d.color}, ${d.color}59)`,
                    margin: "0 0 18px",
                  }}
                />
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="method" className="mkt__section">
          <Reveal style={{ maxWidth: 720, marginBottom: 36 }}>
            <p className="mkt__kicker">How it works</p>
            <h2 className="mkt__h2">Seven checks before we give you an answer.</h2>
            <p className="mkt__lede">
              Finding good news and stopping there isn&apos;t research. We have to go looking
              for the bad news too — including the kind that never shows up when you search
              the company&apos;s own name.
            </p>
          </Reveal>
          <Reveal className="mkt__card">
            <div className="mkt__grid mkt__grid--checks">
              {CHECKS.map(([tag, title, body, warn]) => (
                <div
                  key={tag}
                  className="mkt__card mkt__tile"
                  style={{
                    padding: 18,
                    background: warn ? "rgba(255,159,10,.09)" : "rgba(255,255,255,.05)",
                    borderColor: warn ? "rgba(255,159,10,.26)" : "rgba(255,255,255,.1)",
                  }}
                >
                  <p className="mkt__rb" style={{ color: warn ? "#ff9f0a" : "#0a84ff" }}>
                    {tag}
                  </p>
                  <p style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 600, color: "#f5f5f7" }}>
                    {title}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(245,245,247,.62)" }}>{body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mkt__section">
          <Reveal
            className="mkt__card"
            style={{
              background: "linear-gradient(140deg, rgba(255,159,10,.14), rgba(255,255,255,.04) 55%)",
            }}
          >
            <div className="mkt__grid mkt__grid--2" style={{ alignItems: "center" }}>
              <div>
                <p className="mkt__kicker" style={{ color: "rgba(255,159,10,.95)" }}>
                  No flattery
                </p>
                <h2 className="mkt__h2">We are built to disagree with you.</h2>
                <p className="mkt__lede">
                  We won&apos;t agree with you just because you already own the stock. If we
                  can&apos;t knock down the case against buying, we say so plainly and tell you
                  not to buy.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "Your cash is too low for this kind of market.",
                  "One stock has grown too large — trim it before you buy anything else.",
                  "This company's profit on capital has fallen two years running. The edge is slipping, whatever the price does.",
                  "You're buying more only because the price dropped, and the health checks are failing.",
                ].map((line) => (
                  <div key={line} className="mkt__card" style={{ padding: "18px 20px" }}>
                    <p style={{ margin: "0 0 5px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,159,10,.95)" }}>
                      We tell you without being asked
                    </p>
                    <p style={{ margin: 0, fontSize: 14.5, color: "rgba(245,245,247,.84)" }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="frameworks" className="mkt__section">
          <Reveal style={{ maxWidth: 720, marginBottom: 36 }}>
            <p className="mkt__kicker">The rules</p>
            <h2 className="mkt__h2">Six rulebooks, used the same way every time.</h2>
            <p className="mkt__lede">
              Same order, same standard of proof, every stock. That&apos;s what lets you compare
              two notes six months apart and actually trust the difference.
            </p>
          </Reveal>
          <div className="mkt__grid mkt__grid--2">
            {RULEBOOKS.map((rb, i) => (
              <Reveal
                key={rb.n}
                delay={(i % 3) * 70}
                className="mkt__card mkt__card--lift"
              >
                <p className="mkt__rb" style={{ color: rb.color }}>
                  {rb.n}
                </p>
                <h3>{rb.title}</h3>
                <p style={{ marginBottom: 14 }}>{rb.body}</p>
                {rb.bullets.map((b) => (
                  <p key={b} style={{ margin: "0 0 7px", fontSize: 13, color: "rgba(245,245,247,.62)" }}>
                    {b}
                  </p>
                ))}
              </Reveal>
            ))}
          </div>
        </section>

        <section id="whyus" className="mkt__section">
          <Reveal style={{ maxWidth: 760, marginBottom: 36 }}>
            <p className="mkt__kicker">Why us</p>
            <h2 className="mkt__h2">Why pick us over a chatbot or a stock-picking newsletter?</h2>
            <p className="mkt__lede">
              A general chatbot will tell you what you want to hear. A newsletter tells
              everyone the same thing. We work only on your portfolio, and we follow the
              same rules every single time.
            </p>
          </Reveal>
          <div className="mkt__grid mkt__grid--2">
            {WHY.map(([t, b], i) => (
              <Reveal key={t} delay={(i % 3) * 70} className="mkt__card mkt__card--lift">
                <h3>{t}</h3>
                <p>{b}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="weekly" className="mkt__section" style={{ paddingTop: 40 }}>
          <Reveal
            className="mkt__card mkt__grid mkt__grid--2"
            style={{
              alignItems: "center",
              background: "linear-gradient(140deg, rgba(48,209,88,.14), rgba(255,255,255,.04) 60%)",
            }}
          >
            <div>
              <p className="mkt__kicker" style={{ color: "rgba(48,209,88,.95)" }}>
                Free weekly email
              </p>
              <h2 className="mkt__h2" style={{ fontSize: "clamp(26px, 3.4vw, 40px)" }}>
                One email a week, written around the stocks you own.
              </h2>
              <p className="mkt__lede">
                Every Sunday you get one email about your own holdings: what actually
                changed for those companies this week, what it means for your position,
                and two or three new names worth a look given your goals and risk limit.
                It is not the same email sent to everyone. Unsubscribe in one click.
              </p>
            </div>
            <WaitlistForm />
          </Reveal>
        </section>

        <section id="pricing" className="mkt__section">
          <PlanGrid />
          <Reveal className="mkt__card" style={{ marginTop: 16, padding: 0 }}>
            <div className="mkt__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Who it&apos;s for</th>
                    <th>Why the price makes sense</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Free trial</p>
                    </td>
                    <td>Anyone who wants to judge the quality first.</td>
                    <td>Three finished notes on well-known companies. Read every page, then decide.</td>
                  </tr>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Basic</p>
                    </td>
                    <td>Portfolios up to $15,000 — a few holdings and one or two decisions a month.</td>
                    <td>$32 for the year. A 12% year on $15,000 is about $1,800 of profit, so the plan costs under 2% of it.</td>
                  </tr>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Professional</p>
                    </td>
                    <td>Under $50,000 — eight to twelve holdings you review monthly.</td>
                    <td>$60 for the year. Frontier agents are included from here up.</td>
                  </tr>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Professional +</p>
                    </td>
                    <td>Under $150,000 — a full book of up to fifteen names.</td>
                    <td>$100 for the year. Roughly half a percent of a 12% year on $150,000.</td>
                  </tr>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Ultra</p>
                    </td>
                    <td>$150,000 to $500,000 — long-term holdings plus short-term trades.</td>
                    <td>$150 for the year. Under half a percent of a 12% year on $300,000.</td>
                  </tr>
                  <tr>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, color: "#f5f5f7" }}>Pay per use</p>
                    </td>
                    <td>A couple of decisions a year, with no subscription running in the background.</td>
                    <td>$1 with the quick agent, $1.50 with a frontier agent. Balance never expires.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section id="contact" className="mkt__section">
          <Reveal className="mkt__card mkt__grid mkt__grid--2" style={{ alignItems: "start" }}>
            <div>
              <p className="mkt__kicker">Contact us</p>
              <h2 className="mkt__h2" style={{ fontSize: "clamp(26px, 3.4vw, 40px)" }}>
                Ask a question. We read every note.
              </h2>
              <p className="mkt__lede">
                Name, email, phone, and what you need. We reply to the inbox you
                give us, usually within 24–48 hours.
              </p>
            </div>
            <ContactForm />
          </Reveal>
        </section>

        <section className="mkt__section" style={{ paddingBottom: 40 }}>
          <Reveal className="mkt__card" style={{ textAlign: "center", padding: "clamp(36px,6vw,76px) clamp(24px,5vw,60px)" }}>
            <h2 className="mkt__h2" style={{ marginLeft: "auto", marginRight: "auto", maxWidth: "20ch" }}>
              Start with the stock you&apos;re least sure about.
            </h2>
            <p className="mkt__lede" style={{ margin: "0 auto 30px" }}>
              Read three full sample notes free — no card needed. Then bring your own holdings.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup" className="mkt__btn mkt__btn--solid">
                Create account — free
              </Link>
              <Link href="/login" className="mkt__btn mkt__btn--ghost">
                Log in
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="mkt__footer">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="mkt__mark" style={{ width: 20, height: 20 }} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,245,247,.7)" }}>
              eqveste
            </span>
          </div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <a href="#solutions">What it does</a>
            <a href="#method">How it works</a>
            <a href="#frameworks">The rules</a>
            <a href="#pricing">Subscription</a>
            <a href="#whyus">Why us</a>
            <a href="#weekly">Weekly email</a>
            <a href="#contact">Contact</a>
            <Link href="/login">Log in</Link>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,245,247,.64)" }}>
            Research tools for people who invest their own money. We are not a broker and never place trades.
          </p>
        </footer>
      </div>
    </div>
  );
}
