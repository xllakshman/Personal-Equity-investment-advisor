"""Plan-meter kinds. Desk, API quota, and worker consume must use this set."""

METER_KINDS = ("search", "refine", "refine_gate")
NON_METER_KINDS = ("prompt_extract_attempt", "pdf")


def counts_against_plan(kind: str) -> bool:
    return kind in METER_KINDS
