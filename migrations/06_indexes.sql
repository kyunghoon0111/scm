-- =============================================================
-- 06_indexes.sql
-- Supabase PostgreSQL: 성능 인덱스
-- 주요 조인/필터 패턴 기반 인덱스 설계
-- =============================================================

-- ================================================================
-- CORE FACT INDEXES
-- ================================================================

-- 재고 스냅샷: 날짜+창고+품목 조회 (재고현황, 회전율, 대사)
CREATE INDEX IF NOT EXISTS idx_inv_snapshot_date_wh_item
    ON core.fact_inventory_snapshot(snapshot_date, warehouse_id, item_id);

-- 출고: 출고일+채널 조회 (회전율 계산, 납기 분석)
CREATE INDEX IF NOT EXISTS idx_shipment_date_channel
    ON core.fact_shipment(ship_date, channel_store_id);

-- 출고: channel_order_id 필터 (판매 전용 필터 WHERE channel_order_id IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_shipment_channel_order
    ON core.fact_shipment(channel_order_id)
    WHERE channel_order_id IS NOT NULL;

-- 발주: 공급사+ETA 조회 (리드타임 분석)
CREATE INDEX IF NOT EXISTS idx_po_supplier_eta
    ON core.fact_po(supplier_id, eta_date);

-- 환율: as-of join (기간+통화)
CREATE INDEX IF NOT EXISTS idx_fx_rate_period_currency
    ON core.fact_exchange_rate(period, currency);

-- 원가 구조: as-of join (품목+유효일자)
CREATE INDEX IF NOT EXISTS idx_cost_structure_item_date
    ON core.fact_cost_structure(item_id, effective_from);

-- 정산: 기간+채널 (P&L 매출 빌드)
CREATE INDEX IF NOT EXISTS idx_settlement_period_channel
    ON core.fact_settlement(period, channel_store_id);

-- 비용 실제: 기간+비용유형 (배분 매칭)
CREATE INDEX IF NOT EXISTS idx_charge_actual_period_type
    ON core.fact_charge_actual(period, charge_type);

-- 주문: 주문일+채널 (서비스 레벨)
CREATE INDEX IF NOT EXISTS idx_order_date_channel
    ON core.fact_order(order_date, channel_store_id);

-- 입고: PO 조인 (리드타임)
CREATE INDEX IF NOT EXISTS idx_receipt_po
    ON core.fact_receipt(po_id, item_id);

-- 반품: 반품일+품목 (반품 분석)
CREATE INDEX IF NOT EXISTS idx_return_date_item
    ON core.fact_return(return_date, item_id);


-- ================================================================
-- MART INDEXES
-- ================================================================

-- P&L 마트: period 기반 집계
CREATE INDEX IF NOT EXISTS idx_pnl_revenue_period
    ON mart.mart_pnl_revenue(period, item_id, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_pnl_cogs_period
    ON mart.mart_pnl_cogs(period, item_id, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_pnl_gross_margin_period
    ON mart.mart_pnl_gross_margin(period, item_id, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_pnl_contribution_period
    ON mart.mart_pnl_contribution(period, item_id, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_pnl_operating_profit_period
    ON mart.mart_pnl_operating_profit(period, item_id, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_pnl_variable_cost_period
    ON mart.mart_pnl_variable_cost(period, charge_domain);

CREATE INDEX IF NOT EXISTS idx_pnl_waterfall_period
    ON mart.mart_pnl_waterfall_summary(period);

-- 병목 신호: 심각도 필터
CREATE INDEX IF NOT EXISTS idx_constraint_severity
    ON mart.mart_constraint_signals(severity, metric_name);

-- 커버리지 이력: 기간+도메인 조회
CREATE INDEX IF NOT EXISTS idx_coverage_period_domain
    ON mart.mart_coverage_period(period, domain);

-- 배분 상세: 기간+비용유형 조회
CREATE INDEX IF NOT EXISTS idx_charge_allocated_period_type
    ON mart.mart_charge_allocated(period, charge_type);

-- 재고현황: 스냅샷일+창고 조회
CREATE INDEX IF NOT EXISTS idx_inventory_onhand_date_wh
    ON mart.mart_inventory_onhand(snapshot_date, warehouse_id);

-- 발주현황: 기간+공급사 조회
CREATE INDEX IF NOT EXISTS idx_open_po_period_supplier
    ON mart.mart_open_po(period, supplier_id);

-- 대사: 기간 조회
CREATE INDEX IF NOT EXISTS idx_reco_inv_movement_date
    ON mart.mart_reco_inventory_movement(snapshot_date, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_reco_settlement_period
    ON mart.mart_reco_settlement_vs_estimated(period, channel_store_id);

CREATE INDEX IF NOT EXISTS idx_reco_charges_period
    ON mart.mart_reco_charges_invoice_vs_allocated(period, charge_type);
