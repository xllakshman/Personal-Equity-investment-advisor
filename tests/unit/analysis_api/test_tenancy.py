from analysis_api.domain.tenancy import can_read_family, can_write_family


def test_viewer_can_read_not_write() -> None:
    assert can_read_family(True) is True
    assert can_write_family(True, "viewer") is False
    assert can_write_family(True, "member") is True
    assert can_write_family(True, "owner") is True


def test_inactive_member_cannot_read_or_write() -> None:
    assert can_read_family(False) is False
    assert can_write_family(False, "owner") is False
    assert can_write_family(True, "admin") is False
    assert can_write_family(True, "") is False
