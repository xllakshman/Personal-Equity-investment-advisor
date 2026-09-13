"""Live RLS + quota alignment. Read-only against DEV. Skips without DB password."""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration

MAYA = "11111111-1111-4111-8111-111111111111"


def _connect(settings):
    import psycopg2

    from thesis_platform.db import connect

    try:
        return connect(settings)
    except psycopg2.OperationalError as exc:
        pytest.skip(f"DEV Postgres unreachable: {exc}")


def test_authenticated_cannot_insert_usage_events(settings_from_env) -> None:
    conn = _connect(settings_from_env)
    try:
        cur = conn.cursor()
        cur.execute("select family_id from family_members where user_id = %s limit 1", (MAYA,))
        row = cur.fetchone()
        if not row:
            pytest.skip("Maya seed not present")
        family_id = row[0]
        cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (MAYA,))
        cur.execute(
            "select set_config('request.jwt.claims', %s, true)",
            ('{"sub":"%s","role":"authenticated"}' % MAYA,),
        )
        cur.execute("set local role authenticated")
        with pytest.raises(Exception):
            cur.execute(
                """
                insert into usage_events (family_id, user_id, kind, cost_cents, billing_period)
                values (%s, %s, 'search', 0, thesis_billing_period_start())
                """,
                (family_id, MAYA),
            )
        conn.rollback()
    finally:
        conn.close()


def test_maya_cannot_read_other_family_holdings(settings_from_env) -> None:
    conn = _connect(settings_from_env)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            select f.id
              from families f
             where f.id not in (
               select family_id from family_members where user_id = %s and is_active
             )
             limit 1
            """,
            (MAYA,),
        )
        other = cur.fetchone()
        if not other:
            pytest.skip("no second family on this project")
        cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (MAYA,))
        cur.execute(
            "select set_config('request.jwt.claims', %s, true)",
            ('{"sub":"%s","role":"authenticated"}' % MAYA,),
        )
        cur.execute("set local role authenticated")
        cur.execute("select count(*) from holdings where family_id = %s", (other[0],))
        count = cur.fetchone()[0]
        assert count == 0
        conn.rollback()
    finally:
        conn.close()


def test_meter_function_matches_search_plus_refine_kinds(settings_from_env) -> None:
    conn = _connect(settings_from_env)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            select 1 from pg_proc where proname = 'thesis_family_meter_count'
            """
        )
        if not cur.fetchone():
            pytest.skip("012 not applied — thesis_family_meter_count missing")
        cur.execute("select family_id from family_members where user_id = %s limit 1", (MAYA,))
        row = cur.fetchone()
        if not row:
            pytest.skip("Maya seed not present")
        family_id = row[0]
        cur.execute("select thesis_billing_period_start()")
        period = cur.fetchone()[0]
        cur.execute("select thesis_family_meter_count(%s, %s)", (family_id, period))
        meter = cur.fetchone()[0]
        cur.execute(
            """
            select count(*)::integer
              from usage_events
             where family_id = %s
               and billing_period = %s
               and kind in ('search', 'refine', 'refine_gate')
            """,
            (family_id, period),
        )
        manual = cur.fetchone()[0]
        assert meter == manual
        cur.execute(
            """
            select count(*)::integer
              from usage_events
             where family_id = %s
               and billing_period = %s
               and kind = 'prompt_extract_attempt'
            """,
            (family_id, period),
        )
        extracts = cur.fetchone()[0]
        assert meter == manual
        assert extracts >= 0
        # Desk used to count search only; that under-counts once refine exists.
        cur.execute(
            """
            select count(*)::integer
              from usage_events
             where family_id = %s
               and billing_period = %s
               and kind = 'search'
            """,
            (family_id, period),
        )
        search_only = cur.fetchone()[0]
        assert meter >= search_only
    finally:
        conn.close()
