"""Variable pack for the advisor completion. Static prefix is prompt_versions.body."""
from __future__ import annotations

import json
from typing import Any


def build_variable_pack(ctx: dict[str, Any]) -> str:
    """Ticker, evidence, lots, clarifications, profile. Never the May 2026 book."""
    payload = {
        "ticker": ctx.get("ticker"),
        "exchange": ctx.get("exchange"),
        "lenses": ctx.get("lenses") or [],
        "intent": ctx.get("intent"),
        "avg_down": ctx.get("avg_down"),
        "risk_band": ctx.get("risk_band"),
        "cagr_band": ctx.get("cagr_band"),
        "tax_residency": ctx.get("tax_residency"),
        "tax_slab": ctx.get("tax_slab"),
        "clarifications": ctx.get("clarifications") or {},
        "enrichment": ctx.get("enrichment") or "",
        "holdings": ctx.get("holdings") or [],
        "evidence": ctx.get("evidence") or [],
        "investor_profiles": ctx.get("investor_profiles") or {},
        "cannot_trade_us_options": bool(ctx.get("cannot_trade_us_options")),
    }
    return json.dumps(payload, default=str)


def required_step0(lenses: list[str]) -> list[int]:
    core = {"fundamental", "technical", "macro", "news"}
    selected = [x for x in lenses if x in core]
    if set(selected) >= core:
        return [1, 2, 3, 4, 5, 6, 7]
    needed = [1]
    if "news" in lenses:
        needed.append(2)
    if "macro" in lenses:
        needed.append(7)
    return needed
