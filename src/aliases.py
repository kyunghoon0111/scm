"""Column alias mapping -- config + DB (ops.column_mappings).

All column name variants are defined in config/column_aliases.yaml.
DB mappings (ops.column_mappings) override yaml when available.
This module builds reverse lookups and applies them to DataFrames.
"""
import logging
import os
from typing import Any

import polars as pl
from src.config import AppConfig

logger = logging.getLogger(__name__)

# DB 매핑 캐시 (세션 내 1회만 조회)
_db_mappings_cache: list[dict[str, Any]] | None = None


def _load_db_mappings() -> list[dict[str, Any]]:
    """Load column mappings from ops.column_mappings via Supabase REST or psycopg2."""
    global _db_mappings_cache
    if _db_mappings_cache is not None:
        return _db_mappings_cache

    _db_mappings_cache = []

    # Try Supabase REST API first
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if supabase_url and supabase_key:
        try:
            import urllib.request
            import json
            url = f"{supabase_url}/rest/v1/column_mappings?select=source_name,canonical_name,table_name"
            req = urllib.request.Request(url, headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
            })
            with urllib.request.urlopen(req, timeout=5) as resp:
                _db_mappings_cache = json.loads(resp.read())
            logger.info(f"Loaded {len(_db_mappings_cache)} column mappings from DB")
            return _db_mappings_cache
        except Exception as e:
            logger.debug(f"Could not load DB column mappings via REST: {e}")

    # Fallback: psycopg2 direct
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("SELECT source_name, canonical_name, table_name FROM ops.column_mappings")
            rows = cur.fetchall()
            _db_mappings_cache = [
                {"source_name": r[0], "canonical_name": r[1], "table_name": r[2]}
                for r in rows
            ]
            cur.close()
            conn.close()
            logger.info(f"Loaded {len(_db_mappings_cache)} column mappings from DB (psycopg2)")
            return _db_mappings_cache
        except Exception as e:
            logger.debug(f"Could not load DB column mappings via psycopg2: {e}")

    return _db_mappings_cache


def build_alias_map(config: AppConfig, table_name: str) -> dict[str, str]:
    """Build {lowercased_alias -> canonical_name} for a given table.

    Applies common aliases first, then table-specific aliases,
    then DB mappings (override on conflict — DB wins).
    """
    result: dict[str, str] = {}

    # Apply common aliases
    common = config.aliases.get("common", {})
    for canonical, variants in common.items():
        for v in variants:
            result[v.lower().strip()] = canonical

    # Apply table-specific aliases (override common if conflict)
    table_aliases = config.aliases.get(table_name, {})
    for canonical, variants in table_aliases.items():
        for v in variants:
            result[v.lower().strip()] = canonical

    # Apply DB mappings (override yaml — DB wins)
    db_mappings = _load_db_mappings()
    for m in db_mappings:
        tbl = m.get("table_name")
        if tbl is None or tbl == table_name:
            result[m["source_name"].lower().strip()] = m["canonical_name"]

    return result


def apply_aliases(df: pl.DataFrame, table_name: str, config: AppConfig) -> pl.DataFrame:
    """Rename DataFrame columns using alias mapping from config.

    Returns a new DataFrame with canonical column names.
    Unknown columns are kept as-is (they will be filtered later by schema validation).
    """
    alias_map = build_alias_map(config, table_name)
    rename_map: dict[str, str] = {}

    for col in df.columns:
        canonical = alias_map.get(col.lower().strip())
        if canonical and canonical != col:
            rename_map[col] = canonical

    if rename_map:
        df = df.rename(rename_map)

    return df
