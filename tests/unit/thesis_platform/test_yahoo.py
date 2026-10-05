"""Yahoo symbol map and previous-close parser (no network)."""
from __future__ import annotations

import pytest

from thesis_platform.yahoo import YahooError, parse_previous_close, yahoo_symbol


def test_us_and_india_symbols() -> None:
    assert yahoo_symbol("MSFT", "NASDAQ") == "MSFT"
    assert yahoo_symbol("BRK.B", "NYSE") == "BRK-B"
    assert yahoo_symbol("HDFCBANK", "NSE") == "HDFCBANK.NS"
    assert yahoo_symbol("RELIANCE", "BSE") == "RELIANCE.BO"


def test_empty_ticker_fails() -> None:
    with pytest.raises(YahooError, match="unknown"):
        yahoo_symbol("", "NASDAQ")
    with pytest.raises(YahooError, match="unknown"):
        yahoo_symbol("   ", None)


def test_unknown_exchange_fails() -> None:
    with pytest.raises(YahooError, match="unknown"):
        yahoo_symbol("MSFT", "FOO")


def test_parse_skips_in_progress_null_bar() -> None:
    payload = {
        "chart": {
            "result": [
                {
                    "meta": {"currency": "USD"},
                    "timestamp": [1, 2, 3],
                    "indicators": {"quote": [{"close": [410.0, 412.5, None]}]},
                }
            ]
        }
    }
    q = parse_previous_close(payload, "MSFT")
    assert q.close == 412.5
    assert q.currency == "USD"
    assert q.yahoo_symbol == "MSFT"


def test_parse_52w_closing_high_not_intraday_meta() -> None:
    payload = {
        "chart": {
            "result": [
                {
                    "meta": {"currency": "USD", "fiftyTwoWeekHigh": 999.0},
                    "timestamp": [1_700_000_000, 1_700_086_400, 1_700_172_800],
                    "indicators": {"quote": [{"close": [100.0, 150.0, 120.0]}]},
                }
            ]
        }
    }
    from thesis_platform.yahoo import parse_yahoo_chart_pack

    pack = parse_yahoo_chart_pack(payload, "MSFT")
    assert pack.previous.close == 120.0
    assert pack.high_52w == 150.0
    assert pack.high_52w != 999.0
    assert len(pack.daily_closes) == 3


def test_us_listed_skips_nse() -> None:
    from thesis_platform.yahoo import is_us_listed

    assert is_us_listed("MSFT", "NASDAQ") is True
    assert is_us_listed("BRK.B", "NYSE") is True
    assert is_us_listed("HDFCBANK", "NSE") is False
    assert is_us_listed("INFY.NS", None) is False


def test_empty_chart_fails() -> None:
    with pytest.raises(YahooError, match="empty"):
        parse_previous_close({"chart": {"result": []}}, "MSFT")
    with pytest.raises(YahooError, match="close"):
        parse_previous_close(
            {"chart": {"result": [{"meta": {}, "timestamp": [], "indicators": {"quote": [{"close": []}]}}]}},
            "MSFT",
        )
