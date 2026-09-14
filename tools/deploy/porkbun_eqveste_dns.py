#!/usr/bin/env python3
"""eqveste.com Porkbun DNS for Vercel. Default is retrieve/dry-run (no writes)."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages/python"))

from thesis_platform.schema_parity import parse_env_file

DOMAIN = "eqveste.com"
VERCEL_A = "76.76.21.21"
PARKING_MARKERS = ("207.207.210.", "uixie.porkbun.com", "pixie.porkbun.com", "l.ink")
BASE = "https://api.porkbun.com/api/json/v3"


def host_key(name: str) -> str:
    if name in {DOMAIN, "", "@"}:
        return "@"
    if name == f"www.{DOMAIN}":
        return "www"
    if name.endswith(f".{DOMAIN}"):
        return name[: -(len(DOMAIN) + 1)]
    return name


def post(auth: dict[str, str], path: str, extra: dict | None = None) -> dict:
    body = {**auth, **(extra or {})}
    req = urllib.request.Request(
        f"{BASE}/{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return json.loads(raw)
        except Exception:
            return {"status": "ERROR", "http": e.code, "raw": raw[:200]}


def load_auth() -> dict[str, str]:
    env_path = ROOT / ".env.prod"
    env = parse_env_file(env_path)
    key = (env.get("PORKBUN_API_KEY") or "").strip()
    secret = (env.get("PORKBUN_SECRET_KEY") or "").strip()
    if not key or not secret:
        raise SystemExit("PORKBUN_API_KEY and PORKBUN_SECRET_KEY must be set in .env.prod")
    return {"apikey": key, "secretapikey": secret}


def is_web_host(hk: str) -> bool:
    return hk in {"@", "www"}


def should_drop(rec: dict) -> bool:
    hk = host_key(rec["name"])
    typ = rec["type"]
    content = rec.get("content") or ""
    parking = any(m in content for m in PARKING_MARKERS)
    if hk == "*" and typ == "CNAME" and parking:
        return True
    if not is_web_host(hk):
        return False
    if typ == "TXT":
        return False
    if typ in {"A", "CNAME", "ALIAS", "URL"}:
        return True
    return False


def plan(records: list[dict]) -> tuple[list[dict], list[tuple[str, str, str]]]:
    drops = [r for r in records if should_drop(r)]
    creates = [
        ("A", "", VERCEL_A),
        ("A", "www", VERCEL_A),
    ]
    return drops, creates


def main() -> int:
    parser = argparse.ArgumentParser(description="eqveste.com Porkbun A records for Vercel.")
    parser.add_argument("--apply", action="store_true", help="Write DNS (default is dry-run).")
    args = parser.parse_args()
    auth = load_auth()
    data = post(auth, f"dns/retrieve/{DOMAIN}")
    if data.get("status") != "SUCCESS":
        print(f"retrieve failed (enable API access for {DOMAIN} on the key): {data.get('message') or data.get('status')}", file=sys.stderr)
        return 1
    records = data.get("records") or []
    print(f"=== DNS retrieve {DOMAIN} ({len(records)} records) ===")
    for r in records:
        print(f"  {r['type']:6} {host_key(r['name']):8} → {r.get('content')}")
    drops, creates = plan(records)
    print("Would delete (apex/www parking or stale web):")
    if not drops:
        print("  (none)")
    for r in drops:
        print(f"  {r['type']:6} {host_key(r['name']):8} → {r.get('content')}")
    print("Would create:")
    for typ, name, content in creates:
        label = "@" if name == "" else name
        print(f"  {typ:6} {label:8} → {content}")
    print("Would NOT change: MX, SPF, NS, ACME TXT, api, nameservers.")
    if not args.apply:
        print("Dry-run. Writes: python tools/deploy/porkbun_eqveste_dns.py --apply")
        return 0

    for r in drops:
        res = post(auth, f"dns/delete/{DOMAIN}/{r['id']}")
        print(f"deleted {r['type']} {host_key(r['name'])}: {res.get('status')}")
        if res.get("status") != "SUCCESS":
            print(res, file=sys.stderr)
            return 1
    for typ, name, content in creates:
        res = post(
            auth,
            f"dns/create/{DOMAIN}",
            {"type": typ, "name": name, "content": content, "ttl": "600"},
        )
        label = "@" if name == "" else name
        print(f"create {typ} {label} → {content}: {res.get('status')}")
        if res.get("status") != "SUCCESS":
            print(res, file=sys.stderr)
            return 1
    after = post(auth, f"dns/retrieve/{DOMAIN}")
    print("=== after (apex/www) ===")
    for r in after.get("records") or []:
        hk = host_key(r["name"])
        if is_web_host(hk):
            print(f"  {r['type']:6} {hk:8} → {r.get('content')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
