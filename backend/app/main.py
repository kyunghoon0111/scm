from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg2
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


REPO_ROOT = Path(__file__).resolve().parents[2]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_database_url() -> str:
    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn:
        raise RuntimeError("DATABASE_URL is required.")
    return dsn


def get_connection():
    return psycopg2.connect(get_database_url())


def ensure_job_table_exists() -> None:
    sql = """
        CREATE TABLE IF NOT EXISTS ops.backend_job_log (
            job_id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL,
            status TEXT NOT NULL,
            trigger_source TEXT,
            payload_json JSONB,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMP,
            detail_json JSONB,
            error_msg TEXT
        )
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()


def write_job(
    job_id: str,
    *,
    job_type: str | None = None,
    status: str,
    trigger_source: str | None = None,
    payload: dict[str, Any] | None = None,
    detail: dict[str, Any] | None = None,
    error_msg: str | None = None,
    finished: bool = False,
) -> None:
    ensure_job_table_exists()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT job_id FROM ops.backend_job_log WHERE job_id = %s", [job_id])
            exists = cur.fetchone() is not None
            if exists:
                cur.execute(
                    """
                    UPDATE ops.backend_job_log
                    SET status = %s,
                        detail_json = COALESCE(%s::jsonb, detail_json),
                        error_msg = %s,
                        finished_at = CASE WHEN %s THEN NOW() ELSE finished_at END
                    WHERE job_id = %s
                    """,
                    [
                        status,
                        json.dumps(detail) if detail is not None else None,
                        error_msg,
                        finished,
                        job_id,
                    ],
                )
            else:
                cur.execute(
                    """
                    INSERT INTO ops.backend_job_log
                        (job_id, job_type, status, trigger_source, payload_json, detail_json, error_msg)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                    """,
                    [
                        job_id,
                        job_type or "finalize_upload",
                        status,
                        trigger_source,
                        json.dumps(payload or {}),
                        json.dumps(detail or {}),
                        error_msg,
                    ],
                )
            conn.commit()


def read_job(job_id: str) -> dict[str, Any] | None:
    ensure_job_table_exists()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT job_id, job_type, status, trigger_source, payload_json, started_at, finished_at, detail_json, error_msg
                FROM ops.backend_job_log
                WHERE job_id = %s
                """,
                [job_id],
            )
            row = cur.fetchone()
            if row is None:
                return None
            return {
                "job_id": row[0],
                "job_type": row[1],
                "status": row[2],
                "trigger_source": row[3],
                "payload": row[4],
                "started_at": row[5].isoformat() if row[5] else None,
                "finished_at": row[6].isoformat() if row[6] else None,
                "detail": row[7],
                "error_msg": row[8],
            }


def list_recent_jobs(limit: int = 10) -> list[dict[str, Any]]:
    ensure_job_table_exists()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT job_id, job_type, status, trigger_source, started_at, finished_at, error_msg
                FROM ops.backend_job_log
                ORDER BY started_at DESC
                LIMIT %s
                """,
                [limit],
            )
            rows = cur.fetchall()
            return [
                {
                    "job_id": row[0],
                    "job_type": row[1],
                    "status": row[2],
                    "trigger_source": row[3],
                    "started_at": row[4].isoformat() if row[4] else None,
                    "finished_at": row[5].isoformat() if row[5] else None,
                    "error_msg": row[6],
                }
                for row in rows
            ]


def run_command(command: list[str]) -> dict[str, Any]:
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "command": " ".join(command),
        "returncode": completed.returncode,
        "stdout": completed.stdout[-4000:],
        "stderr": completed.stderr[-4000:],
    }


def execute_finalize_job(job_id: str) -> None:
    write_job(job_id, status="running")
    steps: list[dict[str, Any]] = []
    try:
        promote_result = run_command([sys.executable, "scripts/promote_raw_uploads.py"])
        steps.append({"name": "promote_raw_uploads", **promote_result})
        if promote_result["returncode"] != 0:
            raise RuntimeError(promote_result["stderr"] or promote_result["stdout"] or "promote_raw_uploads failed")

        pipeline_result = run_command([sys.executable, "run.py", "--once"])
        steps.append({"name": "run_pipeline", **pipeline_result})
        if pipeline_result["returncode"] != 0:
            raise RuntimeError(pipeline_result["stderr"] or pipeline_result["stdout"] or "run.py --once failed")

        write_job(job_id, status="success", detail={"steps": steps, "completed_at": utc_now().isoformat()}, finished=True)
    except Exception as exc:
        write_job(
            job_id,
            status="failed",
            detail={"steps": steps, "failed_at": utc_now().isoformat()},
            error_msg=str(exc),
            finished=True,
        )


class FinalizeJobRequest(BaseModel):
    trigger_source: str = "frontend"


app = FastAPI(title="SCM Ops Backend", version="0.1.0")

origins = [origin.strip() for origin in os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "service": "scm-ops-backend"}


@app.post("/api/jobs/finalize")
def create_finalize_job(payload: FinalizeJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    write_job(
        job_id,
        job_type="finalize_upload",
        status="queued",
        trigger_source=payload.trigger_source,
        payload=payload.model_dump(),
    )
    background_tasks.add_task(execute_finalize_job, job_id)
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = read_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/jobs")
def get_recent_jobs(limit: int = 10):
    return {"items": list_recent_jobs(limit)}
