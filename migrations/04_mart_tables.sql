-- =============================================================
-- 04_mart_tables.sql
-- Supabase PostgreSQL: MART 테이블 29개
-- 원본: src/db.py MART_TABLES (DuckDB)
-- 변환: DOUBLE → DOUBLE PRECISION, VARCHAR → TEXT,
--       current_timestamp → NOW()
-- MART 테이블은 매 파이프라인 실행 시 TRUNCATE + INSERT로 재빌드
-- 마이그레이션 시 DDL만 생성 (데이터는 파이프라인 재실행으로 채움)
-- =============================================================

-- ================================================================
-- SCM MARTS (11개)
-- ================================================================

-- ----- mart.mart_inventory_onhand -----
-- 입도: 품목 × 창고 × 로트 × 스냅샷일
CREATE TABLE IF NOT EXISTS mart.mart_inventory_onhand (
    snapshot_date      DATE,
    warehouse_id       TEXT,
    item_id            TEXT,
    lot_id             TEXT,
    onhand_qty         DOUBLE PRECISION,
    sellable_qty       DOUBLE PRECISION,
    blocked_qty        DOUBLE PRECISION,
    expired_qty        DOUBLE PRECISION,
    final_expiry_date  DATE,
    expiry_bucket      TEXT,
    fefo_rank          INTEGER,
    min_sellable_days  INTEGER
);

COMMENT ON TABLE mart.mart_inventory_onhand IS '재고 현황 (판매가능/차단/만료 수량, 유통기한 버킷)';

-- ----- mart.mart_stockout_risk -----
-- 입도: 품목 × 창고
CREATE TABLE IF NOT EXISTS mart.mart_stockout_risk (
    item_id            TEXT,
    warehouse_id       TEXT,
    sellable_qty       DOUBLE PRECISION,
    avg_daily_demand   DOUBLE PRECISION,
    days_of_cover      DOUBLE PRECISION,
    threshold_days     INTEGER,
    risk_flag          BOOLEAN,
    as_of_date         DATE
);

COMMENT ON TABLE mart.mart_stockout_risk IS '품절 위험 (DOH, days_of_cover, stockout_flag)';

-- ----- mart.mart_overstock -----
-- 입도: 품목 × 창고
CREATE TABLE IF NOT EXISTS mart.mart_overstock (
    item_id            TEXT,
    warehouse_id       TEXT,
    item_type          TEXT,
    onhand_qty         DOUBLE PRECISION,
    avg_daily_demand   DOUBLE PRECISION,
    days_on_hand       DOUBLE PRECISION,
    doh_threshold      INTEGER,
    overstock_flag     BOOLEAN,
    overstock_qty      DOUBLE PRECISION,
    as_of_date         DATE
);

COMMENT ON TABLE mart.mart_overstock IS '과재고 (DOH, overstock_qty, overstock_value)';

-- ----- mart.mart_expiry_risk -----
-- 입도: 품목 × 창고 × 로트
CREATE TABLE IF NOT EXISTS mart.mart_expiry_risk (
    item_id            TEXT,
    warehouse_id       TEXT,
    lot_id             TEXT,
    onhand_qty         DOUBLE PRECISION,
    final_expiry_date  DATE,
    days_to_expiry     INTEGER,
    expiry_bucket      TEXT,
    risk_value_krw     DOUBLE PRECISION,
    as_of_date         DATE
);

COMMENT ON TABLE mart.mart_expiry_risk IS '유통기한 위험 (잔여일수, 위험금액 risk_value_krw). NULL 전파: 원가 없으면 risk_value_krw=NULL';

-- ----- mart.mart_fefo_pick_list -----
-- 입도: 창고 × 품목 × 로트
CREATE TABLE IF NOT EXISTS mart.mart_fefo_pick_list (
    warehouse_id       TEXT,
    item_id            TEXT,
    lot_id             TEXT,
    onhand_qty         DOUBLE PRECISION,
    sellable_qty       DOUBLE PRECISION,
    final_expiry_date  DATE,
    fefo_rank          INTEGER,
    snapshot_date      DATE
);

COMMENT ON TABLE mart.mart_fefo_pick_list IS 'FEFO 피킹 우선순위';

-- ----- mart.mart_open_po -----
-- 입도: 발주 라인
CREATE TABLE IF NOT EXISTS mart.mart_open_po (
    po_id              TEXT,
    item_id            TEXT,
    supplier_id        TEXT,
    po_date            DATE,
    eta_date           DATE,
    first_receipt_date DATE,
    qty_ordered        DOUBLE PRECISION,
    qty_received       DOUBLE PRECISION,
    qty_open           DOUBLE PRECISION,
    delay_days         INTEGER,
    po_lead_days       INTEGER,
    eta_vs_actual_days INTEGER,
    period             TEXT
);

