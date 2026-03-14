-- ============================================================
-- 09_settings_tables.sql
-- 설정 센터 DB 테이블 (ops 스키마)
-- yaml 설정을 DB로 이전하여 웹 UI에서 관리 가능하게 함
-- ============================================================

-- 1. 컬럼 매핑 (column_aliases.yaml 대체)
CREATE TABLE IF NOT EXISTS ops.column_mappings (
  id            SERIAL PRIMARY KEY,
  source_name   TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  table_name    TEXT,                          -- NULL이면 공통(common) 매핑
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_name, table_name)
);

COMMENT ON TABLE ops.column_mappings IS '컬럼 별칭 매핑 — 업로드 시 원본 컬럼명을 표준 컬럼명으로 변환';

-- 2. 비용 유형 (charge_policy.yaml 대체)
CREATE TABLE IF NOT EXISTS ops.charge_type_config (
  charge_type             TEXT PRIMARY KEY,
  charge_domain           TEXT NOT NULL,
  cost_stage              TEXT NOT NULL,
  capitalizable_flag      BOOLEAN DEFAULT FALSE,
  default_allocation_basis TEXT NOT NULL,
  severity_if_missing     TEXT DEFAULT 'warn',
  created_by              TEXT,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ops.charge_type_config IS '비용 유형 설정 — 배분 기준, 도메인, 단계 정의';

-- 3. 임계값 (thresholds.yaml 대체)
CREATE TABLE IF NOT EXISTS ops.threshold_config (
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       DOUBLE PRECISION NOT NULL,
  description TEXT,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (category, key)
);

COMMENT ON TABLE ops.threshold_config IS '임계값 설정 — 과재고 DOH, 품절위험 기준일 등';

-- 4. 커버리지 정책 (coverage_policy.yaml 대체)
CREATE TABLE IF NOT EXISTS ops.coverage_policy_config (
  domain                   TEXT PRIMARY KEY,
  requirement              TEXT NOT NULL DEFAULT 'OPTIONAL',
  close_period_enforcement TEXT DEFAULT 'OPTIONAL',
  updated_by               TEXT,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ops.coverage_policy_config IS '커버리지 정책 — 도메인별 필수/선택 설정';

-- ============================================================
-- 초기 시드 데이터 — 기존 yaml 설정값 이전
-- ============================================================

-- 비용 유형 시드
INSERT INTO ops.charge_type_config (charge_type, charge_domain, cost_stage, capitalizable_flag, default_allocation_basis, severity_if_missing) VALUES
  ('LAST_MILE_PARCEL',    'logistics_transport', 'outbound',        FALSE, 'order_count',     'warn'),
  ('DOMESTIC_TRUCKING',   'logistics_transport', 'outbound',        FALSE, 'weight',           'warn'),
  ('FREIGHT_INTL_SEA',    'logistics_transport', 'inbound_landed',  TRUE,  'weight',           'warn'),
  ('FREIGHT_INTL_AIR',    'logistics_transport', 'inbound_landed',  TRUE,  'weight',           'warn'),
  ('CUSTOMS_DUTY',        'customs',             'inbound_landed',  TRUE,  'value',            'warn'),
  ('CUSTOMS_VAT',         'customs',             'inbound_landed',  FALSE, 'value',            'warn'),
  ('3PL_STORAGE_FEE',     '3pl_billing',         'storage',         FALSE, 'onhand_cbm_days',  'warn'),
  ('3PL_PICK_PACK_FEE',   '3pl_billing',         'outbound',        FALSE, 'line_count',       'warn'),
  ('PLATFORM_FEE',        'platform_fee',        'period',          FALSE, 'revenue',          'warn'),
  ('PG_FEE',              'platform_fee',        'period',          FALSE, 'revenue',          'warn'),
  ('MARKETING_SPEND',     'marketing',           'period',          FALSE, 'revenue',          'warn')
ON CONFLICT DO NOTHING;

-- 임계값 시드
INSERT INTO ops.threshold_config (category, key, value, description) VALUES
  ('inventory', 'doh_overstock_RM',          120, '원자재 과재고 기준 DOH (일)'),
  ('inventory', 'doh_overstock_PM',          180, '포장재 과재고 기준 DOH (일)'),
  ('inventory', 'doh_overstock_WIP',          90, '재공품 과재고 기준 DOH (일)'),
  ('inventory', 'doh_overstock_FG',           90, '완제품 과재고 기준 DOH (일)'),
  ('inventory', 'stockout_days_cover_default', 7, '품절위험 기본 기준일'),
  ('inventory', 'stockout_days_cover_FG',     10, '완제품 품절위험 기준일'),
  ('expiry',    'bucket_0',                    0, '유통기한 버킷 시작'),
  ('expiry',    'bucket_30',                  30, '유통기한 버킷 30일'),
  ('expiry',    'bucket_60',                  60, '유통기한 버킷 60일'),
  ('expiry',    'bucket_90',                  90, '유통기한 버킷 90일'),
  ('expiry',    'bucket_180',                180, '유통기한 버킷 180일'),
  ('expiry',    'bucket_365',                365, '유통기한 버킷 365일'),
  ('constraints', 'late_po_ratio_high',       0.2, '지연 PO 비율 경고 임계값'),
  ('constraints', 'backlog_ship_orders_high', 200, '출고 적체 주문수 경고 임계값'),
  ('constraints', 'dwell_time_days_high',       5, '통관 체류일 경고 임계값'),
  ('constraints', 'return_rate_spike_ratio_high', 1.5, '반품률 급증 비율 경고 임계값')
ON CONFLICT DO NOTHING;

-- 커버리지 정책 시드
INSERT INTO ops.coverage_policy_config (domain, requirement, close_period_enforcement) VALUES
  ('fx_rate',              'REQUIRED', 'REQUIRED'),
  ('revenue_settlement',   'OPTIONAL', 'OPTIONAL'),
  ('logistics_transport',  'OPTIONAL', 'REQUIRED'),
  ('customs',              'OPTIONAL', 'OPTIONAL'),
  ('3pl_billing',          'OPTIONAL', 'OPTIONAL'),
  ('cost_structure',       'OPTIONAL', 'REQUIRED')
ON CONFLICT DO NOTHING;

-- RLS 정책 — 설정 테이블은 admin만 수정, 나머지는 읽기 가능
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (schemaname, tablename) IN (
      ('ops', 'column_mappings'),
      ('ops', 'charge_type_config'),
      ('ops', 'threshold_config'),
      ('ops', 'coverage_policy_config')
    )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      target.policyname,
      target.schemaname,
      target.tablename
    );
  END LOOP;
END $$;

ALTER TABLE ops.column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.charge_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.threshold_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.coverage_policy_config ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자 모두
CREATE POLICY "settings_read" ON ops.column_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_read" ON ops.charge_type_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_read" ON ops.threshold_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_read" ON ops.coverage_policy_config FOR SELECT TO authenticated USING (true);

-- 쓰기: admin 역할만
CREATE POLICY "settings_write" ON ops.column_mappings FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "settings_write" ON ops.charge_type_config FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "settings_write" ON ops.threshold_config FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "settings_write" ON ops.coverage_policy_config FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
