-- Phase 5 Session 1: Anomaly detection signals
CREATE TABLE IF NOT EXISTS mart.mart_anomaly_signals (
    signal_id SERIAL PRIMARY KEY,
    metric_name VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    period VARCHAR,
    current_value DOUBLE PRECISION,
    expected_value DOUBLE PRECISION,
    deviation DOUBLE PRECISION,
    severity VARCHAR NOT NULL DEFAULT 'LOW',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_signals_severity
    ON mart.mart_anomaly_signals (severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_signals_detected_at
    ON mart.mart_anomaly_signals (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_signals_metric
    ON mart.mart_anomaly_signals (metric_name, entity_type);

-- Grant read access
GRANT SELECT ON mart.mart_anomaly_signals TO anon;
GRANT SELECT ON mart.mart_anomaly_signals TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE mart.mart_anomaly_signals_signal_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE mart.mart_anomaly_signals_signal_id_seq TO authenticated;
