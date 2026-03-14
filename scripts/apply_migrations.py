"""
Apply project SQL migrations to PostgreSQL / Supabase in order.

Usage:
  python scripts/apply_migrations.py

Environment:
  DATABASE_URL
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2


MIGRATIONS = [
    "migrations/01_create_schemas.sql",
    "migrations/02_core_dimensions.sql",
    "migrations/03_core_facts.sql",
    "migrations/04_mart_tables.sql",
    "migrations/05_ops_tables.sql",
    "migrations/06_indexes.sql",
    "migrations/07_rls_policies.sql",
    "migrations/08_ml_schema.sql",
    "migrations/09_settings_tables.sql",
    "migrations/10_views.sql",
    "migrations/11_upload_contracts.sql",
    "migrations/12_backend_job_log.sql",
    "migrations/13_phase2_upload_contracts.sql",
    "migrations/14_public_mart_access.sql",
    "migrations/15_public_settings_read.sql",
]


def main() -> int:
    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn:
        print("[apply_migrations] DATABASE_URL is required.")
        return 1

    repo_root = Path(__file__).resolve().parents[1]

    with psycopg2.connect(dsn) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            for rel_path in MIGRATIONS:
                path = repo_root / rel_path
                sql = path.read_text(encoding="utf-8")
                print(f"[apply_migrations] running {rel_path}")
                try:
                    cur.execute(sql)
                    conn.commit()
                except Exception as exc:
                    conn.rollback()
                    print(f"[apply_migrations] failed: {rel_path}")
                    print(exc)
                    return 1

    print("[apply_migrations] complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
