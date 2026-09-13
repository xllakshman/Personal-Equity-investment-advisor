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


def test_empty_chart_fails() -> None:
    with pytest.raises(YahooError, match="empty"):
        parse_previous_close({"chart": {"result": []}}, "MSFT")
    with pytest.raises(YahooError, match="close"):
        parse_previous_close(
            {"chart": {"result": [{"meta": {}, "timestamp": [], "indicators": {"quote": [{"close": []}]}}]}},
            "MSFT",
        )
