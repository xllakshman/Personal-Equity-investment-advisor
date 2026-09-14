#!/usr/bin/env python3
"""Read-only DEV vs PROD schema parity. Never INSERT/UPDATE/DDL."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages/python"))

import psycopg2
from psycopg2.extensions import connection

from thesis_platform.schema_parity import (
    COUNT_RELATIONS,
    DEV_PROJECT_REF,
    PROD_PROJECT_REF,
    SchemaInventory,
    assert_env_hosts,
    build_report,
    db_host_from_env,
    format_report,
    list_git_migrations,
    native_llm_keys_set,
    parse_env_file,
    project_ref_from_url,
)

DEV_ENV = ROOT / ".env"
PROD_ENV = ROOT / ".env.prod"
MIGRATIONS = ROOT / "supabase/migrations"


def _connect_readonly(host: str, password: str) -> connection:
    conn = psycopg2.connect(
        host=host,
        port=5432,
        dbname="postgres",
        user="postgres",
        password=password,
        sslmode="require",
        connect_timeout=20,
        options="-c statement_timeout=15000",
    )
    conn.set_session(readonly=True, autocommit=True)
    return conn


def _one_col(cur, sql: str, params: tuple | None = None) -> tuple[str, ...]:
    cur.execute(sql, params)
    return tuple(str(row[0]) for row in cur.fetchall())


def _relation_exists(cur, name: str) -> bool:
    cur.execute(
        """
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = %s
          and c.relkind in ('r', 'v', 'm')
        """,
        (name,),
    )
    return cur.fetchone() is not None


def fetch_inventory(conn: connection, project_ref: str) -> SchemaInventory:
    with conn.cursor() as cur:
        cur.execute(
            """
            select exists (
              select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'schema_migrations'
            )
            """
        )
        has_migrations = bool(cur.fetchone()[0])
        migrations: tuple[tuple[int, str], ...] = ()
        if has_migrations:
            cur.execute("select id, name from schema_migrations order by id")
            migrations = tuple((int(row[0]), str(row[1])) for row in cur.fetchall())

        tables = _one_col(
            cur,
            """
            select tablename from pg_tables
            where schemaname = 'public'
            order by 1
            """,
        )
        views = _one_col(
            cur,
            """
            select viewname from pg_views
            where schemaname = 'public'
            order by 1
            """,
        )
        functions = _one_col(
            cur,
            """
            select p.proname
            from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
            order by 1
            """,
        )
        enums = _one_col(
            cur,
            """
            select t.typname
            from pg_type t
            join pg_namespace n on n.oid = t.typnamespace
            where n.nspname = 'public' and t.typtype = 'e'
            order by 1
            """,
        )
        rls_on = _one_col(
            cur,
            """
            select c.relname
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
            order by 1
            """,
        )

        cur.execute(
            """
            select exists (
              select 1 from information_schema.tables
              where table_schema = 'storage' and table_name = 'buckets'
            )
            """
        )
        buckets: tuple[str, ...] = ()
        if cur.fetchone()[0]:
            buckets = _one_col(cur, "select id from storage.buckets order by 1")

        row_counts: dict[str, int | None] = {}
        for name in COUNT_RELATIONS:
            if not _relation_exists(cur, name):
                row_counts[name] = None
                continue
            cur.execute(f'select count(*)::int from public."{name}"')
            row_counts[name] = int(cur.fetchone()[0])

    return SchemaInventory(
        project_ref=project_ref,
        migrations=migrations,
        tables=tables,
        views=views,
        functions=functions,
        enums=enums,
        rls_on=rls_on,
        buckets=buckets,
        row_counts=row_counts,
    )


def run() -> int:
    parser = argparse.ArgumentParser(
        description="Read-only DEV vs PROD schema parity (no writes).",
    )
    parser.add_argument(
        "--print-pending",
        action="store_true",
        help="Print pending migration filenames only (one per line).",
    )
    args = parser.parse_args()

    if not DEV_ENV.is_file():
        print("Missing .env (DEV).", file=sys.stderr)
        return 1
    if not PROD_ENV.is_file():
        print("Missing .env.prod. cp .env.prod.example .env.prod and paste keys.", file=sys.stderr)
        return 1

    try:
        dev_env = parse_env_file(DEV_ENV)
        prod_env = parse_env_file(PROD_ENV)
        assert_env_hosts(dev=dev_env, prod=prod_env)
    except (OSError, RuntimeError) as exc:
        print(f"Config: {exc}", file=sys.stderr)
        return 1

    git_files = list_git_migrations(MIGRATIONS)
    if not git_files:
        print("No supabase/migrations/*.sql", file=sys.stderr)
        return 1

    dev_host = db_host_from_env(dev_env)
    prod_host = db_host_from_env(prod_env)
    print(f"DEV  host: {dev_host} (ref {DEV_PROJECT_REF})", file=sys.stderr)
    print(f"PROD host: {prod_host} (ref {PROD_PROJECT_REF})", file=sys.stderr)

    try:
        dev_conn = _connect_readonly(dev_host, dev_env["SUPABASE_DB_PASSWORD"])
        prod_conn = _connect_readonly(prod_host, prod_env["SUPABASE_DB_PASSWORD"])
    except psycopg2.Error as exc:
        print(f"Connect failed (password not printed): {type(exc).__name__}", file=sys.stderr)
        return 1

    try:
        with dev_conn:
            if project_ref_from_url(dev_env["SUPABASE_URL"]) != DEV_PROJECT_REF:
                print("DEV URL drifted after connect.", file=sys.stderr)
                return 1
            dev_inv = fetch_inventory(dev_conn, DEV_PROJECT_REF)
        with prod_conn:
            prod_inv = fetch_inventory(prod_conn, PROD_PROJECT_REF)
    except psycopg2.Error as exc:
        print(f"Read failed: {type(exc).__name__}", file=sys.stderr)
        return 1
    finally:
        dev_conn.close()
        prod_conn.close()

    report = build_report(
        git_files=git_files,
        dev=dev_inv,
        prod=prod_inv,
        native_llm_keys_set=native_llm_keys_set(prod_env),
    )

    if args.print_pending:
        if not report.apply_ok:
            print(report.apply_reason, file=sys.stderr)
            return 3
        for name in report.pending_files:
            print(name)
        return 0

    print(format_report(report))
    return 0 if report.apply_ok else 3


if __name__ == "__main__":
    sys.exit(run())
