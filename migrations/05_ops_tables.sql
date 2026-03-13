-- =============================================================
-- 05_ops_tables.sql
-- Supabase PostgreSQL: OPS 운영 메타데이터 테이블 4개
-- + RAW 시스템 테이블 4개
-- 원본: src/db.py OPS_TABLES + RAW_TABLES (DuckDB)
-- OPS/RAW 데이터는 이력 보존을 위해 마이그레이션 포함
-- =============================================================

-- ================================================================
-- RAW SYSTEM TABLES (4개)
-- ================================================================

-- ----- raw.system_batch_log -----
CREATE TABLE IF NOT EXISTS raw.system_batch_log (
    batch_id       BIGINT PRIMARY KEY,
    started_at     TIMESTAMP NOT NULL,
    finished_at    TIMESTAMP,
    status         TEXT NOT NULL DEFAULT 'running',
    file_count     INTEGER DEFAULT 0,
    rows_ingested  BIGINT DEFAULT 0,
    error_msg      TEXT
);

COMMENT ON TABLE raw.system_batch_log IS '파이프라인 배치 실행 이력';

-- ----- raw.system_file_log -----
CREATE TABLE IF NOT EXISTS raw.system_file_log (
    batch_id       BIGINT NOT NULL,
    file_name      TEXT NOT NULL,
    file_hash      TEXT NOT NULL,
    table_name     TEXT,
    row_count      BIGINT DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'pending',
    error_msg      TEXT,
    processed_at   TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE raw.system_file_log IS '파일 수집 이력. 멱등성 보장: 동일 SHA256 → 스킵';

-- ----- raw.system_dq_report -----
CREATE TABLE IF NOT EXISTS raw.system_dq_report (
    batch_id       BIGINT NOT NULL,
    file_name      TEXT,
    table_name     TEXT,
    check_name     TEXT NOT NULL,
    severity       TEXT NOT NULL,
    passed         BOOLEAN NOT NULL,
    detail         TEXT,
    checked_at     TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE raw.system_dq_report IS 'DQ 검사 결과. CRITICAL/HIGH → 파일 전체 거부';

-- ----- raw.system_batch_lock -----
CREATE TABLE IF NOT EXISTS raw.system_batch_lock (
    lock_id        INTEGER PRIMARY KEY DEFAULT 1,
    locked         BOOLEAN NOT NULL DEFAULT false,
    pid            INTEGER,
    started_at     TIMESTAMP,
    CHECK (lock_id = 1)
);

COMMENT ON TABLE raw.system_batch_lock IS '파이프라인 동시 실행 방지 싱글턴 락';

-- 싱글턴 락 행 시드
INSERT INTO raw.system_batch_lock (lock_id, locked, pid, started_at)
VALUES (1, false, NULL, NULL)
ON CONFLICT (lock_id) DO NOTHING;


-- ================================================================
-- OPS TABLES (4개)
-- ================================================================

-- ----- ops.ops_issue_log -----
CREATE TABLE IF NOT EXISTS ops.ops_issue_log (
    issue_id       TEXT PRIMARY KEY,
    issue_type     TEXT NOT NULL,
    severity       TEXT NOT NULL,
    domain         TEXT,
    entity_type    TEXT,
    entity_id      TEXT,
    period         TEXT,
    detail         TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    resolved_at    TIMESTAMP,
    resolved_by    TEXT,
    action_taken   TEXT
);

COMMENT ON TABLE ops.ops_issue_log IS '운영 이슈 이력. severity: CRITICAL/HIGH/MEDIUM/LOW';

-- ----- ops.ops_period_close -----
CREATE TABLE IF NOT EXISTS ops.ops_period_close (
    period         TEXT PRIMARY KEY,
    closed_at      TIMESTAMP,
    closed_by      TEXT,
    lock_flag      BOOLEAN NOT NULL DEFAULT false,
    notes          TEXT
);

COMMENT ON TABLE ops.ops_period_close IS '기간 마감 이력. status: OPEN/CLOSED/LOCKED';

-- ----- ops.ops_adjustment_log -----
CREATE TABLE IF NOT EXISTS ops.ops_adjustment_log (
    adjustment_id  BIGINT PRIMARY KEY,
    period         TEXT NOT NULL,
    table_name     TEXT NOT NULL,
    business_key   TEXT NOT NULL,
    field_name     TEXT NOT NULL,
    old_value      TEXT,
    new_value      TEXT,
    reason         TEXT,
    adjusted_by    TEXT,
    adjusted_at    TIMESTAMP DEFAULT NOW(),
    batch_id       BIGINT
);

COMMENT ON TABLE ops.ops_adjustment_log IS '수동 조정 이력. 마감 기간 조정만 허용';

-- ----- ops.ops_snapshot -----
CREATE TABLE IF NOT EXISTS ops.ops_snapshot (
    snapshot_id    BIGINT PRIMARY KEY,
    created_at     TIMESTAMP DEFAULT NOW(),
    label          TEXT,
    batch_id       BIGINT
);

COMMENT ON TABLE ops.ops_snapshot IS '기간 마감 전후 스냅샷 이력';
