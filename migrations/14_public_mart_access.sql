-- =============================================================
-- 14_public_mart_access.sql
-- Demo/anonymous dashboard access + consistent role resolution
-- =============================================================

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    -- 1. app_metadata.role: admin(service key)만 설정 가능, 가장 신뢰
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    -- 2. user_metadata.role: 사용자가 직접 설정 가능, 덜 신뢰
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    -- 3. 비인증 사용자는 접근 차단 (NULL 반환)
    CASE
      WHEN auth.role() = 'anon' THEN NULL
      ELSE 'readonly'
    END
  );
$$;

COMMENT ON FUNCTION public.current_app_role IS
  'Resolve app role: app_metadata.role > user_metadata.role > readonly (authenticated only). Returns NULL for anonymous.';

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (schemaname, tablename) IN (
      ('mart', 'mart_inventory_onhand'),
      ('mart', 'mart_stockout_risk'),
      ('mart', 'mart_overstock'),
      ('mart', 'mart_expiry_risk'),
      ('mart', 'mart_fefo_pick_list'),
      ('mart', 'mart_open_po'),
      ('mart', 'mart_service_level'),
      ('mart', 'mart_shipment_performance'),
      ('mart', 'mart_shipment_daily'),
      ('mart', 'mart_return_analysis'),
      ('mart', 'mart_return_daily'),
      ('mart', 'mart_pnl_revenue'),
      ('mart', 'mart_pnl_cogs'),
      ('mart', 'mart_pnl_gross_margin'),
      ('mart', 'mart_pnl_variable_cost'),
      ('mart', 'mart_pnl_contribution'),
      ('mart', 'mart_pnl_operating_profit'),
      ('mart', 'mart_pnl_waterfall_summary'),
      ('mart', 'mart_reco_inventory_movement'),
      ('mart', 'mart_reco_oms_vs_wms'),
      ('mart', 'mart_reco_erp_gr_vs_wms_receipt'),
      ('mart', 'mart_reco_settlement_vs_estimated'),
      ('mart', 'mart_reco_charges_invoice_vs_allocated'),
      ('mart', 'mart_constraint_signals'),
      ('mart', 'mart_constraint_root_cause'),
      ('mart', 'mart_constraint_action_plan'),
      ('mart', 'mart_constraint_effectiveness'),
      ('mart', 'mart_coverage_period'),
      ('mart', 'mart_forecast_accuracy'),
      ('mart', 'mart_demand_plan'),
      ('mart', 'mart_replenishment_plan'),
      ('mart', 'mart_lead_time_analysis'),
      ('mart', 'mart_model_performance'),
      ('mart', 'mart_charge_allocated')
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

ALTER TABLE mart.mart_inventory_onhand ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_stockout_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_overstock ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_expiry_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_fefo_pick_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_open_po ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_service_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_cogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_gross_margin ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_variable_cost ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_contribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_operating_profit ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_waterfall_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_inventory_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_oms_vs_wms ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_erp_gr_vs_wms_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_settlement_vs_estimated ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_charges_invoice_vs_allocated ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_root_cause ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_action_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_coverage_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_forecast_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_demand_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_replenishment_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_lead_time_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_charge_allocated ENABLE ROW LEVEL SECURITY;

-- mart 대시보드 테이블: 데모 모드(anon) 포함 전체 읽기 허용.
-- mart는 집계된 표시용 데이터이며, 민감한 원본(core/ops)은 07_rls_policies.sql에서 보호됨.
CREATE POLICY "mart_read" ON mart.mart_inventory_onhand FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_stockout_risk FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_overstock FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_expiry_risk FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_fefo_pick_list FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_open_po FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_service_level FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_shipment_performance FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_shipment_daily FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_return_analysis FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_return_daily FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_revenue FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_cogs FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_gross_margin FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_variable_cost FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_contribution FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_operating_profit FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_pnl_waterfall_summary FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_reco_inventory_movement FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_reco_oms_vs_wms FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_reco_erp_gr_vs_wms_receipt FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_reco_settlement_vs_estimated FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_reco_charges_invoice_vs_allocated FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_constraint_signals FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_constraint_root_cause FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_constraint_action_plan FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_constraint_effectiveness FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_coverage_period FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_forecast_accuracy FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_demand_plan FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_replenishment_plan FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_lead_time_analysis FOR SELECT USING (true);
CREATE POLICY "mart_read" ON mart.mart_model_performance FOR SELECT USING (true);

-- 원가배부 상세는 인증된 사용자만 (admin, pnl, readonly).
CREATE POLICY "charge_allocation_read" ON mart.mart_charge_allocated
  FOR SELECT USING (public.current_app_role() IN ('admin', 'pnl', 'readonly'));

-- Admin write access remains role-based.
CREATE POLICY "admin_full_access" ON mart.mart_inventory_onhand
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_stockout_risk
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_overstock
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_expiry_risk
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_fefo_pick_list
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_open_po
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_service_level
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_shipment_performance
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_shipment_daily
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_return_analysis
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_return_daily
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_revenue
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_cogs
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_gross_margin
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_variable_cost
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_contribution
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_operating_profit
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_pnl_waterfall_summary
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_inventory_movement
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_oms_vs_wms
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_erp_gr_vs_wms_receipt
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_settlement_vs_estimated
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_reco_charges_invoice_vs_allocated
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_signals
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_root_cause
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_action_plan
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_constraint_effectiveness
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_coverage_period
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_forecast_accuracy
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_demand_plan
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_replenishment_plan
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_lead_time_analysis
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_model_performance
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_charge_allocated
  FOR ALL USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
