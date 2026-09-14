#!/usr/bin/env python3
"""A record api.eqveste.com → droplet. Does not change apex/www (Vercel)."""

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
DROPLET_IP = "157.245.102.243"
SUB = "api"
BASE = "https://api.porkbun.com/api/json/v3"


def host_key(name: str) -> str:
    if name in {DOMAIN, "", "@"}:
        return "@"
    if name.endswith(f".{DOMAIN}"):
        return name[: -(len(DOMAIN) + 1)]
    return name


def post(auth: dict, path: str, extra: dict | None = None) -> dict:
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    env = parse_env_file(ROOT / ".env.prod")
    key = (env.get("PORKBUN_API_KEY") or "").strip()
    secret = (env.get("PORKBUN_SECRET_KEY") or "").strip()
    if not key or not secret:
        raise SystemExit("PORKBUN_API_KEY and PORKBUN_SECRET_KEY required in .env.prod")
    auth = {"apikey": key, "secretapikey": secret}
    data = post(auth, f"dns/retrieve/{DOMAIN}")
    if data.get("status") != "SUCCESS":
        print(data, file=sys.stderr)
        return 1
    records = data.get("records") or []
    existing = [r for r in records if host_key(r["name"]) == SUB]
    print(f"=== current {SUB}.{DOMAIN} ===")
    if not existing:
        print("  (none)")
    for r in existing:
        print(f"  {r['type']:6} → {r.get('content')}")
    print(f"Would set A {SUB} → {DROPLET_IP}")
    print("Would NOT change: @, www, MX, NS, SPF.")
    if not args.apply:
        print("Dry-run. Writes: python tools/deploy/porkbun_eqveste_api.py --apply")
        return 0
    for r in existing:
        if r["type"] == "A" and r.get("content") == DROPLET_IP:
            print(f"keep A {SUB} → {DROPLET_IP}")
            continue
        res = post(auth, f"dns/delete/{DOMAIN}/{r['id']}")
        print(f"deleted {r['type']} {SUB}: {res.get('status')}")
        if res.get("status") != "SUCCESS":
            return 1
    still = [
        r
        for r in post(auth, f"dns/retrieve/{DOMAIN}").get("records") or []
        if host_key(r["name"]) == SUB and r["type"] == "A" and r.get("content") == DROPLET_IP
    ]
    if still:
        print("already present")
        return 0
    res = post(
        auth,
        f"dns/create/{DOMAIN}",
        {"type": "A", "name": SUB, "content": DROPLET_IP, "ttl": "600"},
    )
    print(f"create A {SUB} → {DROPLET_IP}: {res.get('status')}")
    return 0 if res.get("status") == "SUCCESS" else 1


if __name__ == "__main__":
    sys.exit(main())
