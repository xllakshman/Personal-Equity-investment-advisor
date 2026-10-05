from thesis_platform.status import (
    FOUND,
    INPUTS_MISSING,
    NOT_COVERED,
    NOT_DISCLOSED,
    SOURCE_ERROR,
    is_found,
    is_source_error,
    normalize_status,
)


def test_status_mapping_aliases_and_unknown() -> None:
    assert normalize_status("ok") == FOUND
    assert normalize_status("FOUND") == FOUND
    assert normalize_status(NOT_COVERED) == NOT_COVERED
    assert normalize_status(SOURCE_ERROR) == SOURCE_ERROR
    assert normalize_status(INPUTS_MISSING) == INPUTS_MISSING
    assert normalize_status("NOT_DISCLOSED") == NOT_DISCLOSED
    assert is_found("ok") is True
    assert is_found(NOT_COVERED) is False
    assert is_source_error(SOURCE_ERROR) is True
    assert is_source_error(NOT_COVERED) is False
