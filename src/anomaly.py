"""Anomaly detection: moving average ± 2σ on daily metrics.

Scans mart tables for anomalous values and writes results to
mart.mart_anomaly_signals.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import duckdb
import polars as pl

from src.config import AppConfig

logger = logging.getLogger(__name__)

# Minimum data points required for meaningful statistics
MIN_DATA_POINTS = 7
# Rolling window size for moving average / std
WINDOW_SIZE = 14
# Number of standard deviations to flag as anomaly
SIGMA_THRESHOLD = 2.0

# Severity thresholds (multiples of σ)
SEVERITY_LEVELS = [
    (3.0, "CRITICAL"),
    (2.5, "HIGH"),
    (2.0, "MEDIUM"),
]


def _safe_query(con: duckdb.DuckDBPyConnection, sql: str) -> pl.DataFrame:
    try:
        return con.execute(sql).pl()
    except Exception as exc:
        logger.warning("Query failed (%s): %s", exc, sql[:120])
        return pl.DataFrame()


def _classify_severity(deviation: float) -> str:
    abs_dev = abs(deviation)
    for threshold, level in SEVERITY_LEVELS:
        if abs_dev >= threshold:
            return level
    return "LOW"


def _detect_on_timeseries(
    df: pl.DataFrame,
    date_col: str,
    value_col: str,
    entity_cols: list[str],
    metric_name: str,
    entity_type: str,
) -> pl.DataFrame:
    """Run moving-average ± 2σ detection on a time-series DataFrame.

    Returns a DataFrame with columns matching mart_anomaly_signals.
    """
    if df.height < MIN_DATA_POINTS:
        return pl.DataFrame()

    # Sort by entity + date
    sort_cols = entity_cols + [date_col]
    df = df.sort(sort_cols)

    # Compute rolling mean and std per entity group
    df = df.with_columns([
        pl.col(value_col).cast(pl.Float64).alias("_value"),
    ])

    df = df.with_columns([
        pl.col("_value")
        .rolling_mean(window_size=WINDOW_SIZE, min_periods=MIN_DATA_POINTS)
        .over(entity_cols)
        .alias("_rolling_mean"),
        pl.col("_value")
        .rolling_std(window_size=WINDOW_SIZE, min_periods=MIN_DATA_POINTS)
        .over(entity_cols)
        .alias("_rolling_std"),
    ])

    # Filter to rows where we have valid stats
    df = df.filter(
        pl.col("_rolling_mean").is_not_null()
        & pl.col("_rolling_std").is_not_null()
        & (pl.col("_rolling_std") > 0)
    )

    if df.height == 0:
        return pl.DataFrame()

    # Compute deviation in units of σ
    df = df.with_columns([
        ((pl.col("_value") - pl.col("_rolling_mean")) / pl.col("_rolling_std"))
        .alias("_deviation"),
    ])

    # Filter anomalies (|deviation| >= threshold)
    anomalies = df.filter(pl.col("_deviation").abs() >= SIGMA_THRESHOLD)

    if anomalies.height == 0:
        return pl.DataFrame()

    # Build entity_id from entity columns
    if len(entity_cols) == 1:
        entity_id_expr = pl.col(entity_cols[0]).cast(pl.Utf8)
    else:
        entity_id_expr = pl.concat_str(
            [pl.col(c).cast(pl.Utf8) for c in entity_cols], separator=":"
        )

    # Derive period from date column (YYYY-MM)
    period_expr = pl.col(date_col).cast(pl.Utf8).str.slice(0, 7)

    now_str = datetime.now(timezone.utc).isoformat()

    result = anomalies.select([
        pl.lit(metric_name).alias("metric_name"),
        pl.lit(entity_type).alias("entity_type"),
        entity_id_expr.alias("entity_id"),
        period_expr.alias("period"),
        pl.col("_value").alias("current_value"),
        pl.col("_rolling_mean").alias("expected_value"),
        pl.col("_deviation").alias("deviation"),
        pl.lit(now_str).alias("detected_at"),
    ])

    # Add severity
    result = result.with_columns([
        pl.col("deviation")
        .map_elements(lambda d: _classify_severity(d), return_dtype=pl.Utf8)
        .alias("severity"),
    ])

    return result


# ---------------------------------------------------------------------------
# Metric-specific detectors
# ---------------------------------------------------------------------------

def _detect_shipment_anomalies(con: duckdb.DuckDBPyConnection) -> pl.DataFrame:
    """Detect anomalies in daily shipment quantities."""
    df = _safe_query(con, """
        SELECT ship_date, warehouse_id, qty_shipped
        FROM mart.mart_shipment_daily
        ORDER BY ship_date
    """)
    return _detect_on_timeseries(
        df,
        date_col="ship_date",
        value_col="qty_shipped",
        entity_cols=["warehouse_id"],
        metric_name="daily_shipment_qty",
        entity_type="warehouse",
    )


def _detect_return_anomalies(con: duckdb.DuckDBPyConnection) -> pl.DataFrame:
    """Detect anomalies in daily return quantities."""
    df = _safe_query(con, """
        SELECT return_date, warehouse_id, qty_returned
        FROM mart.mart_return_daily
        ORDER BY return_date
    """)
    return _detect_on_timeseries(
        df,
        date_col="return_date",
        value_col="qty_returned",
        entity_cols=["warehouse_id"],
        metric_name="daily_return_qty",
        entity_type="warehouse",
    )


def _detect_inventory_anomalies(con: duckdb.DuckDBPyConnection) -> pl.DataFrame:
    """Detect anomalies in inventory levels (abnormal decreases)."""
    df = _safe_query(con, """
        SELECT snapshot_date, item_id, warehouse_id,
               COALESCE(onhand_qty, 0) AS onhand_qty
        FROM mart.mart_inventory_onhand
        ORDER BY snapshot_date
    """)
    return _detect_on_timeseries(
        df,
        date_col="snapshot_date",
        value_col="onhand_qty",
        entity_cols=["item_id", "warehouse_id"],
        metric_name="inventory_level",
        entity_type="item:warehouse",
    )


def _detect_revenue_anomalies(con: duckdb.DuckDBPyConnection) -> pl.DataFrame:
    """Detect anomalies in channel revenue (sales drops)."""
    df = _safe_query(con, """
        SELECT period, channel_store_id,
               COALESCE(net_revenue, 0) AS net_revenue
        FROM mart.mart_pnl_revenue
    """)
    if df.height == 0:
        return pl.DataFrame()

    # Revenue is period-level; use period as date proxy
    return _detect_on_timeseries(
        df,
        date_col="period",
        value_col="net_revenue",
        entity_cols=["channel_store_id"],
        metric_name="channel_revenue",
        entity_type="channel",
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

_DETECTORS = [
    ("daily_shipment", _detect_shipment_anomalies),
    ("daily_return", _detect_return_anomalies),
    ("inventory_level", _detect_inventory_anomalies),
    ("channel_revenue", _detect_revenue_anomalies),
]


def detect_all_anomalies(
    con: duckdb.DuckDBPyConnection,
    config: AppConfig,
) -> int:
    """Run all anomaly detectors and write results to mart.mart_anomaly_signals.

    Returns the total number of anomalies detected.
    """
    all_signals: list[pl.DataFrame] = []

    for name, detector in _DETECTORS:
        logger.info("Running anomaly detector: %s", name)
        try:
            signals = detector(con)
            if signals.height > 0:
                all_signals.append(signals)
                logger.info("  -> %s: %d anomalies", name, signals.height)
            else:
                logger.info("  -> %s: no anomalies", name)
        except Exception as exc:
            logger.error("Anomaly detector %s failed: %s", name, exc, exc_info=True)

    # Clear old signals and write new ones
    con.execute("DELETE FROM mart.mart_anomaly_signals")

    if not all_signals:
        logger.info("No anomalies detected across all metrics.")
        return 0

    combined = pl.concat(all_signals)

    # Ensure column order matches table
    combined = combined.select([
        "metric_name", "entity_type", "entity_id", "period",
        "current_value", "expected_value", "deviation", "severity",
        "detected_at",
    ])

    arrow = combined.to_arrow()
    con.register("_stg_anomaly", arrow)
    con.execute("""
        INSERT INTO mart.mart_anomaly_signals
            (metric_name, entity_type, entity_id, period,
             current_value, expected_value, deviation, severity, detected_at)
        SELECT * FROM _stg_anomaly
    """)
    con.unregister("_stg_anomaly")

    total = combined.height
    logger.info("Total anomalies detected: %d", total)
    return total
