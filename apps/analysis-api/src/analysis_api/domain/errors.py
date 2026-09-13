"""Public error text for HTTP — never prompt_versions.body."""


def public_error_text(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    upper = text.upper()
    if "SYSTEM PROMPT" in upper or "PROMPT_VERSIONS" in upper or "$PROMPT$" in upper:
        return "Job failed."
    return text[:500]