COMMENT ON TABLE mart.mart_open_po IS '미입고 발주 현황 (지연일, 리드타임, ETA 정확도)';

-- ----- mart.mart_service_level -----
-- 입도: 주차 × 채널스토어
CREATE TABLE IF NOT EXISTS mart.mart_service_level (
    week_start         DATE,
    channel_store_id   TEXT,
    total_orders       BIGINT,
    shipped_on_time    BIGINT,
    service_level_pct  DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_service_level IS '주간 서비스 레벨 (정시출고율). 목표 ≥ 95%';

-- ----- mart.mart_shipment_performance -----
-- 입도: 기간 × 창고 × 채널
CREATE TABLE IF NOT EXISTS mart.mart_shipment_performance (
    period             TEXT,
    warehouse_id       TEXT,
    channel_store_id   TEXT,
    total_shipments    BIGINT,
    total_qty_shipped  DOUBLE PRECISION,
    total_weight       DOUBLE PRECISION,
    total_volume_cbm   DOUBLE PRECISION,
    avg_qty_per_shipment DOUBLE PRECISION,
    avg_lead_days      DOUBLE PRECISION,
    on_time_count      BIGINT,
    on_time_pct        DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_shipment_performance IS '출고 성과 (건수, 수량, 정시율, 리드타임)';

-- ----- mart.mart_shipment_daily -----
-- 입도: 출고일 × 창고
CREATE TABLE IF NOT EXISTS mart.mart_shipment_daily (
    ship_date          DATE,
    warehouse_id       TEXT,
    shipment_count     BIGINT,
    qty_shipped        DOUBLE PRECISION,
    weight             DOUBLE PRECISION,
    volume_cbm         DOUBLE PRECISION,
    unique_orders      BIGINT,
    unique_items       BIGINT
);

COMMENT ON TABLE mart.mart_shipment_daily IS '일별 출고 추이';

-- ----- mart.mart_return_analysis -----
-- 입도: 기간 × 품목 × 사유
CREATE TABLE IF NOT EXISTS mart.mart_return_analysis (
    period             TEXT,
    item_id            TEXT,
    warehouse_id       TEXT,
    channel_store_id   TEXT,
    reason             TEXT,
    disposition        TEXT,
    return_count       BIGINT,
    qty_returned       DOUBLE PRECISION,
    qty_shipped        DOUBLE PRECISION,
    return_rate        DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_return_analysis IS '반품 분석 (수량, 반품율, 처분)';

-- ----- mart.mart_return_daily -----
-- 입도: 반품일 × 창고
CREATE TABLE IF NOT EXISTS mart.mart_return_daily (
    return_date        DATE,
    warehouse_id       TEXT,
    return_count       BIGINT,
    qty_returned       DOUBLE PRECISION,
    unique_orders      BIGINT,
    unique_items       BIGINT,
    top_reason         TEXT
);

COMMENT ON TABLE mart.mart_return_daily IS '일별 반품 추이';


-- ================================================================
-- P&L MARTS (7개)
-- coverage_flag: ACTUAL | PARTIAL | NULL (NULL은 PARTIAL로 취급)
-- ================================================================

-- ----- mart.mart_pnl_revenue -----
-- 입도: 기간 × 품목 × 채널 × 국가
CREATE TABLE IF NOT EXISTS mart.mart_pnl_revenue (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    gross_sales_krw    DOUBLE PRECISION,
    discounts_krw      DOUBLE PRECISION,
    refunds_krw        DOUBLE PRECISION,
    net_revenue_krw    DOUBLE PRECISION,
    source             TEXT,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_revenue IS '매출 마트. coverage_flag: FX 누락 시 PARTIAL. FX 1.0 폴백 금지';

-- ----- mart.mart_pnl_cogs -----
-- 입도: 기간 × 품목 × 채널 × 국가
CREATE TABLE IF NOT EXISTS mart.mart_pnl_cogs (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    qty_shipped        DOUBLE PRECISION,
    qty_returned       DOUBLE PRECISION,
    qty_net            DOUBLE PRECISION,
    unit_cost_krw      DOUBLE PRECISION,
    cogs_krw           DOUBLE PRECISION,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_cogs IS '매출원가 마트. coverage_flag: 원가 누락 시 PARTIAL. 원가 0 채움 금지';

-- ----- mart.mart_pnl_gross_margin -----
-- 입도: 기간 × 품목 × 채널 × 국가
-- coverage_flag 전파: rev.flag AND cogs.flag → ACTUAL | PARTIAL
CREATE TABLE IF NOT EXISTS mart.mart_pnl_gross_margin (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    net_revenue_krw    DOUBLE PRECISION,
    cogs_krw           DOUBLE PRECISION,
    gross_margin_krw   DOUBLE PRECISION,
    gross_margin_pct   DOUBLE PRECISION,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_gross_margin IS '매출총이익 마트. coverage_flag 전파: revenue AND cogs 모두 ACTUAL이어야 ACTUAL';

-- ----- mart.mart_pnl_variable_cost -----
-- 입도: 기간 × 품목 × 채널 × 국가 × 도메인 × 유형
CREATE TABLE IF NOT EXISTS mart.mart_pnl_variable_cost (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    charge_domain      TEXT,
    charge_type        TEXT,
    allocated_amount_krw DOUBLE PRECISION,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_variable_cost IS '변동비 마트. charge_domain 6종: logistics_transport/customs/3pl_billing/platform_fee/marketing/기타';

-- ----- mart.mart_pnl_contribution -----
-- 입도: 기간 × 품목 × 채널 × 국가
-- coverage_flag 전파: gross_margin에서 전파
CREATE TABLE IF NOT EXISTS mart.mart_pnl_contribution (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    gross_margin_krw   DOUBLE PRECISION,
    total_variable_cost_krw DOUBLE PRECISION,
    contribution_krw   DOUBLE PRECISION,
    contribution_pct   DOUBLE PRECISION,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_contribution IS '공헌이익 마트. coverage_flag: gross_margin에서 전파';

-- ----- mart.mart_pnl_operating_profit -----
-- 입도: 기간 × 품목 × 채널 × 국가
-- coverage_flag 전파: contribution에서 전파
CREATE TABLE IF NOT EXISTS mart.mart_pnl_operating_profit (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    country            TEXT,
    contribution_krw   DOUBLE PRECISION,
    fixed_cost_krw     DOUBLE PRECISION,
    operating_profit_krw DOUBLE PRECISION,
    operating_profit_pct DOUBLE PRECISION,
    coverage_flag      TEXT
);

COMMENT ON TABLE mart.mart_pnl_operating_profit IS '영업이익 마트. coverage_flag: contribution에서 전파. known_sum: ELSE 0 금지';

-- ----- mart.mart_pnl_waterfall_summary -----
-- 입도: 기간 × 지표
CREATE TABLE IF NOT EXISTS mart.mart_pnl_waterfall_summary (
    period             TEXT,
    metric_name        TEXT,
    metric_order       INTEGER,
    amount_krw         DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_pnl_waterfall_summary IS '손익 워터폴 요약 (매출→원가→이익 단계별 금액)';


-- ================================================================
-- 비용 배분 MART (1개)
-- ================================================================

-- ----- mart.mart_charge_allocated -----
-- 입도: 기간 × 비용유형 × 도메인 × 단계 × 품목
CREATE TABLE IF NOT EXISTS mart.mart_charge_allocated (
    period             TEXT,
    charge_type        TEXT,
    charge_domain      TEXT,
    cost_stage         TEXT,
    invoice_no         TEXT,
    invoice_line_no    BIGINT,
    item_id            TEXT,
    warehouse_id       TEXT,
    channel_store_id   TEXT,
    lot_id             TEXT,
    allocation_basis   TEXT,
    basis_value        DOUBLE PRECISION,
    allocated_amount   DOUBLE PRECISION,
    allocated_amount_krw DOUBLE PRECISION,
    currency           TEXT,
    capitalizable_flag BOOLEAN
);

COMMENT ON TABLE mart.mart_charge_allocated IS 'Hare-Niemeyer 배분 비용 내역. SUM(배분) == 청구서 합계 보존';


-- ================================================================
-- 대사 MARTS (5개)
-- ================================================================

-- ----- mart.reco_inventory_movement -----
-- 입도: 스냅샷일 × 창고 × 품목
CREATE TABLE IF NOT EXISTS mart.mart_reco_inventory_movement (
    snapshot_date      DATE,
    warehouse_id       TEXT,
    item_id            TEXT,
    prev_onhand        DOUBLE PRECISION,
    receipts           DOUBLE PRECISION,
    shipments          DOUBLE PRECISION,
    returns            DOUBLE PRECISION,
    adjustments        DOUBLE PRECISION,
    expected_onhand    DOUBLE PRECISION,
    actual_onhand      DOUBLE PRECISION,
    delta              DOUBLE PRECISION,
    delta_ratio        DOUBLE PRECISION,
    severity           TEXT
);

COMMENT ON TABLE mart.mart_reco_inventory_movement IS '재고 수불 대사 (기초+입고-출고 = 기말). delta_pct, status: OK/WARN/FAIL';

-- ----- mart.reco_oms_vs_wms -----
-- 입도: 기간 × 품목 × 채널
CREATE TABLE IF NOT EXISTS mart.mart_reco_oms_vs_wms (
    period             TEXT,
    item_id            TEXT,
    channel_store_id   TEXT,
    oms_qty_ordered    DOUBLE PRECISION,
    wms_qty_shipped    DOUBLE PRECISION,
    delta              DOUBLE PRECISION,
    fulfillment_rate   DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_reco_oms_vs_wms IS 'OMS 주문수량 vs WMS 출고수량 대사';

-- ----- mart.reco_erp_gr_vs_wms_receipt -----
-- 입도: 기간 × 품목 × 발주
CREATE TABLE IF NOT EXISTS mart.mart_reco_erp_gr_vs_wms_receipt (
    period             TEXT,
    item_id            TEXT,
    po_id              TEXT,
    erp_qty            DOUBLE PRECISION,
    wms_qty            DOUBLE PRECISION,
    delta              DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_reco_erp_gr_vs_wms_receipt IS 'ERP 입고 vs WMS 입고 수량 대사';

-- ----- mart.reco_settlement_vs_estimated -----
-- 입도: 기간 × 채널 × 품목
CREATE TABLE IF NOT EXISTS mart.mart_reco_settlement_vs_estimated (
    period             TEXT,
    channel_store_id   TEXT,
    item_id            TEXT,
    settlement_revenue_krw DOUBLE PRECISION,
    estimated_revenue_krw  DOUBLE PRECISION,
    delta_krw          DOUBLE PRECISION,
    variance_pct       DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_reco_settlement_vs_estimated IS '정산매출 vs 추정매출. 임계값: <2%=OK, 2~5%=WARN, ≥5%=INVESTIGATE';

-- ----- mart.reco_charges_invoice_vs_allocated -----
-- 입도: 기간 × 비용유형
CREATE TABLE IF NOT EXISTS mart.mart_reco_charges_invoice_vs_allocated (
    period             TEXT,
    charge_type        TEXT,
    invoice_total      DOUBLE PRECISION,
    allocated_total    DOUBLE PRECISION,
    delta              DOUBLE PRECISION,
    tied               BOOLEAN
);

COMMENT ON TABLE mart.mart_reco_charges_invoice_vs_allocated IS '인보이스 금액 vs 배분 금액. delta=0만 BALANCED (허용 오차 없음)';


-- ================================================================
-- 병목 MARTS (4개)
-- ================================================================

-- ----- mart.mart_constraint_signals -----
CREATE TABLE IF NOT EXISTS mart.mart_constraint_signals (
    signal_id          TEXT,
    domain             TEXT,
    metric_name        TEXT,
    current_value      DOUBLE PRECISION,
    threshold_value    DOUBLE PRECISION,
    severity           TEXT,
    entity_type        TEXT,
    entity_id          TEXT,
    period             TEXT,
    detected_at        TIMESTAMP
);

COMMENT ON TABLE mart.mart_constraint_signals IS '제약 신호 (도메인, 지표, 임계값, 심각도: CRITICAL/HIGH/WARN)';

-- ----- mart.mart_constraint_root_cause -----
CREATE TABLE IF NOT EXISTS mart.mart_constraint_root_cause (
    signal_id          TEXT,
    root_cause         TEXT,
    contributing_factors TEXT,
    domain             TEXT,
    period             TEXT
);

COMMENT ON TABLE mart.mart_constraint_root_cause IS '근본 원인 분석';

-- ----- mart.mart_constraint_action_plan -----
CREATE TABLE IF NOT EXISTS mart.mart_constraint_action_plan (
    signal_id          TEXT,
    action             TEXT,
    priority           TEXT,
    responsible        TEXT,
    domain             TEXT,
    period             TEXT
);

COMMENT ON TABLE mart.mart_constraint_action_plan IS '권장 조치 계획';

-- ----- mart.mart_constraint_effectiveness -----
CREATE TABLE IF NOT EXISTS mart.mart_constraint_effectiveness (
    signal_id          TEXT,
    metric_name        TEXT,
    before_value       DOUBLE PRECISION,
    after_value        DOUBLE PRECISION,
    delta              DOUBLE PRECISION,
    resolved           BOOLEAN,
    period             TEXT
);

COMMENT ON TABLE mart.mart_constraint_effectiveness IS '제약 해소 전후 효과 측정';


-- ================================================================
-- 커버리지 MART (1개)
-- ================================================================

-- ----- mart.mart_coverage_period -----
-- 입도: 기간 × 도메인
CREATE TABLE IF NOT EXISTS mart.mart_coverage_period (
    period             TEXT,
    domain             TEXT,
    coverage_rate      DOUBLE PRECISION,
    included_rows      BIGINT,
    missing_rows       BIGINT,
    severity           TEXT,
    is_closed_period   BOOLEAN
);

COMMENT ON TABLE mart.mart_coverage_period IS '도메인별 커버리지율 + 심각도. 100%=초록, ≥80%=노랑, <80%=빨강';
