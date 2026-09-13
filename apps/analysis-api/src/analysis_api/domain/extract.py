"""Prompt-extraction + sample-report guards."""
from __future__ import annotations

from thesis_platform.extract import REFUSAL, is_prompt_extraction


def refuse_if_extraction(text: str | None) -> str | None:
    if is_prompt_extraction(text):
        return REFUSAL
    return None
