from thesis_platform.edgar import (
    cik_from_tickers_map,
    filing_archive_url,
    parse_submissions_headlines,
)
from thesis_platform.http import fetch_edgar_headlines
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
                    "filings": {
                        "recent": {
                            "form": ["8-K"],
                            "filingDate": ["2026-09-01"],
                            "accessionNumber": ["0000789019-26-000001"],
                            "primaryDocument": ["msft-8k.htm"],
                            "primaryDocDescription": ["Results"],
                        }
                    }
                },
            )
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    got = fetch_edgar_headlines(SETTINGS, "MSFT", "NASDAQ", client=client)
    assert got["status"] == "ok"
    assert got["filings"][0]["form"] == "8-K"
    skipped = fetch_edgar_headlines(SETTINGS, "HDFCBANK", "NSE", client=client)
    assert skipped["status"] == "NOT_COVERED"
    assert skipped["filings"] == []


def test_fetch_companyfacts_mock_http_computes_fcf_and_skips_nse() -> None:
    import thesis_platform.http as http_mod
    from thesis_platform.http import fetch_edgar_companyfacts

    http_mod._TICKER_MAP_CACHE = None

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
    assert got["status"] == "ok"
    assert got["years"][0]["fcf"] == 30
    skipped = fetch_edgar_companyfacts(SETTINGS, "HDFCBANK", "NSE", client=client)
    assert skipped["status"] == "NOT_COVERED"
    assert skipped["years"] == []
