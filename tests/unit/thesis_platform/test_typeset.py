from thesis_platform.typeset import key_facts, typeset_blocks


def test_typeset_splits_headings_and_strips_tags() -> None:
    blocks = typeset_blocks(
        "LAYER 1\nTHE BOTTOM LINE\nMeta at $728.\n<script>alert(1)</script>\nWHAT THIS COMPANY DOES\nAds."
    )
    kinds = [b["kind"] for b in blocks]
    assert "h2" in kinds
    blob = " ".join(b.get("text", "") for b in blocks)
    assert "THE BOTTOM LINE" in blob
    assert "<script>" not in blob
    assert "alert(1)" in blob


def test_typeset_empty() -> None:
    assert typeset_blocks("") == []
    assert typeset_blocks("   ") == []


def test_key_facts_price() -> None:
    facts = key_facts(
        ticker="META",
        verdict="Hold",
        machine={"current_price": "728.08", "classification": "HOLD"},
    )
    assert ("Name", "META") in facts
    assert ("Price", "$728.08") in facts
