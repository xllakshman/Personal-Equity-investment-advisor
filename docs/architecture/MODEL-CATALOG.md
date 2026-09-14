# Model catalog (as of 2026-09-15)

`/analyse` picker reads `model_catalog` (`id`, `label`, `provider`, `vendor_class`, `thesis_class`, `cost_cents_per_run`) for `is_active` rows. Frontier vs Quick is `thesis_class`. The worker and FastAPI refine routes call the **lab APIs** with that row’s `provider` + `provider_model_id` (D39). They must not substitute a cheaper model (D36).

Thesis UI buckets are only **Frontier** and **Quick**. `vendor_class` is the lab’s own name (Opus, Flash, Luna, …). `provider_model_id` is the HTTP `model` sent to that lab. Columns `openrouter_model_id` / `openrouter_only` remain on the table from 009 but are unused.

Every completion:

| `provider` | Env key | URL | HTTP `model` |
|---|---|---|---|
| `openai` | `OPENAI_API_KEY` | `https://api.openai.com/v1/chat/completions` | `provider_model_id` |
| `anthropic` | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1/messages` | `provider_model_id` |
| `xai` | `XAI_API_KEY` | `https://api.x.ai/v1/chat/completions` | `provider_model_id` |
| `deepseek` | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/v1/chat/completions` | `provider_model_id` |

If the response `model` does not match `provider_model_id` → job `failed` / HTTP error, do not insert `reports`. Missing key for that provider → same. Do not use OpenRouter, `openrouter/auto`, or Google / Moonshot.

Refresh this file + a migration when a lab id changes. Apply SQL only with `CONFIRM_APPLY=1` and a named file. If a lab id 404s, set `is_active = false` — do not remap to another model.

**019** (in git, not applied until named): `is_active = false` for `provider in ('google','moonshot')`; `plans.allowed_model_ids` rebuilt from remaining active rows. `/analyse` also filters to those four providers in `loadAnalyseBuilder` so Gemini / Kimi do not appear even before 019 is applied. OpenAI / Claude / Grok / DeepSeek **labels stay the same**.

| Catalog `id` | Shown as | Thesis | Vendor class | Native `provider_model_id` | Active after 019 |
|---|---|---|---|---|---|
| `gpt6a` | GPT-6 Astra | Frontier | Flagship | `gpt-6-astra` | yes |
| `gpt56` | GPT-5.6 Sol | Frontier | Flagship | `gpt-5.6-sol` | yes |
| `gpt56t` | GPT-5.6 Terra | Quick | Balanced | `gpt-5.6-terra` | yes |
| `gpt56m` | GPT-5.6 Luna | Quick | Cost-sensitive | `gpt-5.6-luna` | yes (refine-gate) |
| `fable51` | Claude Fable 5.1 | Frontier | Fable | `claude-fable-5-1` | yes |
| `opus5` | Claude Opus 5 | Frontier | Opus | `claude-opus-5` | yes |
| `sonnet48` | Claude Sonnet 5 | Quick | Sonnet | `claude-sonnet-5` | yes |
| `haiku45` | Claude Haiku 4.5 | Quick | Haiku | `claude-haiku-4-5` | yes |
| `dsflash` | DeepSeek V4.1 Flash | Quick | Flash | `deepseek-flash` | yes |
| `grok46` | Grok 4.6 | Frontier | Frontier | `grok-4.6` | yes |
| `grok43` | Grok 4.3 | Quick | General | `grok-4.3` | yes |
| `grokbuild` | Grok Build 0.1 | Quick | Fast coding | `grok-build-0.1` | yes |
| `gemini31p` | Gemini 3.1 Pro | Frontier | Pro | `gemini-3.1-pro-preview` | **no** |
| `gemini35` | Gemini 3.1 Pro (legacy id) | Frontier | Pro | `gemini-3.1-pro-preview` | no (already off in 009) |
| `gemini38f` | Gemini 3.8 Flash | Quick | Flash | `gemini-3.8-flash` | **no** |
| `gemini31fl` | Gemini 3.1 Flash-Lite | Quick | Flash-Lite | `gemini-3.1-flash-lite` | **no** |
| `kimik3` | Kimi K3 | Frontier | K3 | `kimi-k3` | **no** |
| `kimik26` | Kimi K2.6 | Quick | K2.6 | `kimi-k2.6` | **no** |
| `kimik27hs` | Kimi K2.7 Code HighSpeed | Quick | HighSpeed | `kimi-k2.7-code-highspeed` | **no** |

`gemini35` is **inactive** after 009 (Maya-era id). Refine-gate default: `gpt56m` (sort_order 13).

Worker / FastAPI env (never `NEXT_PUBLIC_`, never Vercel): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY` for the labs you will run. Copy `usage.cost` into `usage_events.cost_cents` when the lab returns it; otherwise `model_catalog.cost_cents_per_run`.
