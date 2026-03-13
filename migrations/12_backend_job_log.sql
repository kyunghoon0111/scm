-- =============================================================
-- 12_backend_job_log.sql
-- Backend job execution log for Railway FastAPI
-- =============================================================

CREATE TABLE IF NOT EXISTS ops.backend_job_log (
    job_id         TEXT PRIMARY KEY,
    job_type       TEXT NOT NULL,
    status         TEXT NOT NULL,
    trigger_source TEXT,
    payload_json   JSONB,
    started_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at    TIMESTAMP,
    detail_json    JSONB,
    error_msg      TEXT
);

COMMENT ON TABLE ops.backend_job_log IS 'Railway FastAPI 후처리 작업 이력';

ALTER TABLE ops.backend_job_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backend_job_admin_full_access" ON ops.backend_job_log
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "backend_job_ops_read" ON ops.backend_job_log
  FOR SELECT USING ((auth.jwt() ->> 'role') = 'ops');
