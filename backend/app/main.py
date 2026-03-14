from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2 import extras, sql
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


REPO_ROOT = Path(__file__).resolve().parents[2]

UPLOAD_TABLE_COLUMNS: dict[str, set[str]] = {
    "upload_inventory_snapshot": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "snapshot_date",
        "warehouse_id",
        "item_id",
        "lot_id",
        "onhand_qty",
        "sellable_qty",
        "blocked_qty",
        "expiry_date",
        "mfg_date",
        "qc_status",
        "hold_flag",
        "owner_id",
        "inventory_status",
        "channel_store_id",
        "reserved_qty",
        "damaged_qty",
        "in_transit_qty",
        "safety_stock_qty",
        "unit_cost",
        "country",
        "source_updated_at",
        "source_system",
    },
    "upload_purchase_order": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "po_id",
        "po_date",
        "supplier_id",
        "item_id",
        "qty_ordered",
        "po_line_id",
        "warehouse_id",
        "eta_date",
        "unit_price",
        "currency",
        "incoterms",
        "country",
        "expected_lead_time_days",
        "order_status",
        "buyer_id",
        "moq_qty",
        "pack_size",
        "tax_amount",
        "source_updated_at",
        "source_system",
    },
    "upload_receipt": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "receipt_id",
        "receipt_date",
        "warehouse_id",
        "item_id",
        "qty_received",
        "receipt_line_id",
        "po_id",
        "po_line_id",
        "lot_id",
        "expiry_date",
        "mfg_date",
        "qc_status",
        "putaway_completed_at",
        "inspection_result",
        "damaged_qty",
        "short_received_qty",
        "excess_received_qty",
        "carrier_id",
        "dock_id",
        "source_updated_at",
        "source_system",
    },
    "upload_shipment": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "shipment_id",
        "ship_date",
        "warehouse_id",
        "item_id",
        "qty_shipped",
        "shipment_line_id",
        "lot_id",
        "weight",
        "volume_cbm",
        "channel_order_id",
        "channel_store_id",
        "order_id",
        "order_line_id",
        "country",
        "carrier_id",
        "tracking_no",
        "shipping_fee",
        "promised_ship_date",
        "delivered_at",
        "source_updated_at",
        "source_system",
    },
    "upload_return": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "return_id",
        "return_date",
        "warehouse_id",
        "item_id",
        "qty_returned",
        "return_line_id",
        "lot_id",
        "channel_order_id",
        "channel_store_id",
        "order_id",
        "order_line_id",
        "reason",
        "disposition",
        "refund_amount",
        "return_shipping_fee",
        "return_reason_code",
        "return_quality_grade",
        "resellable_flag",
        "source_updated_at",
        "source_system",
    },
    "upload_sales": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "settlement_id",
        "line_no",
        "period",
        "channel_store_id",
        "item_id",
        "order_id",
        "order_line_id",
        "order_date",
        "ship_date",
        "country",
        "currency",
        "gross_sales",
        "quantity_sold",
        "unit_selling_price",
        "discounts",
        "fees",
        "refunds",
        "net_payout",
        "tax_amount",
        "promo_cost",
        "platform_fee",
        "payment_fee",
        "coupon_amount",
        "sales_channel_group",
        "source_updated_at",
        "source_system",
    },
    "upload_charge": {
        "batch_id",
        "source_file_name",
        "source_row_no",
        "invoice_no",
        "invoice_line_no",
        "charge_type",
        "amount",
        "currency",
        "period",
        "invoice_date",
        "vendor_partner_id",
        "supplier_id",
        "charge_basis",
        "reference_type",
        "reference_id",
        "charge_category",
        "cost_center",
        "channel_store_id",
        "item_id",
        "warehouse_id",
        "country",
        "allocation_key",
        "allocation_basis_value",
        "tax_amount",
        "invoice_status",
        "reference_period",
        "accrual_flag",
        "source_updated_at",
        "source_system",
    },
}


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


def run_command(command: list[str], *, timeout_seconds: int) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_seconds,
        )
        return {
            "command": " ".join(command),
            "returncode": completed.returncode,
            "stdout": completed.stdout[-4000:],
            "stderr": completed.stderr[-4000:],
            "timed_out": False,
        }
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        return {
            "command": " ".join(command),
            "returncode": -1,
            "stdout": stdout[-4000:],
            "stderr": stderr[-4000:] or f"Command timed out after {timeout_seconds} seconds.",
            "timed_out": True,
        }


