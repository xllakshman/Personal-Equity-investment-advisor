#!/usr/bin/env python3
"""Set prod Auth Site URL + redirect allowlist. Needs SUPABASE_ACCESS_TOKEN (account PAT, not service role)."""

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

PROD_REF = "ndgvglcrkbygovlszxze"
SITE_URL = "https://eqveste.com"
ALLOW = [
    "https://eqveste.com/**",
    "https://www.eqveste.com/**",
    "https://equity-investment-advisor-prod.vercel.app/**",
]
BASE = f"https://api.supabase.com/v1/projects/{PROD_REF}/config/auth"


def request(method: str, token: str, payload: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(BASE, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        raise SystemExit(f"HTTP {e.code}: {raw[:400]}") from e


def load_token() -> str:
    env = parse_env_file(ROOT / ".env.prod")
    token = (env.get("SUPABASE_ACCESS_TOKEN") or "").strip()
    if not token:
        raise SystemExit(
            "Missing SUPABASE_ACCESS_TOKEN in .env.prod. "
            "Create one at https://supabase.com/dashboard/account/tokens "
            "(not the service role). Do not paste it in chat."
        )
    return token


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    token = load_token()
    cfg = request("GET", token)
    print(f"project: {PROD_REF}")
    print(f"BEFORE site_url: {cfg.get('site_url')}")
    print(f"BEFORE uri_allow_list: {cfg.get('uri_allow_list')}")
    print(f"Would set site_url: {SITE_URL}")
    print(f"Would set uri_allow_list: {','.join(ALLOW)}")
    if not args.apply:
        print("Dry-run. Writes: python tools/deploy/supabase_prod_auth_urls.py --apply")
        return 0
    out = request(
        "PATCH",
        token,
        {"site_url": SITE_URL, "uri_allow_list": ",".join(ALLOW)},
    )
    print(f"AFTER site_url: {out.get('site_url')}")
    print(f"AFTER uri_allow_list: {out.get('uri_allow_list')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
