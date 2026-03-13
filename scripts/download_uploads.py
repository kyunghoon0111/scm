"""
Supabase Storage에서 신규 업로드 파일을 다운로드하여 inbox/에 복사.
처리 완료 후 Storage에서 processed/ 폴더로 이동.

환경변수:
  SUPABASE_URL, SUPABASE_SERVICE_KEY
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# supabase-py가 없으면 HTTP 직접 호출
try:
    from supabase import create_client
    HAS_SUPABASE_PY = True
except ImportError:
    HAS_SUPABASE_PY = False
    import urllib.request
    import urllib.error

BUCKET = "uploads"
INBOX_DIR = Path("inbox")
PROCESSED_PREFIX = "processed"


def get_env():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        print("[download_uploads] SUPABASE_URL / SUPABASE_SERVICE_KEY 환경변수가 필요합니다.")
        sys.exit(1)
    return url, key


def download_with_sdk(url: str, key: str):
    """supabase-py SDK를 사용한 다운로드"""
    client = create_client(url, key)
    storage = client.storage.from_(BUCKET)

    # 루트의 파일 목록 (폴더별 사용자 업로드)
    items = storage.list("", {"limit": 1000})
    downloaded = []

    for folder in items:
        if folder.get("id") is None:
            # 폴더 — 내부 파일 목록 조회
            folder_name = folder["name"]
            if folder_name == PROCESSED_PREFIX:
                continue
            files = storage.list(folder_name, {"limit": 1000})
            for f in files:
                if f.get("id") is None:
                    continue  # 하위 폴더 스킵
                remote_path = f"{folder_name}/{f['name']}"
                local_path = INBOX_DIR / f["name"]
                print(f"  다운로드: {remote_path} → {local_path}")
                data = storage.download(remote_path)
                local_path.write_bytes(data)
                downloaded.append(remote_path)
        else:
            # 루트 레벨 파일
            remote_path = folder["name"]
            local_path = INBOX_DIR / folder["name"]
            print(f"  다운로드: {remote_path} → {local_path}")
            data = storage.download(remote_path)
            local_path.write_bytes(data)
            downloaded.append(remote_path)

    return downloaded


def download_with_http(url: str, key: str):
    """HTTP 직접 호출로 다운로드 (supabase-py 없을 때)"""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    downloaded = []

    # 버킷 파일 목록
    list_url = f"{url}/storage/v1/object/list/{BUCKET}"
    body = json.dumps({"prefix": "", "limit": 1000}).encode()
    req = urllib.request.Request(list_url, data=body, headers={**headers, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        items = json.loads(resp.read())

    for item in items:
        name = item.get("name", "")
        if not name or name.startswith(f"{PROCESSED_PREFIX}/"):
            continue

        # 폴더인 경우 (metadata가 없으면 폴더)
        if item.get("metadata") is None:
            sub_body = json.dumps({"prefix": name, "limit": 1000}).encode()
            sub_req = urllib.request.Request(list_url, data=sub_body, headers={**headers, "Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(sub_req) as sub_resp:
                sub_items = json.loads(sub_resp.read())
            for sub in sub_items:
                sub_name = sub.get("name", "")
                if not sub_name or sub.get("metadata") is None:
                    continue
                remote_path = f"{name}/{sub_name}"
                _download_file(url, key, headers, remote_path, sub_name)
                downloaded.append(remote_path)
        else:
            _download_file(url, key, headers, name, name)
            downloaded.append(name)

    return downloaded


def _download_file(url, key, headers, remote_path, filename):
    dl_url = f"{url}/storage/v1/object/{BUCKET}/{remote_path}"
    req = urllib.request.Request(dl_url, headers=headers)
    local_path = INBOX_DIR / filename
    print(f"  다운로드: {remote_path} → {local_path}")
    with urllib.request.urlopen(req) as resp:
        local_path.write_bytes(resp.read())


def move_to_processed(url: str, key: str, paths: list[str]):
    """처리 완료 파일을 processed/ 폴더로 이동"""
    if not paths:
        return
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    for path in paths:
        filename = path.split("/")[-1]
        dest = f"{PROCESSED_PREFIX}/{filename}"
        move_url = f"{url}/storage/v1/object/move"
        body = json.dumps({
            "bucketId": BUCKET,
            "sourceKey": path,
            "destinationKey": dest,
        }).encode()
        req = urllib.request.Request(move_url, data=body, headers=headers, method="POST")
        try:
            urllib.request.urlopen(req)
            print(f"  이동: {path} → {dest}")
        except urllib.error.HTTPError as e:
            print(f"  경고: {path} 이동 실패 — {e}")


def main():
    url, key = get_env()
    INBOX_DIR.mkdir(exist_ok=True)

    print(f"[download_uploads] Supabase Storage '{BUCKET}' 버킷에서 파일 다운로드 시작...")

    if HAS_SUPABASE_PY:
        downloaded = download_with_sdk(url, key)
    else:
        downloaded = download_with_http(url, key)

    if not downloaded:
        print("[download_uploads] 신규 파일 없음.")
        return

    print(f"[download_uploads] {len(downloaded)}개 파일 다운로드 완료.")

    # 처리 완료 파일 이동
    move_to_processed(url, key, downloaded)
    print("[download_uploads] 완료.")


if __name__ == "__main__":
    main()