def _normalize_hash_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _normalize_hash_value(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_normalize_hash_value(item) for item in value]
    if isinstance(value, float):
        return round(value, 6)
    return value


def build_upload_hash(table_name: str, rows: list[dict[str, Any]], ordered_columns: list[str]) -> str:
    comparable_rows = []
    ignored_columns = {"batch_id", "source_file_name", "source_row_no"}

    for row in rows:
        comparable_rows.append(
            {
                column: _normalize_hash_value(row.get(column))
                for column in ordered_columns
                if column not in ignored_columns
            }
        )

    payload = {"table_name": table_name, "rows": comparable_rows}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def find_existing_upload(file_hash: str, table_name: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT batch_id, file_name, row_count, status, processed_at
                FROM raw.system_file_log
                WHERE file_hash = %s
                  AND table_name = %s
                  AND status IN ('success', 'duplicate')
                ORDER BY processed_at DESC
                LIMIT 1
                """,
                [file_hash, table_name],
            )
            row = cur.fetchone()
            if row is None:
                return None
            return {
                "batch_id": row[0],
                "file_name": row[1],
                "row_count": row[2],
                "status": row[3],
                "processed_at": row[4].isoformat() if row[4] else None,
            }


def log_upload_file(
    *,
    batch_id: int,
    file_name: str,
    file_hash: str,
    table_name: str,
    row_count: int,
    status: str,
    error_msg: str | None = None,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO raw.system_file_log
                  (batch_id, file_name, file_hash, table_name, row_count, status, error_msg, processed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                [batch_id, file_name, file_hash, table_name, row_count, status, error_msg],
            )
            conn.commit()


def insert_upload_rows(table_name: str, file_name: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    allowed_columns = UPLOAD_TABLE_COLUMNS.get(table_name)
    if allowed_columns is None:
        raise ValueError(f"Unsupported upload table: {table_name}")
    if not rows:
        return {"inserted_count": 0, "skipped_count": 0, "duplicate": False, "file_hash": None}

    sanitized_rows: list[dict[str, Any]] = []
    ordered_columns: list[str] = []

    for row in rows:
        sanitized = {key: value for key, value in row.items() if key in allowed_columns}
        if not sanitized:
            continue
        sanitized_rows.append(sanitized)
        for key in sanitized:
            if key not in ordered_columns:
                ordered_columns.append(key)

    if not sanitized_rows or not ordered_columns:
        return {"inserted_count": 0, "skipped_count": 0, "duplicate": False, "file_hash": None}

    batch_id = next(
        (
            int(row["batch_id"])
            for row in sanitized_rows
            if row.get("batch_id") is not None
        ),
        int(datetime.now(timezone.utc).timestamp()),
    )
    file_hash = build_upload_hash(table_name, sanitized_rows, ordered_columns)
    existing = find_existing_upload(file_hash, table_name)
    if existing is not None:
        log_upload_file(
            batch_id=batch_id,
            file_name=file_name,
            file_hash=file_hash,
            table_name=table_name,
            row_count=len(sanitized_rows),
            status="duplicate",
            error_msg=f"Duplicate upload skipped. Existing batch_id={existing['batch_id']}",
        )
        return {
            "inserted_count": 0,
            "skipped_count": len(sanitized_rows),
            "duplicate": True,
            "file_hash": file_hash,
            "existing_batch_id": existing["batch_id"],
        }

    values = [[row.get(column) for column in ordered_columns] for row in sanitized_rows]

    query = sql.SQL("INSERT INTO raw.{table} ({columns}) VALUES %s").format(
        table=sql.Identifier(table_name),
        columns=sql.SQL(", ").join(sql.Identifier(column) for column in ordered_columns),
    )

    with get_connection() as conn:
        with conn.cursor() as cur:
            extras.execute_values(cur, query, values, page_size=500)
            conn.commit()
    log_upload_file(
        batch_id=batch_id,
        file_name=file_name,
        file_hash=file_hash,
        table_name=table_name,
        row_count=len(sanitized_rows),
        status="success",
    )
    return {
        "inserted_count": len(sanitized_rows),
        "skipped_count": 0,
        "duplicate": False,
        "file_hash": file_hash,
    }


def execute_finalize_job(job_id: str) -> None:
    write_job(job_id, status="running")
    steps: list[dict[str, Any]] = []
    try:
        write_job(
            job_id,
            status="running",
            detail={"current_step": "promote_raw_uploads", "steps": steps, "started_at": utc_now().isoformat()},
        )
        promote_result = run_command([sys.executable, "scripts/promote_raw_uploads.py"], timeout_seconds=300)
        steps.append({"name": "promote_raw_uploads", **promote_result})
        if promote_result["returncode"] != 0:
            raise RuntimeError(promote_result["stderr"] or promote_result["stdout"] or "promote_raw_uploads failed")

        write_job(
            job_id,
            status="running",
            detail={"current_step": "run_pipeline", "steps": steps, "started_at": utc_now().isoformat()},
        )
        pipeline_result = run_command([sys.executable, "run.py", "--once"], timeout_seconds=600)
        steps.append({"name": "run_pipeline", **pipeline_result})
        if pipeline_result["returncode"] != 0:
            raise RuntimeError(pipeline_result["stderr"] or pipeline_result["stdout"] or "run.py --once failed")

        write_job(
            job_id,
            status="success",
            detail={"current_step": None, "steps": steps, "completed_at": utc_now().isoformat()},
            finished=True,
        )
    except Exception as exc:
        write_job(
            job_id,
            status="failed",
            detail={"current_step": None, "steps": steps, "failed_at": utc_now().isoformat()},
            error_msg=str(exc),
            finished=True,
        )


def read_pipeline_lock() -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT lock_id, locked, pid, started_at
                FROM raw.system_batch_lock
                WHERE lock_id = 1
                """
            )
            row = cur.fetchone()
            if row is None:
                return {"lock_id": 1, "locked": False, "pid": None, "started_at": None}
            return {
                "lock_id": row[0],
                "locked": bool(row[1]),
                "pid": row[2],
                "started_at": row[3].isoformat() if row[3] else None,
            }


