"""
Verify current Supabase REST access boundaries.

Usage:
  python scripts/verify_supabase_access.py

Environment:
  SUPABASE_URL
  SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


TESTS = [
    {
        "name": "mart_inventory_onhand",
        "method": "GET",
        "schema": "mart",
        "path": "/rest/v1/mart_inventory_onhand?select=snapshot_date&limit=1",
    },
    {
        "name": "ops_threshold_config",
        "method": "GET",
        "schema": "ops",
        "path": "/rest/v1/threshold_config?select=category,key,value&limit=1",
    },
    {
        "name": "core_fact_po",
        "method": "GET",
        "schema": "core",
        "path": "/rest/v1/fact_po?select=po_id&limit=1",
    },
    {
        "name": "rpc_list_users",
        "method": "POST",
        "schema": None,
        "path": "/rest/v1/rpc/list_users",
        "body": {},
    },
    {
        "name": "rpc_get_system_status",
        "method": "POST",
        "schema": None,
        "path": "/rest/v1/rpc/get_system_status",
        "body": {},
    },
]


def get_env() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        print("[verify_supabase_access] SUPABASE_URL and SUPABASE_ANON_KEY are required.")
        sys.exit(1)
    return url, key


def request(url: str, key: str, test: dict[str, object]) -> dict[str, object]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    if test.get("schema"):
        headers["Accept-Profile"] = str(test["schema"])
    if test["method"] == "POST":
        headers["Content-Type"] = "application/json"

    body = None
    if "body" in test:
        body = json.dumps(test["body"]).encode()

    req = urllib.request.Request(
        f"{url}{test['path']}",
        data=body,
        headers=headers,
        method=str(test["method"]),
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
            return {
                "name": test["name"],
                "status": resp.status,
                "body": payload[:220],
            }
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        return {
            "name": test["name"],
            "status": exc.code,
            "body": payload[:220],
        }


def main() -> int:
    url, key = get_env()
    results = [request(url, key, test) for test in TESTS]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
