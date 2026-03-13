"""
Promote uploaded raw contract rows into core fact tables.

Usage:
  python scripts/promote_raw_uploads.py
  python scripts/promote_raw_uploads.py --batch-id 1234567890

Environment:
  DATABASE_URL
"""
from __future__ import annotations

import argparse
import os
import sys

import psycopg2
from psycopg2.extras import execute_values


SENTINEL_NONE = "__NONE__"

PROMOTIONS = [
    {
        "name": "inventory_snapshot",
        "raw_table": "raw.upload_inventory_snapshot",
        "core_table": "core.fact_inventory_snapshot",
        "columns": [
            "snapshot_date",
            "warehouse_id",
            "item_id",
            "lot_id",
            "onhand_qty",
            "expiry_date",
            "qc_status",
            "hold_flag",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                snapshot_date,
                warehouse_id,
                item_id,
                COALESCE(NULLIF(lot_id, ''), %s) AS lot_id,
                onhand_qty,
                expiry_date,
                qc_status,
                hold_flag,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_inventory_snapshot
            {where_clause}
        """,
        "select_params": [SENTINEL_NONE],
        "conflict": "(snapshot_date, warehouse_id, item_id, lot_id)",
        "update_assignments": """
            onhand_qty = EXCLUDED.onhand_qty,
            expiry_date = EXCLUDED.expiry_date,
            qc_status = EXCLUDED.qc_status,
            hold_flag = EXCLUDED.hold_flag,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "purchase_order",
        "raw_table": "raw.upload_purchase_order",
        "core_table": "core.fact_po",
        "columns": [
            "po_id",
            "po_date",
            "supplier_id",
            "item_id",
            "qty_ordered",
            "eta_date",
            "incoterms",
            "currency",
            "unit_price",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                po_id,
                po_date,
                supplier_id,
                item_id,
                qty_ordered,
                eta_date,
                incoterms,
                currency,
                unit_price,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_purchase_order
            {where_clause}
        """,
        "select_params": [],
        "conflict": "(po_id, item_id)",
        "update_assignments": """
            po_date = EXCLUDED.po_date,
            supplier_id = EXCLUDED.supplier_id,
            qty_ordered = EXCLUDED.qty_ordered,
            eta_date = EXCLUDED.eta_date,
            incoterms = EXCLUDED.incoterms,
            currency = EXCLUDED.currency,
            unit_price = EXCLUDED.unit_price,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "receipt",
        "raw_table": "raw.upload_receipt",
        "core_table": "core.fact_receipt",
        "columns": [
            "receipt_id",
            "receipt_date",
            "warehouse_id",
            "item_id",
            "qty_received",
            "po_id",
            "lot_id",
            "expiry_date",
            "mfg_date",
            "qc_status",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                receipt_id,
                receipt_date,
                warehouse_id,
                item_id,
                qty_received,
                po_id,
                NULLIF(lot_id, '') AS lot_id,
                expiry_date,
                mfg_date,
                qc_status,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_receipt
            {where_clause}
        """,
        "select_params": [],
        "conflict": "(receipt_id, item_id)",
        "update_assignments": """
            receipt_date = EXCLUDED.receipt_date,
            warehouse_id = EXCLUDED.warehouse_id,
            qty_received = EXCLUDED.qty_received,
            po_id = EXCLUDED.po_id,
            lot_id = EXCLUDED.lot_id,
            expiry_date = EXCLUDED.expiry_date,
            mfg_date = EXCLUDED.mfg_date,
            qc_status = EXCLUDED.qc_status,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "shipment",
        "raw_table": "raw.upload_shipment",
        "core_table": "core.fact_shipment",
        "columns": [
            "shipment_id",
            "ship_date",
            "warehouse_id",
            "item_id",
            "qty_shipped",
            "lot_id",
            "weight",
            "volume_cbm",
            "channel_order_id",
            "channel_store_id",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                shipment_id,
                ship_date,
                warehouse_id,
                item_id,
                qty_shipped,
                COALESCE(NULLIF(lot_id, ''), %s) AS lot_id,
                weight,
                volume_cbm,
                channel_order_id,
                channel_store_id,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_shipment
            {where_clause}
        """,
        "select_params": [SENTINEL_NONE],
        "conflict": "(shipment_id, item_id, lot_id)",
        "update_assignments": """
            ship_date = EXCLUDED.ship_date,
            warehouse_id = EXCLUDED.warehouse_id,
            qty_shipped = EXCLUDED.qty_shipped,
            weight = EXCLUDED.weight,
            volume_cbm = EXCLUDED.volume_cbm,
            channel_order_id = EXCLUDED.channel_order_id,
            channel_store_id = EXCLUDED.channel_store_id,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "return",
        "raw_table": "raw.upload_return",
        "core_table": "core.fact_return",
        "columns": [
            "return_id",
            "return_date",
            "warehouse_id",
            "item_id",
            "qty_returned",
            "lot_id",
            "channel_order_id",
            "reason",
            "disposition",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                return_id,
                return_date,
                warehouse_id,
                item_id,
                qty_returned,
                COALESCE(NULLIF(lot_id, ''), %s) AS lot_id,
                channel_order_id,
                reason,
                disposition,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_return
            {where_clause}
        """,
        "select_params": [SENTINEL_NONE],
        "conflict": "(return_id, item_id, lot_id)",
        "update_assignments": """
            return_date = EXCLUDED.return_date,
            warehouse_id = EXCLUDED.warehouse_id,
            qty_returned = EXCLUDED.qty_returned,
            channel_order_id = EXCLUDED.channel_order_id,
            reason = EXCLUDED.reason,
            disposition = EXCLUDED.disposition,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "sales",
        "raw_table": "raw.upload_sales",
        "core_table": "core.fact_settlement",
        "columns": [
            "settlement_id",
            "line_no",
            "period",
            "channel_store_id",
            "currency",
            "item_id",
            "gross_sales",
            "discounts",
            "fees",
            "refunds",
            "net_payout",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                settlement_id,
                line_no,
                period,
                channel_store_id,
                currency,
                item_id,
                gross_sales,
                discounts,
                fees,
                refunds,
                net_payout,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_sales
            {where_clause}
        """,
        "select_params": [],
        "conflict": "(settlement_id, line_no)",
        "update_assignments": """
            period = EXCLUDED.period,
            channel_store_id = EXCLUDED.channel_store_id,
            currency = EXCLUDED.currency,
            item_id = EXCLUDED.item_id,
            gross_sales = EXCLUDED.gross_sales,
            discounts = EXCLUDED.discounts,
            fees = EXCLUDED.fees,
            refunds = EXCLUDED.refunds,
            net_payout = EXCLUDED.net_payout,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
    {
        "name": "charge",
        "raw_table": "raw.upload_charge",
        "core_table": "core.fact_charge_actual",
        "columns": [
            "invoice_no",
            "invoice_line_no",
            "charge_type",
            "amount",
            "currency",
            "period",
            "invoice_date",
            "vendor_partner_id",
            "charge_basis",
            "reference_type",
            "reference_id",
            "channel_store_id",
            "warehouse_id",
            "country",
            "source_system",
            "load_batch_id",
            "source_file_hash",
            "source_pk",
        ],
        "select_sql": """
            SELECT
                invoice_no,
                invoice_line_no,
                charge_type,
                amount,
                currency,
                period,
                invoice_date,
                vendor_partner_id,
                charge_basis,
                reference_type,
                reference_id,
                channel_store_id,
                warehouse_id,
                country,
                COALESCE(source_system, 'upload') AS source_system,
                batch_id AS load_batch_id,
                md5(source_file_name) AS source_file_hash,
                raw_id::text AS source_pk
            FROM raw.upload_charge
            {where_clause}
        """,
        "select_params": [],
        "conflict": "(invoice_no, invoice_line_no, charge_type)",
        "update_assignments": """
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            period = EXCLUDED.period,
            invoice_date = EXCLUDED.invoice_date,
            vendor_partner_id = EXCLUDED.vendor_partner_id,
            charge_basis = EXCLUDED.charge_basis,
            reference_type = EXCLUDED.reference_type,
            reference_id = EXCLUDED.reference_id,
            channel_store_id = EXCLUDED.channel_store_id,
            warehouse_id = EXCLUDED.warehouse_id,
            country = EXCLUDED.country,
            source_system = EXCLUDED.source_system,
            load_batch_id = EXCLUDED.load_batch_id,
            source_file_hash = EXCLUDED.source_file_hash,
            source_pk = EXCLUDED.source_pk,
            loaded_at = NOW()
        """,
    },
]


def fetch_rows(cur, promotion: dict, batch_id: int | None) -> list[tuple]:
    where_clause = ""
    params = list(promotion["select_params"])
    if batch_id is not None:
        where_clause = "WHERE batch_id = %s"
        params.append(batch_id)

    sql = promotion["select_sql"].format(where_clause=where_clause)
    cur.execute(sql, params)
    return cur.fetchall()


def upsert_rows(cur, promotion: dict, rows: list[tuple]) -> int:
    if not rows:
        return 0

    columns_sql = ", ".join(promotion["columns"])
    template = "(" + ", ".join(["%s"] * len(promotion["columns"])) + ")"
    sql = f"""
        INSERT INTO {promotion["core_table"]} ({columns_sql})
        VALUES %s
        ON CONFLICT {promotion["conflict"]} DO UPDATE
        SET {promotion["update_assignments"]}
    """
    execute_values(cur, sql, rows, template=template, page_size=500)
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Promote raw upload tables into core facts")
    parser.add_argument("--batch-id", type=int, help="Only promote a specific upload batch_id")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn:
        print("[promote_raw_uploads] DATABASE_URL is required.")
        return 1

    with psycopg2.connect(dsn) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            try:
                total = 0
                for promotion in PROMOTIONS:
                    rows = fetch_rows(cur, promotion, args.batch_id)
                    promoted = upsert_rows(cur, promotion, rows)
                    total += promoted
                    print(f"[promote_raw_uploads] {promotion['name']}: {promoted} row(s)")
                conn.commit()
                print(f"[promote_raw_uploads] complete: {total} row(s) promoted")
                return 0
            except Exception as exc:
                conn.rollback()
                print("[promote_raw_uploads] failed")
                print(exc)
                return 1


if __name__ == "__main__":
    sys.exit(main())