def unlock_pipeline() -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE raw.system_batch_lock
                SET locked = false,
                    pid = NULL,
                    started_at = NULL
                WHERE lock_id = 1
                """
            )
            conn.commit()
    return read_pipeline_lock()


def rollback_recent_batches(batch_count: int) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT public.rollback_batches(%s)::text", [batch_count])
            row = cur.fetchone()
            conn.commit()

    payload = row[0] if row and row[0] else "{}"
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return {"success": False, "message": payload}


class FinalizeJobRequest(BaseModel):
    trigger_source: str = "frontend"


class UploadBatchItem(BaseModel):
    table_name: str
    file_name: str
    rows: list[dict[str, Any]]


class UploadBatchRequest(BaseModel):
    items: list[UploadBatchItem]


class RollbackBatchRequest(BaseModel):
    batch_count: int = 1


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


@app.post("/api/uploads/raw")
def upload_raw_batches(payload: UploadBatchRequest):
    results: list[dict[str, Any]] = []

    for item in payload.items:
        try:
            upload_result = insert_upload_rows(item.table_name, item.file_name, item.rows)
            results.append(
                {
                    "table_name": item.table_name,
                    "file_name": item.file_name,
                    "inserted_count": upload_result["inserted_count"],
                    "skipped_count": upload_result["skipped_count"],
                    "duplicate": upload_result["duplicate"],
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "table_name": item.table_name,
                    "file_name": item.file_name,
                    "inserted_count": 0,
                    "skipped_count": len(item.rows),
                    "duplicate": False,
                    "error": str(exc),
                }
            )

    return {"items": results}


@app.get("/api/ops/pipeline-lock")
def get_pipeline_lock():
    return read_pipeline_lock()


@app.post("/api/ops/pipeline-lock/unlock")
def post_unlock_pipeline():
    return {"success": True, "lock": unlock_pipeline()}


@app.post("/api/ops/rollback")
def post_rollback_batches(payload: RollbackBatchRequest):
    batch_count = max(1, min(payload.batch_count, 10))
    return rollback_recent_batches(batch_count)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = read_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/jobs")
def get_recent_jobs(limit: int = 10):
    return {"items": list_recent_jobs(limit)}
