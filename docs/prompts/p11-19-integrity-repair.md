# P11-19 — integrity repair (draft)

Runtime system prompt remains `prompt_versions.body`. This file is **not** promoted. Do not send it in HTTP. The only write path for a live advisor body is `/admin/prompt` (`platform_admin`).

## What the worker already does

After the first native-lab completion (`native_llm.py`: OpenAI / Anthropic / xAI / DeepSeek — not OpenRouter), if the parsed note’s machine JSON `current_price` or `roic` disagrees with the evidence pack (`derived.close`, latest pack ROIC) beyond rounding, the worker makes **one** extra `complete_chat` on the **same** `model_catalog` row. It `UPDATE`s `usage_events.cost_cents` on the existing `kind = search` row. It does not insert a second meter row. It does not swap labs (D36). If the rewrite still disagrees, new `reports.sections.integrity_warnings` are stamped (P11-17). Old notes are not `UPDATE`d (D4). Model HTML is never executed.

## json_schema

Analyse stays **text + parse + one repair**. OpenAI Chat Completions documents `response_format.type = json_schema`; that helper exists on the OpenAI adapter only and is **not** sent on the live Analyse/repair path. Anthropic / xAI / DeepSeek schema fields are not guessed. Do not add Gemini or Kimi.

## Optional lines if you later promote a prompt on `/admin/prompt`

Ask the model to copy pack `derived.close` into machine `current_price` and pack latest ROIC into machine `roic`, and to put machine JSON after LAYER 1 (never HTML). Do not auto-UPDATE `prompt_versions`.
