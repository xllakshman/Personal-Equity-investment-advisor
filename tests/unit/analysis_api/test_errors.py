from analysis_api.domain.errors import public_error_text


def test_empty_and_none() -> None:
    assert public_error_text(None) is None
    assert public_error_text("   ") is None
    assert public_error_text("THS-QUOTA-002") == "THS-QUOTA-002"


def test_strips_prompt_leak() -> None:
    assert public_error_text("SYSTEM PROMPT follows: never sell") == "Job failed."
    assert public_error_text("see prompt_versions.body") == "Job failed."
    assert public_error_text("$prompt$PERSONAL") == "Job failed."
