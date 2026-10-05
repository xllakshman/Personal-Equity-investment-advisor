from thesis_platform.edgar import (
    cik_from_tickers_map,
    filing_archive_url,
    parse_submissions_headlines,
)
from thesis_platform.http import fetch_edgar_headlines
from thesis_platform.integrity import news_is_absent
from thesis_platform.config import Settings

import httpx


SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_db_host="db.example.supabase.co",
    supabase_db_password="x",
    market_data_user_agent="EqvesteTest/0.1 (test@example.com)",
)


def test_cik_and_headlines_skip_form_4_and_full_html() -> None:
    mapping = {"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}}
    assert cik_from_tickers_map(mapping, "MSFT") == "0000789019"
    payload = {
        "filings": {
            "recent": {
                "form": ["8-K", "4", "10-Q", "10-K"],
                "filingDate": ["2026-09-01", "2026-08-01", "2026-07-01", "2026-06-01"],
                "accessionNumber": ["000-1", "000-2", "000-3", "000-4"],
                "primaryDocument": ["a.htm", "b.htm", "c.htm", "d.htm"],
                "primaryDocDescription": [
                    "Results of operations",
                    "insider",
                    "Quarterly report",
                    "Annual report",
                ],
            }
        }
    }
    rows = parse_submissions_headlines(payload, "0000789019")
    forms = [r["form"] for r in rows]
    assert forms == ["8-K", "10-Q", "10-K"]
    assert all("<html" not in r["summary"].lower() for r in rows)
    assert "www.sec.gov/Archives/edgar" in filing_archive_url(
        "0000789019", "000-1", "a.htm"
    )


def test_fetch_edgar_mock_http_and_non_us() -> None:
    import thesis_platform.http as http_mod

    http_mod._TICKER_MAP_CACHE = None
    http_mod._SUBMISSIONS_CACHE = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        assert "stockanalysis.com" not in url
        if "company_tickers" in url:
            return httpx.Response(
                200,
                json={"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}},
            )
        if "data.sec.gov/submissions" in url:
            return httpx.Response(
                200,
                json={
                    "category": "Large accelerated filer",
                    "filings": {
                        "recent": {
                            "form": ["8-K"],
                            "filingDate": ["2026-09-01"],
                            "accessionNumber": ["0000789019-26-000001"],
                            "primaryDocument": ["msft-8k.htm"],
                            "primaryDocDescription": ["Results"],
                        }
                    },
                },
            )
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_headlines(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "FOUND"
    assert got["filings"][0]["form"] == "8-K"
    assert got["filer_type"] == "Large accelerated filer"
    skipped = fetch_edgar_headlines(SETTINGS, "HDFCBANK", "NSE", client=client)
    assert skipped["status"] == "NOT_COVERED"
    assert skipped["filings"] == []
    assert "NOT_DISCLOSED" not in str(skipped)


def test_fetch_companyfacts_mock_http_computes_fcf_and_skips_nse() -> None:
    import thesis_platform.http as http_mod
    from thesis_platform.http import fetch_edgar_companyfacts

    http_mod._TICKER_MAP_CACHE = None
    http_mod._SUBMISSIONS_CACHE = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        assert "stockanalysis.com" not in url
        if "company_tickers" in url:
            return httpx.Response(
                200,
                json={"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}},
            )
        if "companyfacts" in url:
            assert "CIK0000789019" in url
            return httpx.Response(
                200,
                json={
                    "entityName": "Microsoft",
                    "facts": {
                        "us-gaap": {
                            "Revenues": {
                                "units": {
                                    "USD": [
                                        {
                                            "fy": 2024,
                                            "fp": "FY",
                                            "form": "10-K",
                                            "val": 100,
                                            "filed": "2024-08-01",
                                        }
                                    ]
                                }
                            },
                            "NetCashProvidedByUsedInOperatingActivities": {
                                "units": {
                                    "USD": [
                                        {
                                            "fy": 2024,
                                            "fp": "FY",
                                            "form": "10-K",
                                            "val": 40,
                                            "filed": "2024-08-01",
                                        }
                                    ]
                                }
                            },
                            "PaymentsToAcquirePropertyPlantAndEquipment": {
                                "units": {
                                    "USD": [
                                        {
                                            "fy": 2024,
                                            "fp": "FY",
                                            "form": "10-K",
                                            "val": 10,
                                            "filed": "2024-08-01",
                                        }
                                    ]
                                }
                            },
                        }
                    },
                },
            )
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_companyfacts(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "FOUND"
    assert got["years"][0]["fcf"] == 30
    skipped = fetch_edgar_companyfacts(SETTINGS, "HDFCBANK", "NSE", client=client)
    assert skipped["status"] == "NOT_COVERED"
    assert skipped["years"] == []
    assert "NOT_DISCLOSED" not in str(skipped)


def test_edgar_timeout_is_source_error_not_no_news() -> None:
    import thesis_platform.http as http_mod

    http_mod._TICKER_MAP_CACHE = None
    http_mod._SUBMISSIONS_CACHE = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "company_tickers" in url:
            return httpx.Response(
                200,
                json={"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}},
            )
        raise httpx.ReadTimeout("timed out")

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_headlines(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "SOURCE_ERROR"
    assert got["filings"] == []
    assert news_is_absent(got) is False


def test_successful_empty_headlines_is_found_absence() -> None:
    import thesis_platform.http as http_mod

    http_mod._TICKER_MAP_CACHE = None
    http_mod._SUBMISSIONS_CACHE = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "company_tickers" in url:
            return httpx.Response(
                200,
                json={"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}},
            )
        if "data.sec.gov/submissions" in url:
            return httpx.Response(
                200,
                json={
                    "category": "Accelerated filer",
                    "filings": {
                        "recent": {
                            "form": ["4"],
                            "filingDate": ["2026-09-01"],
                            "accessionNumber": ["000-1"],
                            "primaryDocument": ["form4.htm"],
                            "primaryDocDescription": ["insider"],
                        }
                    },
                },
            )
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_headlines(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "FOUND"
    assert got["filings"] == []
    assert got["filer_type"] == "Accelerated filer"
    assert news_is_absent(got) is True


def test_latest_8k_prefers_item_202_and_strips_html() -> None:
    from thesis_platform.edgar import (
        exhibit_99_1_name,
        latest_earnings_8k,
        strip_filing_html,
    )

    payload = {
        "filings": {
            "recent": {
                "form": ["8-K", "8-K"],
                "filingDate": ["2026-09-02", "2026-09-01"],
                "accessionNumber": ["000-dir", "000-earn"],
                "primaryDocument": ["dir.htm", "earn.htm"],
                "primaryDocDescription": ["Director resignation", "Results of operations"],
                "items": ["5.02", "2.02,9.01"],
            }
        }
    }
    row = latest_earnings_8k(payload, "0000789019")
    assert row is not None
    assert row["accession"] == "000-earn"
    assert "2.02" in row["items"]
    index = {
        "directory": {
            "item": [
                {"name": "earn.htm", "type": "8-K"},
                {"name": "ex99-1.htm", "type": "EX-99.1"},
            ]
        }
    }
    assert exhibit_99_1_name(index) == "ex99-1.htm"
    text = strip_filing_html("<html><script>x</script><p>EPS of $6.50 to $6.80</p></html>")
    assert "6.50" in text
    assert "<p>" not in text
    assert "script" not in text.lower()


def test_fetch_earnings_exhibit_mock_and_nse() -> None:
    import thesis_platform.http as http_mod
    from thesis_platform.http import fetch_edgar_earnings_exhibit
    from thesis_platform.status import NOT_DISCLOSED

    http_mod._TICKER_MAP_CACHE = None
    http_mod._SUBMISSIONS_CACHE = {}
    http_mod._SUBMISSIONS_CACHE = {}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        assert "stockanalysis.com" not in url
        assert "finnhub" not in url
        if "company_tickers" in url:
            return httpx.Response(
                200,
                json={"0": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft"}},
            )
        if "data.sec.gov/submissions" in url:
            return httpx.Response(
                200,
                json={
                    "filings": {
                        "recent": {
                            "form": ["8-K"],
                            "filingDate": ["2026-09-01"],
                            "accessionNumber": ["0000789019-26-000001"],
                            "primaryDocument": ["msft-8k.htm"],
                            "primaryDocDescription": ["Results of operations"],
                            "items": ["2.02,9.01"],
                        }
                    }
                },
            )
        if "index.json" in url:
            return httpx.Response(
                200,
                json={
                    "directory": {
                        "item": [{"name": "ex99-1.htm", "type": "EX-99.1"}]
                    }
                },
            )
        if "ex99-1.htm" in url:
            return httpx.Response(
                200,
                text="<html><body>We expect diluted EPS of $6.50 to $6.80</body></html>",
            )
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_earnings_exhibit(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "FOUND"
    assert "6.50" in got["text"]
    assert "<html" not in got["text"].lower()
    skipped = fetch_edgar_earnings_exhibit(SETTINGS, "HDFCBANK", "NSE", client=client)
    assert skipped["status"] == "NOT_COVERED"
    assert skipped["text"] == ""
    assert NOT_DISCLOSED not in str(skipped)
