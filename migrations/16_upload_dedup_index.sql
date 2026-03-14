-- =============================================================
-- 16_upload_dedup_index.sql
-- Support duplicate upload detection in raw.system_file_log
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_system_file_log_hash_table_status
  ON raw.system_file_log (file_hash, table_name, status, processed_at DESC);
