-- =============================================================
-- 07_rls_policies.sql
-- Supabase PostgreSQL: Row Level Security (RLS) 정책
--
-- 역할 체계 (RBAC):
--   admin    → 전체 무제한
--   scm      → SCM 대시보드 + CORE 조회
--   pnl      → P&L 대시보드 + 원가/배분 조회
--   ops      → SCM 일부 + 파이프라인 실행 (마감 제외)
--   readonly → 모든 마트 조회 (수정 불가)
--
-- 참고: FastAPI 서비스 키(SUPABASE_SERVICE_KEY)는 RLS 우회
--       프론트엔드 ANON KEY는 RLS 적용
-- =============================================================


-- ================================================================
-- SCM MART 테이블 — RLS 활성화
-- 접근: admin, scm, ops, readonly
-- ================================================================

ALTER TABLE mart.mart_inventory_onhand     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_stockout_risk        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_overstock            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_expiry_risk          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_fefo_pick_list       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_open_po              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_service_level        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_analysis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_daily         ENABLE ROW LEVEL SECURITY;

-- admin: 전체 접근 (SCM)
CREATE POLICY "admin_full_access" ON mart.mart_inventory_onhand
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_stockout_risk
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_overstock
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_expiry_risk
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_fefo_pick_list
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_open_po
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_service_level
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_shipment_performance
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_shipment_daily
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_return_analysis
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_return_daily
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- scm + ops + readonly: 읽기 접근 (SCM)
CREATE POLICY "scm_read" ON mart.mart_inventory_onhand
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_stockout_risk
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_overstock
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_expiry_risk
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_fefo_pick_list
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_open_po
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_service_level
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_shipment_performance
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_shipment_daily
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_return_analysis
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_read" ON mart.mart_return_daily
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));


-- ================================================================
-- P&L MART 테이블 — RLS 활성화
-- 접근: admin, pnl, readonly
-- ================================================================

ALTER TABLE mart.mart_pnl_revenue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_cogs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_gross_margin     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_variable_cost    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_contribution     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_operating_profit ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_waterfall_summary ENABLE ROW LEVEL SECURITY;

-- admin: 전체 접근 (P&L)
CREATE POLICY "admin_full_access" ON mart.mart_pnl_revenue
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_cogs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_gross_margin
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_variable_cost
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_contribution
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_operating_profit
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_waterfall_summary
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- pnl + readonly: 읽기 접근 (P&L)
CREATE POLICY "pnl_read" ON mart.mart_pnl_revenue
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_cogs
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_gross_margin
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_variable_cost
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_contribution
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_operating_profit
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_read" ON mart.mart_pnl_waterfall_summary
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));


-- ================================================================
-- 원가배분 상세 — admin + pnl만
-- ================================================================

ALTER TABLE mart.mart_charge_allocated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON mart.mart_charge_allocated
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "cost_detail_read" ON mart.mart_charge_allocated
  FOR SELECT USING (auth.jwt() ->> 'role' = 'pnl');


-- ================================================================
-- 대사 MART 테이블 — RLS 활성화
-- 재고대사: admin, scm, ops, readonly
-- 정산대사: admin, pnl, readonly
-- 배분보존: admin, pnl, readonly
-- ================================================================

ALTER TABLE mart.mart_reco_inventory_movement          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_oms_vs_wms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_erp_gr_vs_wms_receipt       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_settlement_vs_estimated     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_charges_invoice_vs_allocated ENABLE ROW LEVEL SECURITY;

-- admin: 전체 접근 (대사)
CREATE POLICY "admin_full_access" ON mart.mart_reco_inventory_movement
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_oms_vs_wms
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_erp_gr_vs_wms_receipt
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_settlement_vs_estimated
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_charges_invoice_vs_allocated
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- SCM 대사 (재고이동, OMS-WMS, ERP-WMS): scm + ops + readonly
CREATE POLICY "scm_reco_read" ON mart.mart_reco_inventory_movement
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_reco_read" ON mart.mart_reco_oms_vs_wms
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_reco_read" ON mart.mart_reco_erp_gr_vs_wms_receipt
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));

-- P&L 대사 (정산vs추정, 배분보존): pnl + readonly
CREATE POLICY "pnl_reco_read" ON mart.mart_reco_settlement_vs_estimated
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));
CREATE POLICY "pnl_reco_read" ON mart.mart_reco_charges_invoice_vs_allocated
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('pnl', 'readonly'));


-- ================================================================
-- 병목 MART 테이블 — RLS 활성화
-- 접근: admin, scm, ops, readonly
-- ================================================================

ALTER TABLE mart.mart_constraint_signals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_root_cause    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_action_plan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_effectiveness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON mart.mart_constraint_signals
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_root_cause
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_action_plan
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_effectiveness
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "scm_constraint_read" ON mart.mart_constraint_signals
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_constraint_read" ON mart.mart_constraint_root_cause
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_constraint_read" ON mart.mart_constraint_action_plan
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));
CREATE POLICY "scm_constraint_read" ON mart.mart_constraint_effectiveness
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'ops', 'readonly'));


-- ================================================================
-- 커버리지 MART — 전체 읽기 가능
-- ================================================================

ALTER TABLE mart.mart_coverage_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON mart.mart_coverage_period
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "coverage_read" ON mart.mart_coverage_period
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'pnl', 'ops', 'readonly'));


-- ================================================================
-- OPS 테이블 — admin + ops만
-- ================================================================

ALTER TABLE ops.ops_issue_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.ops_period_close   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.ops_adjustment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.ops_snapshot       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON ops.ops_issue_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON ops.ops_period_close
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON ops.ops_adjustment_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON ops.ops_snapshot
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "ops_read" ON ops.ops_issue_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON ops.ops_period_close
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON ops.ops_adjustment_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON ops.ops_snapshot
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');


-- ================================================================
-- RAW 테이블 — admin + ops만
-- ================================================================

ALTER TABLE raw.system_batch_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw.system_file_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw.system_dq_report  ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw.system_batch_lock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON raw.system_batch_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON raw.system_file_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON raw.system_dq_report
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON raw.system_batch_lock
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "ops_read" ON raw.system_batch_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON raw.system_file_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON raw.system_dq_report
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
CREATE POLICY "ops_read" ON raw.system_batch_lock
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ops');
