# P11-13 — user pack fields (draft)

Runtime system prompt remains `prompt_versions.body`. This file is **not** promoted. Do not send it in HTTP.

The worker appends a JSON **user** pack (`build_variable_pack`) that now includes:

- `derived` — previous close, 52-week closing high, `%` below high, T2/T3/T4 price bands from that high, T1 cost when the book has it, U1/U2 from T1.
- `step0_coverage` — `"1"` present after Yahoo; `"2"` `ok` or `NOT_COVERED` (EDGAR); `"3"`–`"7"` `NOT_COVERED`.

Do not instruct the model to invent 10-year ROIC, XBRL, or news beyond the evidence rows. Do not auto-UPDATE `prompt_versions`.
