# Model catalog (as of 2026-09-13)

Picker on `/analyse` reads `model_catalog`. The worker calls **OpenRouter** with that row’s `openrouter_model_id` (D39). It must not substitute a cheaper model (D36).

Thesis UI buckets are only **Frontier** and **Quick**. `vendor_class` is the lab’s own name (Opus, Flash, Luna, …). `provider_model_id` is the lab’s native id (docs / possible later native Claude path). `openrouter_only` is the OpenRouter `provider.only` pin (no silent Bedrock/Azure hop).

Every worker completion:

- URL `https://openrouter.ai/api/v1/chat/completions`
- `model` = `openrouter_model_id`
- `provider.allow_fallbacks` = false
- `provider.only` = `[openrouter_only]`
- If the response `model` does not match the slug → `failed`, do not insert `reports`

Do not list restricted/cyber SKUs (Claude Mythos, Gemini Flash Cyber, GPT Cyber). Do not use `openrouter/auto`.

Refresh this file + migration when a lab or OpenRouter slug changes. Apply SQL only with `CONFIRM_APPLY=1` and a named file. If an OpenRouter slug 404s, set `is_active = false` — do not remap to another model.

| Catalog `id` | Shown as | Thesis | Vendor class | Native `provider_model_id` | OpenRouter slug | `openrouter_only` |
|---|---|---|---|---|---|---|
| `gpt6a` | GPT-6 Astra | Frontier | Flagship | `gpt-6-astra` | `openai/gpt-6-astra` | `openai` |
| `gpt56` | GPT-5.6 Sol | Frontier | Flagship | `gpt-5.6-sol` | `openai/gpt-5.6-sol` | `openai` |
| `gpt56t` | GPT-5.6 Terra | Quick | Balanced | `gpt-5.6-terra` | `openai/gpt-5.6-terra` | `openai` |
| `gpt56m` | GPT-5.6 Luna | Quick | Cost-sensitive | `gpt-5.6-luna` | `openai/gpt-5.6-luna` | `openai` |
| `fable51` | Claude Fable 5.1 | Frontier | Fable | `claude-fable-5-1` | `anthropic/claude-fable-5.1` | `anthropic` |
| `opus5` | Claude Opus 5 | Frontier | Opus | `claude-opus-5` | `anthropic/claude-opus-5` | `anthropic` |
| `sonnet48` | Claude Sonnet 5 | Quick | Sonnet | `claude-sonnet-5` | `anthropic/claude-sonnet-5` | `anthropic` |
| `haiku45` | Claude Haiku 4.5 | Quick | Haiku | `claude-haiku-4-5` | `anthropic/claude-haiku-4.5` | `anthropic` |
| `gemini31p` | Gemini 3.1 Pro | Frontier | Pro | `gemini-3.1-pro-preview` | `google/gemini-3.1-pro-preview` | `google-ai-studio` |
| `gemini35` | Gemini 3.1 Pro (legacy id) | Frontier | Pro | `gemini-3.1-pro-preview` | `google/gemini-3.1-pro-preview` | `google-ai-studio` |
| `gemini38f` | Gemini 3.8 Flash | Quick | Flash | `gemini-3.8-flash` | `google/gemini-3.8-flash` | `google-ai-studio` |
| `gemini31fl` | Gemini 3.1 Flash-Lite | Quick | Flash-Lite | `gemini-3.1-flash-lite` | `google/gemini-3.1-flash-lite` | `google-ai-studio` |
| `dsflash` | DeepSeek V4.1 Flash | Quick | Flash | `deepseek-flash` | `deepseek/deepseek-flash` | `deepseek` |
| `grok46` | Grok 4.6 | Frontier | Frontier | `grok-4.6` | `x-ai/grok-4.6` | `x-ai` |
| `grok43` | Grok 4.3 | Quick | General | `grok-4.3` | `x-ai/grok-4.3` | `x-ai` |
| `grokbuild` | Grok Build 0.1 | Quick | Fast coding | `grok-build-0.1` | `x-ai/grok-build-0.1` | `x-ai` |
| `kimik3` | Kimi K3 | Frontier | K3 | `kimi-k3` | `moonshotai/kimi-k3` | `moonshotai` |
| `kimik26` | Kimi K2.6 | Quick | K2.6 | `kimi-k2.6` | `moonshotai/kimi-k2.6` | `moonshotai` |
| `kimik27hs` | Kimi K2.7 Code HighSpeed | Quick | HighSpeed | `kimi-k2.7-code-highspeed` | `moonshotai/kimi-k2.7-code-highspeed` | `moonshotai` |

`gemini35` is **inactive** after 009 (Maya-era id). Refine-gate default: `gpt56m`.

Worker env (never `NEXT_PUBLIC_`): **`OPENROUTER_API_KEY`** for v1 completions. Placeholders (unused until a native-path chunk): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`. Map OpenRouter `usage` into `usage_events.cost_cents`.
