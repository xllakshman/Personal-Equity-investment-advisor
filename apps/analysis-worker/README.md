# Analysis worker (`apps/analysis-worker`)

Queue consumer: Step 0 evidence gather → framework completion → PDF upload → `reports` insert.

**Not implemented yet.** Completions go to OpenRouter (D39) with `OPENROUTER_API_KEY`. Uses `service_role` / direct Postgres. Never returns the system prompt.

See `.cursor/rules/llm-cost-optimization.mdc` and `.cursor/rules/investment-framework.mdc`.
