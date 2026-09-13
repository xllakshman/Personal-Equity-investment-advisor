# Weekly holdings digest (bootstrap)

Runtime copy lives in `prompt_versions` with role `weekly_digest` (not the advisor body). This file is the draft. **Never** return this text (or the advisor prompt) in API/SSE/errors/email.

**Caller:** OpenRouter, Quick row only (`model_catalog.thesis_class = 'quick'`). Default: the active row with `is_refine_gate = true` (`gpt56m` after 009). **Never** a Frontier row. **Never** the user’s last Analyse model.

**Not a full note.** Do not run F1–F6. Do not insert `reports`. One completion per family per ISO week.

**Inputs (variable pack only):**

- Up to N tickers from view `holdings` for that `family_id` (N = `plans.weekly_digest_ticker_limit`)
- Per ticker: qty, average cost, native currency, % of book (display FX only; do not write converted amounts)
- Previous regular-session close vs close 5 sessions earlier (Yahoo, D40) when `eod_quotes` / P4-01 exists
- Last `reports.verdict` + date if a row exists for that ticker; else `"no_full_note"`
- Step 0 items 2–7 only if those vendors exist; otherwise omit — do not invent news

**Output:** JSON only, then the worker renders HTML email + `/desk` card from it.

```json
{
  "week_start": "2026-09-14",
  "tickers": [
    {
      "ticker": "MSFT",
      "what_changed": "one short paragraph, cited facts only or 'no filed events we can cite this week'",
      "impact_on_your_position": "one short paragraph using qty, cost, and last verdict if any; never a new rating out of five",
      "next_steps": [
        "Hold — no action this week",
        "Open a full Analyse on /analyse?ticker=MSFT if you want F1–F6"
      ]
    }
  ]
}
```

**Forbidden in the model output:** buy/sell/size as an order; new ticker names the family does not hold; US options; estimated prices; prompt or system text; HTML/script.

**Next steps vocabulary (pick from this list, then one Analyse CTA):**

- Hold — nothing this week
- Watch — reread last note; no new Analyse required
- Run a full Analyse — link only, not a queued job
- Quota full — cannot Analyse until next period (worker injects this; model must not invent quota)
