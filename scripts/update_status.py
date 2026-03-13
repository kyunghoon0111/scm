"""
Record pipeline completion status in Supabase raw.system_batch_log.

Usage:
  python scripts/update_status.py --status success
  python scripts/update_status.py --status failed

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


def get_env() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        print("[update_status] SUPABASE_URL / SUPABASE_SERVICE_KEY is required.")
        sys.exit(1)
    return url, key


def build_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept-Profile": "raw",
        "Content-Profile": "raw",
        "Prefer": "return=representation",
    }


def update_latest_batch(url: str, key: str, status: str) -> None:
    headers = build_headers(key)
    now = datetime.now(timezone.utc).isoformat()

    query_url = (
        f"{url}/rest/v1/system_batch_log"
        f"?status=eq.running&order=started_at.desc&limit=1"
    )
    req = urllib.request.Request(query_url, headers=headers)

    try:
        with urllib.request.urlopen(req) as resp:
            rows = json.loads(resp.read())
    except urllib.error.HTTPError:
        rows = []

    if rows:
        batch_id = rows[0]["batch_id"]
        patch_url = f"{url}/rest/v1/system_batch_log?batch_id=eq.{batch_id}"
        body = json.dumps({
            "status": status,
            "finished_at": now,
        }).encode()
        req = urllib.request.Request(patch_url, data=body, headers=headers, method="PATCH")
        try:
            urllib.request.urlopen(req)
            print(f"[update_status] batch {batch_id} -> {status}")
        except urllib.error.HTTPError as exc:
            print(f"[update_status] failed to update batch {batch_id}: {exc}")
    else:
        batch_id = int(datetime.now(timezone.utc).timestamp())
        insert_url = f"{url}/rest/v1/system_batch_log"
        body = json.dumps({
            "batch_id": batch_id,
            "status": status,
            "started_at": now,
            "finished_at": now,
            "file_count": 0,
            "rows_ingested": 0,
        }).encode()
        req = urllib.request.Request(insert_url, data=body, headers=headers, method="POST")
        try:
            urllib.request.urlopen(req)
            print(f"[update_status] created batch {batch_id} -> {status}")
        except urllib.error.HTTPError as exc:
            print(f"[update_status] failed to create batch row: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", required=True, choices=["success", "failed"])
    args = parser.parse_args()

    url, key = get_env()
    update_latest_batch(url, key, args.status)


if __name__ == "__main__":
    main()
