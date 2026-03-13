-- =============================================================
-- 99_sample_data.sql
-- DB 초기화 + 샘플 데이터 (개발/테스트용)
-- Period 형식: YYYY-MM (2026-01, 2026-02, 2026-03)
-- =============================================================

-- =============================================
-- STEP 0: RLS 비활성화 (개발용)
-- =============================================
ALTER TABLE mart.mart_inventory_onhand DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_stockout_risk DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_overstock DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_expiry_risk DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_fefo_pick_list DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_open_po DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_service_level DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_shipment_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_return_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_revenue DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_cogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_gross_margin DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_variable_cost DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_contribution DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_operating_profit DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_pnl_waterfall_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_charge_allocated DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_inventory_movement DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_oms_vs_wms DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_erp_gr_vs_wms_receipt DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_settlement_vs_estimated DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_reco_charges_invoice_vs_allocated DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_root_cause DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_action_plan DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_constraint_effectiveness DISABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_coverage_period DISABLE ROW LEVEL SECURITY;

-- OPS 테이블도 RLS 비활성화
DO $$ BEGIN
  EXECUTE 'ALTER TABLE ops.ops_issue_log DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ops.ops_period_close DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ops.ops_adjustment_log DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ops.ops_snapshot DISABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- STEP 1: 전체 데이터 삭제
-- =============================================
TRUNCATE TABLE mart.mart_constraint_effectiveness CASCADE;
TRUNCATE TABLE mart.mart_constraint_action_plan CASCADE;
TRUNCATE TABLE mart.mart_constraint_root_cause CASCADE;
TRUNCATE TABLE mart.mart_constraint_signals CASCADE;
TRUNCATE TABLE mart.mart_reco_charges_invoice_vs_allocated CASCADE;
TRUNCATE TABLE mart.mart_reco_settlement_vs_estimated CASCADE;
TRUNCATE TABLE mart.mart_reco_erp_gr_vs_wms_receipt CASCADE;
TRUNCATE TABLE mart.mart_reco_oms_vs_wms CASCADE;
TRUNCATE TABLE mart.mart_reco_inventory_movement CASCADE;
TRUNCATE TABLE mart.mart_charge_allocated CASCADE;
TRUNCATE TABLE mart.mart_pnl_waterfall_summary CASCADE;
TRUNCATE TABLE mart.mart_pnl_operating_profit CASCADE;
TRUNCATE TABLE mart.mart_pnl_contribution CASCADE;
TRUNCATE TABLE mart.mart_pnl_variable_cost CASCADE;
TRUNCATE TABLE mart.mart_pnl_gross_margin CASCADE;
TRUNCATE TABLE mart.mart_pnl_cogs CASCADE;
TRUNCATE TABLE mart.mart_pnl_revenue CASCADE;
TRUNCATE TABLE mart.mart_coverage_period CASCADE;
TRUNCATE TABLE mart.mart_return_daily CASCADE;
TRUNCATE TABLE mart.mart_return_analysis CASCADE;
TRUNCATE TABLE mart.mart_shipment_daily CASCADE;
TRUNCATE TABLE mart.mart_shipment_performance CASCADE;
TRUNCATE TABLE mart.mart_service_level CASCADE;
TRUNCATE TABLE mart.mart_open_po CASCADE;
TRUNCATE TABLE mart.mart_fefo_pick_list CASCADE;
TRUNCATE TABLE mart.mart_expiry_risk CASCADE;
TRUNCATE TABLE mart.mart_overstock CASCADE;
TRUNCATE TABLE mart.mart_stockout_risk CASCADE;
TRUNCATE TABLE mart.mart_inventory_onhand CASCADE;
TRUNCATE TABLE core.fact_cost_structure CASCADE;
TRUNCATE TABLE core.fact_exchange_rate CASCADE;
TRUNCATE TABLE core.fact_charge_actual CASCADE;
TRUNCATE TABLE core.fact_settlement CASCADE;
TRUNCATE TABLE core.fact_receipt CASCADE;
TRUNCATE TABLE core.fact_po CASCADE;
TRUNCATE TABLE core.fact_inventory_snapshot CASCADE;
TRUNCATE TABLE core.fact_return CASCADE;
TRUNCATE TABLE core.fact_shipment CASCADE;
TRUNCATE TABLE core.fact_order CASCADE;
TRUNCATE TABLE core.dim_charge_policy CASCADE;
TRUNCATE TABLE core.dim_uom_conversion CASCADE;
TRUNCATE TABLE core.dim_warehouse CASCADE;
TRUNCATE TABLE core.dim_channel_store CASCADE;
TRUNCATE TABLE core.dim_partner CASCADE;
TRUNCATE TABLE core.dim_item CASCADE;

-- =============================================
-- STEP 2: 차원 데이터
-- =============================================

INSERT INTO core.dim_item (item_id, item_type, category, weight, volume_cbm, expiry_control_flag, shelf_life_days, active_flag) VALUES
('ITEM-001', 'FG', '세럼',        0.15, 0.0003, true,  730, true),
('ITEM-002', 'FG', '클렌저',      0.20, 0.0004, true,  540, true),
('ITEM-003', 'FG', '선크림',      0.12, 0.0002, true,  365, true),
('ITEM-004', 'FG', '토너',        0.25, 0.0005, true,  730, true),
('ITEM-005', 'FG', '마스크팩',    0.05, 0.0001, true,  365, true);

INSERT INTO core.dim_warehouse (warehouse_id, warehouse_type, country, cost_center) VALUES
('WH-INCHEON', '3PL', 'KR', 'CC-INCHEON'),
('WH-BUSAN',   '3PL', 'KR', 'CC-BUSAN');

INSERT INTO core.dim_channel_store (channel_store_id, channel, store, settlement_currency, settlement_cycle) VALUES
('CH-COUPANG', '쿠팡',          '쿠팡 로켓배송', 'KRW', 'MONTHLY'),
('CH-NAVER',   '네이버스마트스토어', '네이버 공식',  'KRW', 'MONTHLY'),
('CH-SSG',     'SSG.COM',       'SSG 온라인',    'KRW', 'MONTHLY');

INSERT INTO core.dim_partner (partner_id, partner_type, country, default_currency) VALUES
('SUP-COSMAX', 'SUPPLIER', 'KR', 'KRW'),
('SUP-KOLMAR', 'SUPPLIER', 'KR', 'KRW'),
('3PL-CJ',    '3PL',      'KR', 'KRW');

INSERT INTO core.dim_charge_policy (charge_type, charge_domain, cost_stage, capitalizable_flag, default_allocation_basis) VALUES
('LAST_MILE_PARCEL',   'logistics_transport', 'outbound',       false, 'order_count'),
('DOMESTIC_TRUCKING',  'logistics_transport', 'outbound',       false, 'weight'),
('3PL_STORAGE_FEE',    '3pl_billing',         'storage',        false, 'onhand_cbm_days'),
('3PL_PICK_PACK_FEE',  '3pl_billing',         'outbound',       false, 'line_count'),
('PLATFORM_FEE',       'platform_fee',        'period',         false, 'revenue'),
('PG_FEE',             'platform_fee',        'period',         false, 'revenue'),
('MARKETING_SPEND',    'marketing',           'period',         false, 'revenue');

-- =============================================
-- STEP 3: 환율 + 원가 구조
-- =============================================

INSERT INTO core.fact_exchange_rate (period, currency, rate_to_krw, source_system, load_batch_id, source_file_hash) VALUES
('2026-01', 'KRW', 1,    'manual', 1, 'seed'),
('2026-01', 'USD', 1350, 'manual', 1, 'seed'),
('2026-02', 'KRW', 1,    'manual', 1, 'seed'),
('2026-02', 'USD', 1340, 'manual', 1, 'seed'),
('2026-03', 'KRW', 1,    'manual', 1, 'seed'),
('2026-03', 'USD', 1355, 'manual', 1, 'seed');

INSERT INTO core.fact_cost_structure (item_id, cost_component, effective_from, cost_per_unit_krw, source_system) VALUES
('ITEM-001', 'RAW_MATERIAL', '2026-01-01', 8500,  'manual'),
('ITEM-001', 'LABOR',        '2026-01-01', 2000,  'manual'),
('ITEM-002', 'RAW_MATERIAL', '2026-01-01', 5200,  'manual'),
('ITEM-002', 'LABOR',        '2026-01-01', 1500,  'manual'),
('ITEM-003', 'RAW_MATERIAL', '2026-01-01', 6800,  'manual'),
('ITEM-003', 'LABOR',        '2026-01-01', 1800,  'manual'),
('ITEM-004', 'RAW_MATERIAL', '2026-01-01', 4500,  'manual'),
('ITEM-004', 'LABOR',        '2026-01-01', 1200,  'manual'),
('ITEM-005', 'RAW_MATERIAL', '2026-01-01', 1800,  'manual'),
('ITEM-005', 'LABOR',        '2026-01-01', 800,   'manual');

-- =============================================
-- STEP 4: 주문 (fact_order)
-- =============================================

INSERT INTO core.fact_order (channel_order_id, line_no, order_date, channel_store_id, item_id, qty_ordered, source_system, load_batch_id, source_file_hash) VALUES
('ORD-2601-001', 1, '2026-01-05', 'CH-COUPANG', 'ITEM-001', 50,  'sample', 1, 'seed'),
('ORD-2601-002', 1, '2026-01-10', 'CH-NAVER',   'ITEM-002', 30,  'sample', 1, 'seed'),
('ORD-2601-003', 1, '2026-01-15', 'CH-SSG',     'ITEM-003', 40,  'sample', 1, 'seed'),
('ORD-2601-004', 1, '2026-01-20', 'CH-COUPANG', 'ITEM-004', 60,  'sample', 1, 'seed'),
('ORD-2601-005', 1, '2026-01-25', 'CH-NAVER',   'ITEM-005', 100, 'sample', 1, 'seed'),
('ORD-2602-001', 1, '2026-02-03', 'CH-COUPANG', 'ITEM-001', 55,  'sample', 1, 'seed'),
('ORD-2602-002', 1, '2026-02-08', 'CH-NAVER',   'ITEM-002', 35,  'sample', 1, 'seed'),
('ORD-2602-003', 1, '2026-02-12', 'CH-SSG',     'ITEM-003', 45,  'sample', 1, 'seed'),
('ORD-2602-004', 1, '2026-02-18', 'CH-COUPANG', 'ITEM-004', 70,  'sample', 1, 'seed'),
('ORD-2602-005', 1, '2026-02-22', 'CH-NAVER',   'ITEM-005', 120, 'sample', 1, 'seed'),
('ORD-2602-006', 1, '2026-02-25', 'CH-SSG',     'ITEM-001', 25,  'sample', 1, 'seed'),
('ORD-2603-001', 1, '2026-03-02', 'CH-COUPANG', 'ITEM-001', 60,  'sample', 1, 'seed'),
('ORD-2603-002', 1, '2026-03-05', 'CH-NAVER',   'ITEM-002', 40,  'sample', 1, 'seed'),
('ORD-2603-003', 1, '2026-03-07', 'CH-SSG',     'ITEM-003', 50,  'sample', 1, 'seed'),
('ORD-2603-004', 1, '2026-03-09', 'CH-COUPANG', 'ITEM-004', 80,  'sample', 1, 'seed'),
('ORD-2603-005', 1, '2026-03-10', 'CH-NAVER',   'ITEM-005', 150, 'sample', 1, 'seed'),
('ORD-2603-006', 1, '2026-03-11', 'CH-SSG',     'ITEM-001', 30,  'sample', 1, 'seed'),
('ORD-2603-007', 1, '2026-03-12', 'CH-COUPANG', 'ITEM-003', 35,  'sample', 1, 'seed');

-- =============================================
-- STEP 5: 출고 (fact_shipment)
-- =============================================

INSERT INTO core.fact_shipment (shipment_id, ship_date, warehouse_id, item_id, qty_shipped, lot_id, channel_order_id, channel_store_id, weight, source_system, load_batch_id, source_file_hash) VALUES
('SHP-2601-001', '2026-01-06', 'WH-INCHEON', 'ITEM-001', 50,  'LOT-A01', 'ORD-2601-001', 'CH-COUPANG', 7.5,  'sample', 1, 'seed'),
('SHP-2601-002', '2026-01-11', 'WH-INCHEON', 'ITEM-002', 30,  'LOT-B01', 'ORD-2601-002', 'CH-NAVER',   6.0,  'sample', 1, 'seed'),
('SHP-2601-003', '2026-01-16', 'WH-BUSAN',   'ITEM-003', 40,  'LOT-C01', 'ORD-2601-003', 'CH-SSG',     4.8,  'sample', 1, 'seed'),
('SHP-2601-004', '2026-01-21', 'WH-INCHEON', 'ITEM-004', 60,  'LOT-D01', 'ORD-2601-004', 'CH-COUPANG', 15.0, 'sample', 1, 'seed'),
('SHP-2601-005', '2026-01-26', 'WH-INCHEON', 'ITEM-005', 100, 'LOT-E01', 'ORD-2601-005', 'CH-NAVER',   5.0,  'sample', 1, 'seed'),
('SHP-2602-001', '2026-02-04', 'WH-INCHEON', 'ITEM-001', 55,  'LOT-A02', 'ORD-2602-001', 'CH-COUPANG', 8.25, 'sample', 1, 'seed'),
('SHP-2602-002', '2026-02-09', 'WH-INCHEON', 'ITEM-002', 35,  'LOT-B02', 'ORD-2602-002', 'CH-NAVER',   7.0,  'sample', 1, 'seed'),
('SHP-2602-003', '2026-02-13', 'WH-BUSAN',   'ITEM-003', 45,  'LOT-C02', 'ORD-2602-003', 'CH-SSG',     5.4,  'sample', 1, 'seed'),
('SHP-2602-004', '2026-02-19', 'WH-INCHEON', 'ITEM-004', 70,  'LOT-D02', 'ORD-2602-004', 'CH-COUPANG', 17.5, 'sample', 1, 'seed'),
('SHP-2602-005', '2026-02-23', 'WH-INCHEON', 'ITEM-005', 120, 'LOT-E02', 'ORD-2602-005', 'CH-NAVER',   6.0,  'sample', 1, 'seed'),
('SHP-2603-001', '2026-03-03', 'WH-INCHEON', 'ITEM-001', 60,  'LOT-A03', 'ORD-2603-001', 'CH-COUPANG', 9.0,  'sample', 1, 'seed'),
('SHP-2603-002', '2026-03-06', 'WH-INCHEON', 'ITEM-002', 40,  'LOT-B03', 'ORD-2603-002', 'CH-NAVER',   8.0,  'sample', 1, 'seed'),
('SHP-2603-003', '2026-03-08', 'WH-BUSAN',   'ITEM-003', 50,  'LOT-C03', 'ORD-2603-003', 'CH-SSG',     6.0,  'sample', 1, 'seed'),
('SHP-2603-004', '2026-03-10', 'WH-INCHEON', 'ITEM-004', 80,  'LOT-D03', 'ORD-2603-004', 'CH-COUPANG', 20.0, 'sample', 1, 'seed'),
('SHP-2603-005', '2026-03-11', 'WH-INCHEON', 'ITEM-005', 150, 'LOT-E03', 'ORD-2603-005', 'CH-NAVER',   7.5,  'sample', 1, 'seed');

-- =============================================
-- STEP 6: 반품 (fact_return)
-- =============================================

INSERT INTO core.fact_return (return_id, return_date, warehouse_id, item_id, qty_returned, lot_id, channel_order_id, reason, disposition, source_system, load_batch_id, source_file_hash) VALUES
('RET-2601-001', '2026-01-15', 'WH-INCHEON', 'ITEM-001', 3,  'LOT-A01', 'ORD-2601-001', '품질불량', '재입고',  'sample', 1, 'seed'),
('RET-2602-001', '2026-02-10', 'WH-INCHEON', 'ITEM-002', 2,  'LOT-B02', 'ORD-2602-002', '단순변심', '재입고',  'sample', 1, 'seed'),
('RET-2602-002', '2026-02-20', 'WH-BUSAN',   'ITEM-003', 5,  'LOT-C02', 'ORD-2602-003', '배송파손', '폐기',    'sample', 1, 'seed'),
('RET-2603-001', '2026-03-05', 'WH-INCHEON', 'ITEM-001', 4,  'LOT-A03', 'ORD-2603-001', '단순변심', '재입고',  'sample', 1, 'seed'),
('RET-2603-002', '2026-03-08', 'WH-INCHEON', 'ITEM-005', 10, 'LOT-E03', 'ORD-2603-005', '품질불량', '폐기',    'sample', 1, 'seed');

-- =============================================
-- STEP 7: 발주 + 입고 (fact_po, fact_receipt) — 리드타임 뷰용
-- =============================================

INSERT INTO core.fact_po (po_id, po_date, supplier_id, item_id, qty_ordered, eta_date, currency, source_system, load_batch_id, source_file_hash) VALUES
('PO-2601-001', '2026-01-02', 'SUP-COSMAX', 'ITEM-001', 200, '2026-01-16', 'KRW', 'sample', 1, 'seed'),
('PO-2601-002', '2026-01-05', 'SUP-KOLMAR', 'ITEM-002', 150, '2026-01-19', 'KRW', 'sample', 1, 'seed'),
('PO-2602-001', '2026-02-01', 'SUP-COSMAX', 'ITEM-003', 180, '2026-02-15', 'KRW', 'sample', 1, 'seed'),
('PO-2602-002', '2026-02-03', 'SUP-KOLMAR', 'ITEM-004', 250, '2026-02-17', 'KRW', 'sample', 1, 'seed'),
('PO-2603-001', '2026-03-01', 'SUP-COSMAX', 'ITEM-005', 500, '2026-03-15', 'KRW', 'sample', 1, 'seed'),
('PO-2603-002', '2026-03-03', 'SUP-COSMAX', 'ITEM-001', 200, '2026-03-17', 'KRW', 'sample', 1, 'seed'),
('PO-2603-003', '2026-03-05', 'SUP-KOLMAR', 'ITEM-003', 150, '2026-03-19', 'KRW', 'sample', 1, 'seed');

INSERT INTO core.fact_receipt (receipt_id, receipt_date, warehouse_id, item_id, qty_received, po_id, lot_id, expiry_date, source_system, load_batch_id, source_file_hash) VALUES
('RCV-2601-001', '2026-01-15', 'WH-INCHEON', 'ITEM-001', 200, 'PO-2601-001', 'LOT-A02', '2028-01-15', 'sample', 1, 'seed'),
('RCV-2601-002', '2026-01-20', 'WH-INCHEON', 'ITEM-002', 150, 'PO-2601-002', 'LOT-B02', '2027-07-20', 'sample', 1, 'seed'),
('RCV-2602-001', '2026-02-14', 'WH-BUSAN',   'ITEM-003', 180, 'PO-2602-001', 'LOT-C03', '2027-02-14', 'sample', 1, 'seed'),
('RCV-2602-002', '2026-02-18', 'WH-INCHEON', 'ITEM-004', 250, 'PO-2602-002', 'LOT-D03', '2028-02-18', 'sample', 1, 'seed'),
('RCV-2603-001', '2026-03-13', 'WH-INCHEON', 'ITEM-005', 500, 'PO-2603-001', 'LOT-E04', '2027-03-13', 'sample', 1, 'seed');

-- =============================================
-- STEP 8: 재고 스냅샷
-- =============================================

INSERT INTO core.fact_inventory_snapshot (snapshot_date, warehouse_id, item_id, lot_id, onhand_qty, expiry_date, qc_status, source_system, load_batch_id, source_file_hash) VALUES
('2026-03-13', 'WH-INCHEON', 'ITEM-001', 'LOT-A02', 180, '2028-01-15', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-001', 'LOT-A03', 56,  '2028-06-01', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-002', 'LOT-B02', 108, '2027-07-20', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-002', 'LOT-B03', 40,  '2028-01-01', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-BUSAN',   'ITEM-003', 'LOT-C02', 85,  '2027-02-14', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-BUSAN',   'ITEM-003', 'LOT-C03', 130, '2027-08-01', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-004', 'LOT-D02', 170, '2028-02-18', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-004', 'LOT-D03', 80,  '2028-08-01', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-005', 'LOT-E03', 340, '2027-03-13', 'PASS', 'sample', 1, 'seed'),
('2026-03-13', 'WH-INCHEON', 'ITEM-005', 'LOT-E04', 500, '2027-09-01', 'PASS', 'sample', 1, 'seed');

-- =============================================
-- STEP 9: 정산 (fact_settlement)
-- =============================================

INSERT INTO core.fact_settlement (settlement_id, line_no, period, channel_store_id, currency, item_id, gross_sales, discounts, fees, refunds, net_payout, source_system, load_batch_id, source_file_hash) VALUES
('STL-2601-CPG', 1, '2026-01', 'CH-COUPANG', 'KRW', 'ITEM-001', 1750000, 87500,  52500,  0,     1610000, 'sample', 1, 'seed'),
('STL-2601-CPG', 2, '2026-01', 'CH-COUPANG', 'KRW', 'ITEM-004', 1500000, 75000,  45000,  0,     1380000, 'sample', 1, 'seed'),
('STL-2601-NVR', 1, '2026-01', 'CH-NAVER',   'KRW', 'ITEM-002', 720000,  36000,  21600,  0,     662400,  'sample', 1, 'seed'),
('STL-2601-NVR', 2, '2026-01', 'CH-NAVER',   'KRW', 'ITEM-005', 500000,  25000,  15000,  0,     460000,  'sample', 1, 'seed'),
('STL-2601-SSG', 1, '2026-01', 'CH-SSG',     'KRW', 'ITEM-003', 1120000, 56000,  33600,  0,     1030400, 'sample', 1, 'seed'),
('STL-2602-CPG', 1, '2026-02', 'CH-COUPANG', 'KRW', 'ITEM-001', 1925000, 96250,  57750,  105000, 1666000, 'sample', 1, 'seed'),
('STL-2602-NVR', 1, '2026-02', 'CH-NAVER',   'KRW', 'ITEM-002', 840000,  42000,  25200,  48000,  724800,  'sample', 1, 'seed'),
('STL-2602-SSG', 1, '2026-02', 'CH-SSG',     'KRW', 'ITEM-003', 1260000, 63000,  37800,  140000, 1019200, 'sample', 1, 'seed'),
('STL-2603-CPG', 1, '2026-03', 'CH-COUPANG', 'KRW', 'ITEM-001', 2100000, 105000, 63000,  0,     1932000, 'sample', 1, 'seed'),
('STL-2603-CPG', 2, '2026-03', 'CH-COUPANG', 'KRW', 'ITEM-004', 2000000, 100000, 60000,  0,     1840000, 'sample', 1, 'seed'),
('STL-2603-NVR', 1, '2026-03', 'CH-NAVER',   'KRW', 'ITEM-002', 960000,  48000,  28800,  0,     883200,  'sample', 1, 'seed'),
('STL-2603-NVR', 2, '2026-03', 'CH-NAVER',   'KRW', 'ITEM-005', 750000,  37500,  22500,  0,     690000,  'sample', 1, 'seed'),
('STL-2603-SSG', 1, '2026-03', 'CH-SSG',     'KRW', 'ITEM-003', 1400000, 70000,  42000,  0,     1288000, 'sample', 1, 'seed');

-- =============================================
-- STEP 10: 비용 청구 (fact_charge_actual)
-- =============================================

INSERT INTO core.fact_charge_actual (invoice_no, invoice_line_no, charge_type, amount, currency, period, vendor_partner_id, source_system, load_batch_id, source_file_hash) VALUES
('INV-2603-001', 1, 'LAST_MILE_PARCEL',  450000,  'KRW', '2026-03', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2603-001', 2, 'DOMESTIC_TRUCKING',  280000,  'KRW', '2026-03', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2603-002', 1, '3PL_STORAGE_FEE',   350000,  'KRW', '2026-03', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2603-002', 2, '3PL_PICK_PACK_FEE', 180000,  'KRW', '2026-03', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2603-003', 1, 'PLATFORM_FEE',      216300,  'KRW', '2026-03', NULL,         'sample', 1, 'seed'),
('INV-2603-003', 2, 'PG_FEE',            99450,   'KRW', '2026-03', NULL,         'sample', 1, 'seed'),
('INV-2603-004', 1, 'MARKETING_SPEND',   500000,  'KRW', '2026-03', NULL,         'sample', 1, 'seed'),
('INV-2602-001', 1, 'LAST_MILE_PARCEL',  380000,  'KRW', '2026-02', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2602-001', 2, '3PL_STORAGE_FEE',   300000,  'KRW', '2026-02', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2602-002', 1, 'PLATFORM_FEE',      170000,  'KRW', '2026-02', NULL,         'sample', 1, 'seed'),
('INV-2602-002', 2, 'MARKETING_SPEND',   400000,  'KRW', '2026-02', NULL,         'sample', 1, 'seed'),
('INV-2601-001', 1, 'LAST_MILE_PARCEL',  320000,  'KRW', '2026-01', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2601-001', 2, '3PL_STORAGE_FEE',   250000,  'KRW', '2026-01', '3PL-CJ',    'sample', 1, 'seed'),
('INV-2601-002', 1, 'PLATFORM_FEE',      148000,  'KRW', '2026-01', NULL,         'sample', 1, 'seed');

-- =============================================
-- STEP 11: SCM 마트 데이터
-- =============================================

-- 재고현황
INSERT INTO mart.mart_inventory_onhand (snapshot_date, warehouse_id, item_id, lot_id, onhand_qty, sellable_qty, blocked_qty, expired_qty, final_expiry_date, expiry_bucket, fefo_rank) VALUES
('2026-03-13', 'WH-INCHEON', 'ITEM-001', 'LOT-A02', 180, 180, 0, 0, '2028-01-15', '365d+',  1),
('2026-03-13', 'WH-INCHEON', 'ITEM-001', 'LOT-A03', 56,  56,  0, 0, '2028-06-01', '365d+',  2),
('2026-03-13', 'WH-INCHEON', 'ITEM-002', 'LOT-B02', 108, 108, 0, 0, '2027-07-20', '365d+',  1),
('2026-03-13', 'WH-INCHEON', 'ITEM-002', 'LOT-B03', 40,  40,  0, 0, '2028-01-01', '365d+',  2),
('2026-03-13', 'WH-BUSAN',   'ITEM-003', 'LOT-C02', 85,  85,  0, 0, '2027-02-14', '330d+',  1),
('2026-03-13', 'WH-BUSAN',   'ITEM-003', 'LOT-C03', 130, 130, 0, 0, '2027-08-01', '365d+',  2),
('2026-03-13', 'WH-INCHEON', 'ITEM-004', 'LOT-D02', 170, 170, 0, 0, '2028-02-18', '365d+',  1),
('2026-03-13', 'WH-INCHEON', 'ITEM-004', 'LOT-D03', 80,  80,  0, 0, '2028-08-01', '365d+',  2),
('2026-03-13', 'WH-INCHEON', 'ITEM-005', 'LOT-E03', 340, 290, 0, 50,'2027-03-13', '365d+',  1),
('2026-03-13', 'WH-INCHEON', 'ITEM-005', 'LOT-E04', 500, 500, 0, 0, '2027-09-01', '365d+',  2);

-- 품절위험
INSERT INTO mart.mart_stockout_risk (item_id, warehouse_id, sellable_qty, avg_daily_demand, days_of_cover, threshold_days, risk_flag, as_of_date) VALUES
('ITEM-001', 'WH-INCHEON', 236, 3.0, 78.7, 10, false, '2026-03-13'),
('ITEM-002', 'WH-INCHEON', 148, 1.8, 82.2, 10, false, '2026-03-13'),
('ITEM-003', 'WH-BUSAN',   215, 2.5, 86.0, 10, false, '2026-03-13'),
('ITEM-004', 'WH-INCHEON', 250, 3.5, 71.4, 10, false, '2026-03-13'),
('ITEM-005', 'WH-INCHEON', 790, 6.0, 131.7,10, false, '2026-03-13');

-- 과재고
INSERT INTO mart.mart_overstock (item_id, warehouse_id, item_type, onhand_qty, avg_daily_demand, days_on_hand, doh_threshold, overstock_flag, overstock_qty, as_of_date) VALUES
('ITEM-005', 'WH-INCHEON', 'FG', 840, 6.0, 140.0, 90, true,  300, '2026-03-13'),
('ITEM-004', 'WH-INCHEON', 'FG', 250, 3.5, 71.4,  90, false, 0,   '2026-03-13'),
('ITEM-001', 'WH-INCHEON', 'FG', 236, 3.0, 78.7,  90, false, 0,   '2026-03-13'),
('ITEM-003', 'WH-BUSAN',   'FG', 215, 2.5, 86.0,  90, false, 0,   '2026-03-13'),
('ITEM-002', 'WH-INCHEON', 'FG', 148, 1.8, 82.2,  90, false, 0,   '2026-03-13');

-- 유통기한위험
INSERT INTO mart.mart_expiry_risk (item_id, warehouse_id, lot_id, onhand_qty, final_expiry_date, days_to_expiry, expiry_bucket, risk_value_krw, as_of_date) VALUES
('ITEM-005', 'WH-INCHEON', 'LOT-E03', 340, '2027-03-13', 365, '365d',   884000, '2026-03-13'),
('ITEM-003', 'WH-BUSAN',   'LOT-C02', 85,  '2027-02-14', 338, '330d+',  731000, '2026-03-13'),
('ITEM-002', 'WH-INCHEON', 'LOT-B02', 108, '2027-07-20', 494, '365d+',  723600, '2026-03-13'),
('ITEM-001', 'WH-INCHEON', 'LOT-A02', 180, '2028-01-15', 673, '365d+',  0,      '2026-03-13'),
('ITEM-004', 'WH-INCHEON', 'LOT-D02', 170, '2028-02-18', 707, '365d+',  0,      '2026-03-13');

-- FEFO 피킹리스트
INSERT INTO mart.mart_fefo_pick_list (warehouse_id, item_id, lot_id, onhand_qty, sellable_qty, final_expiry_date, fefo_rank, snapshot_date) VALUES
('WH-INCHEON', 'ITEM-001', 'LOT-A02', 180, 180, '2028-01-15', 1, '2026-03-13'),
('WH-INCHEON', 'ITEM-001', 'LOT-A03', 56,  56,  '2028-06-01', 2, '2026-03-13'),
('WH-INCHEON', 'ITEM-002', 'LOT-B02', 108, 108, '2027-07-20', 1, '2026-03-13'),
('WH-INCHEON', 'ITEM-002', 'LOT-B03', 40,  40,  '2028-01-01', 2, '2026-03-13'),
('WH-BUSAN',   'ITEM-003', 'LOT-C02', 85,  85,  '2027-02-14', 1, '2026-03-13'),
('WH-BUSAN',   'ITEM-003', 'LOT-C03', 130, 130, '2027-08-01', 2, '2026-03-13'),
('WH-INCHEON', 'ITEM-004', 'LOT-D02', 170, 170, '2028-02-18', 1, '2026-03-13'),
('WH-INCHEON', 'ITEM-005', 'LOT-E03', 340, 290, '2027-03-13', 1, '2026-03-13'),
('WH-INCHEON', 'ITEM-005', 'LOT-E04', 500, 500, '2027-09-01', 2, '2026-03-13');

-- 발주현황
INSERT INTO mart.mart_open_po (po_id, item_id, supplier_id, po_date, eta_date, first_receipt_date, qty_ordered, qty_received, qty_open, delay_days, po_lead_days, eta_vs_actual_days, period) VALUES
('PO-2603-001', 'ITEM-005', 'SUP-COSMAX', '2026-03-01', '2026-03-15', '2026-03-13', 500, 500, 0,   0,  12, -2, '2026-03'),
('PO-2603-002', 'ITEM-001', 'SUP-COSMAX', '2026-03-03', '2026-03-17', NULL,         200, 0,   200, 0,  NULL, NULL, '2026-03'),
('PO-2603-003', 'ITEM-003', 'SUP-KOLMAR', '2026-03-05', '2026-03-19', NULL,         150, 0,   150, 0,  NULL, NULL, '2026-03');

-- 납기성과
INSERT INTO mart.mart_service_level (week_start, channel_store_id, total_orders, shipped_on_time, service_level_pct) VALUES
('2026-02-24', 'CH-COUPANG', 45, 43, 95.6),
('2026-02-24', 'CH-NAVER',   32, 30, 93.8),
('2026-02-24', 'CH-SSG',     28, 27, 96.4),
('2026-03-03', 'CH-COUPANG', 52, 50, 96.2),
('2026-03-03', 'CH-NAVER',   38, 35, 92.1),
('2026-03-03', 'CH-SSG',     30, 29, 96.7),
('2026-03-10', 'CH-COUPANG', 58, 56, 96.6),
('2026-03-10', 'CH-NAVER',   42, 40, 95.2),
('2026-03-10', 'CH-SSG',     35, 34, 97.1);

-- 출고일별
INSERT INTO mart.mart_shipment_daily (ship_date, warehouse_id, shipment_count, qty_shipped, weight, volume_cbm, unique_orders, unique_items) VALUES
('2026-03-03', 'WH-INCHEON', 2, 60,  9.0, 0.018, 1, 1),
('2026-03-06', 'WH-INCHEON', 2, 40,  8.0, 0.016, 1, 1),
('2026-03-08', 'WH-BUSAN',   2, 50,  6.0, 0.010, 1, 1),
('2026-03-10', 'WH-INCHEON', 2, 80, 20.0, 0.040, 1, 1),
('2026-03-11', 'WH-INCHEON', 2, 150, 7.5, 0.015, 1, 1),
('2026-03-12', 'WH-INCHEON', 1, 35,  4.2, 0.007, 1, 1);

-- 출고성과
INSERT INTO mart.mart_shipment_performance (period, warehouse_id, channel_store_id, total_shipments, total_qty_shipped, total_weight, total_volume_cbm, avg_qty_per_shipment, avg_lead_days, on_time_count, on_time_pct) VALUES
('2026-03', 'WH-INCHEON', 'CH-COUPANG', 3, 200, 49.0, 0.098, 66.7, 1.2, 3, 100.0),
('2026-03', 'WH-INCHEON', 'CH-NAVER',   2, 190, 15.5, 0.031, 95.0, 1.0, 2, 100.0),
('2026-03', 'WH-BUSAN',   'CH-SSG',     1, 50,  6.0,  0.010, 50.0, 1.5, 1, 100.0);

-- 반품분석
INSERT INTO mart.mart_return_analysis (period, item_id, warehouse_id, channel_store_id, reason, disposition, return_count, qty_returned, qty_shipped, return_rate) VALUES
('2026-03', 'ITEM-001', 'WH-INCHEON', 'CH-COUPANG', '단순변심', '재입고', 2, 4,  60, 6.67),
('2026-03', 'ITEM-005', 'WH-INCHEON', 'CH-NAVER',   '품질불량', '폐기',   1, 10, 150, 6.67),
('2026-02', 'ITEM-002', 'WH-INCHEON', 'CH-NAVER',   '단순변심', '재입고', 1, 2,  35, 5.71),
('2026-02', 'ITEM-003', 'WH-BUSAN',   'CH-SSG',     '배송파손', '폐기',   1, 5,  45, 11.11);

-- 반품일별
INSERT INTO mart.mart_return_daily (return_date, warehouse_id, return_count, qty_returned, unique_orders, unique_items, top_reason) VALUES
('2026-03-05', 'WH-INCHEON', 1, 4,  1, 1, '단순변심'),
('2026-03-08', 'WH-INCHEON', 1, 10, 1, 1, '품질불량');

-- =============================================
-- STEP 12: P&L 마트 데이터
-- =============================================

-- 매출
INSERT INTO mart.mart_pnl_revenue (period, item_id, channel_store_id, country, gross_sales_krw, discounts_krw, refunds_krw, net_revenue_krw, source, coverage_flag) VALUES
('2026-01', 'ITEM-001', 'CH-COUPANG', 'KR', 1750000, 87500,  0,      1662500, 'settlement', 'ACTUAL'),
('2026-01', 'ITEM-004', 'CH-COUPANG', 'KR', 1500000, 75000,  0,      1425000, 'settlement', 'ACTUAL'),
('2026-01', 'ITEM-002', 'CH-NAVER',   'KR', 720000,  36000,  0,      684000,  'settlement', 'ACTUAL'),
('2026-01', 'ITEM-005', 'CH-NAVER',   'KR', 500000,  25000,  0,      475000,  'settlement', 'ACTUAL'),
('2026-01', 'ITEM-003', 'CH-SSG',     'KR', 1120000, 56000,  0,      1064000, 'settlement', 'ACTUAL'),
('2026-02', 'ITEM-001', 'CH-COUPANG', 'KR', 1925000, 96250,  105000, 1723750, 'settlement', 'ACTUAL'),
('2026-02', 'ITEM-002', 'CH-NAVER',   'KR', 840000,  42000,  48000,  750000,  'settlement', 'ACTUAL'),
('2026-02', 'ITEM-003', 'CH-SSG',     'KR', 1260000, 63000,  140000, 1057000, 'settlement', 'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 2100000, 105000, 0,      1995000, 'settlement', 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 2000000, 100000, 0,      1900000, 'settlement', 'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 960000,  48000,  0,      912000,  'settlement', 'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 750000,  37500,  0,      712500,  'settlement', 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 1400000, 70000,  0,      1330000, 'settlement', 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 980000,  49000,  0,      931000,  'settlement', 'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 840000,  42000,  0,      798000,  'settlement', 'PARTIAL');

-- 매출원가
INSERT INTO mart.mart_pnl_cogs (period, item_id, channel_store_id, country, qty_shipped, qty_returned, qty_net, unit_cost_krw, cogs_krw, coverage_flag) VALUES
('2026-01', 'ITEM-001', 'CH-COUPANG', 'KR', 50,  3,  47, 10500, 493500,  'ACTUAL'),
('2026-01', 'ITEM-004', 'CH-COUPANG', 'KR', 60,  0,  60, 5700,  342000,  'ACTUAL'),
('2026-01', 'ITEM-002', 'CH-NAVER',   'KR', 30,  0,  30, 6700,  201000,  'ACTUAL'),
('2026-01', 'ITEM-005', 'CH-NAVER',   'KR', 100, 0,  100,2600,  260000,  'ACTUAL'),
('2026-01', 'ITEM-003', 'CH-SSG',     'KR', 40,  0,  40, 8600,  344000,  'ACTUAL'),
('2026-02', 'ITEM-001', 'CH-COUPANG', 'KR', 55,  0,  55, 10500, 577500,  'ACTUAL'),
('2026-02', 'ITEM-002', 'CH-NAVER',   'KR', 35,  2,  33, 6700,  221100,  'ACTUAL'),
('2026-02', 'ITEM-003', 'CH-SSG',     'KR', 45,  5,  40, 8600,  344000,  'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 60,  4,  56, 10500, 588000,  'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 80,  0,  80, 5700,  456000,  'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 40,  0,  40, 6700,  268000,  'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 150, 10, 140,2600,  364000,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 50,  0,  50, 8600,  430000,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 35,  0,  35, 8600,  301000,  'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 30,  0,  30, 10500, 315000,  'PARTIAL');

-- 매출총이익
INSERT INTO mart.mart_pnl_gross_margin (period, item_id, channel_store_id, country, net_revenue_krw, cogs_krw, gross_margin_krw, gross_margin_pct, coverage_flag) VALUES
('2026-01', 'ITEM-001', 'CH-COUPANG', 'KR', 1662500, 493500, 1169000, 0.703, 'ACTUAL'),
('2026-01', 'ITEM-004', 'CH-COUPANG', 'KR', 1425000, 342000, 1083000, 0.760, 'ACTUAL'),
('2026-01', 'ITEM-002', 'CH-NAVER',   'KR', 684000,  201000, 483000,  0.706, 'ACTUAL'),
('2026-01', 'ITEM-005', 'CH-NAVER',   'KR', 475000,  260000, 215000,  0.453, 'ACTUAL'),
('2026-01', 'ITEM-003', 'CH-SSG',     'KR', 1064000, 344000, 720000,  0.677, 'ACTUAL'),
('2026-02', 'ITEM-001', 'CH-COUPANG', 'KR', 1723750, 577500, 1146250, 0.665, 'ACTUAL'),
('2026-02', 'ITEM-002', 'CH-NAVER',   'KR', 750000,  221100, 528900,  0.705, 'ACTUAL'),
('2026-02', 'ITEM-003', 'CH-SSG',     'KR', 1057000, 344000, 713000,  0.674, 'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 1995000, 588000, 1407000, 0.705, 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 1900000, 456000, 1444000, 0.760, 'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 912000,  268000, 644000,  0.706, 'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 712500,  364000, 348500,  0.489, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 1330000, 430000, 900000,  0.677, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 931000,  301000, 630000,  0.677, 'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 798000,  315000, 483000,  0.605, 'PARTIAL');

-- 변동비
INSERT INTO mart.mart_pnl_variable_cost (period, item_id, channel_store_id, country, charge_domain, charge_type, allocated_amount_krw, coverage_flag) VALUES
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  95000,  'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', '3pl_billing',         '3PL_STORAGE_FEE',   45000,  'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 'platform_fee',        'PLATFORM_FEE',      59850,  'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  110000, 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', '3pl_billing',         '3PL_STORAGE_FEE',   55000,  'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 'platform_fee',        'PLATFORM_FEE',      57000,  'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  65000,  'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 'platform_fee',        'PLATFORM_FEE',      27360,  'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  85000,  'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 'platform_fee',        'PLATFORM_FEE',      21375,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  75000,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 'platform_fee',        'PLATFORM_FEE',      39900,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  52000,  'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 'logistics_transport', 'LAST_MILE_PARCEL',  42000,  'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 'marketing',           'MARKETING_SPEND',   150000, 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 'marketing',           'MARKETING_SPEND',   120000, 'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 'marketing',           'MARKETING_SPEND',   80000,  'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 'marketing',           'MARKETING_SPEND',   60000,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 'marketing',           'MARKETING_SPEND',   55000,  'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 'marketing',           'MARKETING_SPEND',   35000,  'PARTIAL');

-- 공헌이익
INSERT INTO mart.mart_pnl_contribution (period, item_id, channel_store_id, country, gross_margin_krw, total_variable_cost_krw, contribution_krw, contribution_pct, coverage_flag) VALUES
('2026-01', 'ITEM-001', 'CH-COUPANG', 'KR', 1169000, 280000, 889000,  0.535, 'ACTUAL'),
('2026-01', 'ITEM-004', 'CH-COUPANG', 'KR', 1083000, 220000, 863000,  0.606, 'ACTUAL'),
('2026-01', 'ITEM-002', 'CH-NAVER',   'KR', 483000,  150000, 333000,  0.487, 'ACTUAL'),
('2026-01', 'ITEM-005', 'CH-NAVER',   'KR', 215000,  100000, 115000,  0.242, 'ACTUAL'),
('2026-01', 'ITEM-003', 'CH-SSG',     'KR', 720000,  200000, 520000,  0.489, 'ACTUAL'),
('2026-02', 'ITEM-001', 'CH-COUPANG', 'KR', 1146250, 300000, 846250,  0.491, 'ACTUAL'),
('2026-02', 'ITEM-002', 'CH-NAVER',   'KR', 528900,  160000, 368900,  0.492, 'ACTUAL'),
('2026-02', 'ITEM-003', 'CH-SSG',     'KR', 713000,  210000, 503000,  0.476, 'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 1407000, 349850, 1057150, 0.530, 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 1444000, 342000, 1102000, 0.580, 'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 644000,  172360, 471640,  0.517, 'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 348500,  166375, 182125,  0.256, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 900000,  169900, 730100,  0.549, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 630000,  87000,  543000,  0.583, 'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 483000,  42000,  441000,  0.553, 'PARTIAL');

-- 영업이익
INSERT INTO mart.mart_pnl_operating_profit (period, item_id, channel_store_id, country, contribution_krw, fixed_cost_krw, operating_profit_krw, operating_profit_pct, coverage_flag) VALUES
('2026-01', 'ITEM-001', 'CH-COUPANG', 'KR', 889000,  100000, 789000,  0.475, 'ACTUAL'),
('2026-01', 'ITEM-004', 'CH-COUPANG', 'KR', 863000,  100000, 763000,  0.535, 'ACTUAL'),
('2026-01', 'ITEM-002', 'CH-NAVER',   'KR', 333000,  80000,  253000,  0.370, 'ACTUAL'),
('2026-01', 'ITEM-005', 'CH-NAVER',   'KR', 115000,  50000,  65000,   0.137, 'ACTUAL'),
('2026-01', 'ITEM-003', 'CH-SSG',     'KR', 520000,  90000,  430000,  0.404, 'ACTUAL'),
('2026-02', 'ITEM-001', 'CH-COUPANG', 'KR', 846250,  100000, 746250,  0.433, 'ACTUAL'),
('2026-02', 'ITEM-002', 'CH-NAVER',   'KR', 368900,  80000,  288900,  0.385, 'ACTUAL'),
('2026-02', 'ITEM-003', 'CH-SSG',     'KR', 503000,  90000,  413000,  0.391, 'ACTUAL'),
('2026-03', 'ITEM-001', 'CH-COUPANG', 'KR', 1057150, 100000, 957150,  0.480, 'ACTUAL'),
('2026-03', 'ITEM-004', 'CH-COUPANG', 'KR', 1102000, 100000, 1002000, 0.527, 'ACTUAL'),
('2026-03', 'ITEM-002', 'CH-NAVER',   'KR', 471640,  80000,  391640,  0.430, 'ACTUAL'),
('2026-03', 'ITEM-005', 'CH-NAVER',   'KR', 182125,  50000,  132125,  0.185, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-SSG',     'KR', 730100,  90000,  640100,  0.481, 'ACTUAL'),
('2026-03', 'ITEM-003', 'CH-COUPANG', 'KR', 543000,  90000,  453000,  0.487, 'PARTIAL'),
('2026-03', 'ITEM-001', 'CH-SSG',     'KR', 441000,  80000,  361000,  0.452, 'PARTIAL');

-- 손익폭포
INSERT INTO mart.mart_pnl_waterfall_summary (period, metric_name, metric_order, amount_krw) VALUES
('2026-03', 'net_revenue',          1, 8578500),
('2026-03', 'cogs',                 2, -2722000),
('2026-03', 'gross_margin',         3, 5856500),
('2026-03', 'variable_cost',        4, -1329485),
('2026-03', 'contribution',         5, 4527015),
('2026-03', 'fixed_cost',           6, -590000),
('2026-03', 'operating_profit',     7, 3937015),
('2026-02', 'net_revenue',          1, 3530750),
('2026-02', 'cogs',                 2, -1142600),
('2026-02', 'gross_margin',         3, 2388150),
('2026-02', 'variable_cost',        4, -670000),
('2026-02', 'contribution',         5, 1718150),
('2026-02', 'fixed_cost',           6, -270000),
('2026-02', 'operating_profit',     7, 1448150),
('2026-01', 'net_revenue',          1, 5310500),
('2026-01', 'cogs',                 2, -1640500),
('2026-01', 'gross_margin',         3, 3670000),
('2026-01', 'variable_cost',        4, -950000),
('2026-01', 'contribution',         5, 2720000),
('2026-01', 'fixed_cost',           6, -420000),
('2026-01', 'operating_profit',     7, 2300000);

-- =============================================
-- STEP 13: 비용배분
-- =============================================

INSERT INTO mart.mart_charge_allocated (period, charge_type, charge_domain, cost_stage, invoice_no, invoice_line_no, item_id, warehouse_id, channel_store_id, lot_id, allocation_basis, basis_value, allocated_amount, allocated_amount_krw, currency, capitalizable_flag) VALUES
('2026-03', 'LAST_MILE_PARCEL',  'logistics_transport', 'outbound', 'INV-2603-001', 1, 'ITEM-001', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'order_count', 60,  95000,  95000,  'KRW', false),
('2026-03', 'LAST_MILE_PARCEL',  'logistics_transport', 'outbound', 'INV-2603-001', 1, 'ITEM-004', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'order_count', 80,  110000, 110000, 'KRW', false),
('2026-03', 'LAST_MILE_PARCEL',  'logistics_transport', 'outbound', 'INV-2603-001', 1, 'ITEM-002', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'order_count', 40,  65000,  65000,  'KRW', false),
('2026-03', 'LAST_MILE_PARCEL',  'logistics_transport', 'outbound', 'INV-2603-001', 1, 'ITEM-005', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'order_count', 150, 85000,  85000,  'KRW', false),
('2026-03', 'LAST_MILE_PARCEL',  'logistics_transport', 'outbound', 'INV-2603-001', 1, 'ITEM-003', 'WH-BUSAN',   'CH-SSG',     '__NONE__', 'order_count', 50,  75000,  75000,  'KRW', false),
('2026-03', '3PL_STORAGE_FEE',   '3pl_billing',         'storage',  'INV-2603-002', 1, 'ITEM-001', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'onhand_cbm_days', 5.4, 45000, 45000, 'KRW', false),
('2026-03', '3PL_STORAGE_FEE',   '3pl_billing',         'storage',  'INV-2603-002', 1, 'ITEM-004', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'onhand_cbm_days', 7.5, 55000, 55000, 'KRW', false),
('2026-03', 'PLATFORM_FEE',      'platform_fee',        'period',   'INV-2603-003', 1, 'ITEM-001', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'revenue', 1995000, 59850, 59850, 'KRW', false),
('2026-03', 'PLATFORM_FEE',      'platform_fee',        'period',   'INV-2603-003', 1, 'ITEM-004', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'revenue', 1900000, 57000, 57000, 'KRW', false),
('2026-03', 'PLATFORM_FEE',      'platform_fee',        'period',   'INV-2603-003', 1, 'ITEM-002', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'revenue', 912000,  27360, 27360, 'KRW', false),
('2026-03', 'PLATFORM_FEE',      'platform_fee',        'period',   'INV-2603-003', 1, 'ITEM-005', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'revenue', 712500,  21375, 21375, 'KRW', false),
('2026-03', 'PLATFORM_FEE',      'platform_fee',        'period',   'INV-2603-003', 1, 'ITEM-003', 'WH-BUSAN',   'CH-SSG',     '__NONE__', 'revenue', 1330000, 39900, 39900, 'KRW', false),
('2026-03', 'MARKETING_SPEND',   'marketing',           'period',   'INV-2603-004', 1, 'ITEM-001', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'revenue', 1995000, 150000,150000,'KRW', false),
('2026-03', 'MARKETING_SPEND',   'marketing',           'period',   'INV-2603-004', 1, 'ITEM-004', 'WH-INCHEON', 'CH-COUPANG', '__NONE__', 'revenue', 1900000, 120000,120000,'KRW', false),
('2026-03', 'MARKETING_SPEND',   'marketing',           'period',   'INV-2603-004', 1, 'ITEM-002', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'revenue', 912000,  80000, 80000, 'KRW', false),
('2026-03', 'MARKETING_SPEND',   'marketing',           'period',   'INV-2603-004', 1, 'ITEM-005', 'WH-INCHEON', 'CH-NAVER',   '__NONE__', 'revenue', 712500,  60000, 60000, 'KRW', false),
('2026-03', 'MARKETING_SPEND',   'marketing',           'period',   'INV-2603-004', 1, 'ITEM-003', 'WH-BUSAN',   'CH-SSG',     '__NONE__', 'revenue', 1330000, 55000, 55000, 'KRW', false);

-- =============================================
-- STEP 14: 대사검증
-- =============================================

-- 정산 vs 추정
INSERT INTO mart.mart_reco_settlement_vs_estimated (period, channel_store_id, item_id, settlement_revenue_krw, estimated_revenue_krw, delta_krw, variance_pct) VALUES
('2026-03', 'CH-COUPANG', 'ITEM-001', 1932000, 1995000, -63000,  -3.16),
('2026-03', 'CH-COUPANG', 'ITEM-004', 1840000, 1900000, -60000,  -3.16),
('2026-03', 'CH-NAVER',   'ITEM-002', 883200,  912000,  -28800,  -3.16),
('2026-03', 'CH-NAVER',   'ITEM-005', 690000,  712500,  -22500,  -3.16),
('2026-03', 'CH-SSG',     'ITEM-003', 1288000, 1330000, -42000,  -3.16),
('2026-02', 'CH-COUPANG', 'ITEM-001', 1666000, 1723750, -57750,  -3.35),
('2026-02', 'CH-NAVER',   'ITEM-002', 724800,  750000,  -25200,  -3.36),
('2026-02', 'CH-SSG',     'ITEM-003', 1019200, 1057000, -37800,  -3.58);

-- 배분 보존 (인보이스 합계 vs 배분 합계)
INSERT INTO mart.mart_reco_charges_invoice_vs_allocated (period, charge_type, invoice_total, allocated_total, delta, tied) VALUES
('2026-03', 'LAST_MILE_PARCEL',  450000, 430000, 20000, false),
('2026-03', '3PL_STORAGE_FEE',   350000, 350000, 0,     true),
('2026-03', 'PLATFORM_FEE',      216300, 205485, 10815, false),
('2026-03', 'MARKETING_SPEND',   500000, 465000, 35000, false),
('2026-02', 'LAST_MILE_PARCEL',  380000, 380000, 0,     true),
('2026-02', '3PL_STORAGE_FEE',   300000, 300000, 0,     true),
('2026-02', 'PLATFORM_FEE',      170000, 170000, 0,     true);

-- OMS vs WMS
INSERT INTO mart.mart_reco_oms_vs_wms (period, item_id, channel_store_id, oms_qty_ordered, wms_qty_shipped, delta, fulfillment_rate) VALUES
('2026-03', 'ITEM-001', 'CH-COUPANG', 60,  60,  0,  100.0),
('2026-03', 'ITEM-004', 'CH-COUPANG', 80,  80,  0,  100.0),
('2026-03', 'ITEM-002', 'CH-NAVER',   40,  40,  0,  100.0),
('2026-03', 'ITEM-005', 'CH-NAVER',   150, 150, 0,  100.0),
('2026-03', 'ITEM-003', 'CH-SSG',     50,  50,  0,  100.0),
('2026-03', 'ITEM-003', 'CH-COUPANG', 35,  35,  0,  100.0),
('2026-03', 'ITEM-001', 'CH-SSG',     30,  30,  0,  100.0);

-- ERP vs WMS 입고
INSERT INTO mart.mart_reco_erp_gr_vs_wms_receipt (period, item_id, po_id, erp_qty, wms_qty, delta) VALUES
('2026-03', 'ITEM-005', 'PO-2603-001', 500, 500, 0),
('2026-01', 'ITEM-001', 'PO-2601-001', 200, 200, 0),
('2026-01', 'ITEM-002', 'PO-2601-002', 150, 150, 0),
('2026-02', 'ITEM-003', 'PO-2602-001', 180, 180, 0),
('2026-02', 'ITEM-004', 'PO-2602-002', 250, 250, 0);

-- 재고 이동 대사
INSERT INTO mart.mart_reco_inventory_movement (snapshot_date, warehouse_id, item_id, prev_onhand, receipts, shipments, returns, adjustments, expected_onhand, actual_onhand, delta, delta_ratio, severity) VALUES
('2026-03-13', 'WH-INCHEON', 'ITEM-001', 200, 0,  60,  4,   0, 144, 236, 92,  0.639, 'WARN'),
('2026-03-13', 'WH-INCHEON', 'ITEM-002', 150, 0,  40,  0,   0, 110, 148, 38,  0.345, 'WARN'),
('2026-03-13', 'WH-BUSAN',   'ITEM-003', 180, 0,  50,  0,   0, 130, 215, 85,  0.654, 'WARN'),
('2026-03-13', 'WH-INCHEON', 'ITEM-004', 250, 0,  80,  0,   0, 170, 250, 80,  0.471, 'WARN'),
('2026-03-13', 'WH-INCHEON', 'ITEM-005', 400, 500,150, 10,  0, 760, 840, 80,  0.105, 'OK');

-- =============================================
-- STEP 15: 병목지표
-- =============================================

INSERT INTO mart.mart_constraint_signals (signal_id, domain, metric_name, current_value, threshold_value, severity, entity_type, entity_id, period, detected_at) VALUES
('SIG-001', 'warehouse_3pl',     'storage_utilization',    0.92, 0.85, 'HIGH',     'warehouse', 'WH-INCHEON', '2026-03', '2026-03-13 09:00:00'),
('SIG-002', 'demand_channel',    'return_rate_spike_ratio',1.8,  1.5,  'WARN',     'channel',   'CH-NAVER',   '2026-03', '2026-03-13 09:00:00'),
('SIG-003', 'supply',            'late_po_ratio',          0.25, 0.2,  'HIGH',     'supplier',  'SUP-KOLMAR', '2026-03', '2026-03-13 09:00:00'),
('SIG-004', 'logistics_customs', 'dwell_time_days',        3.2,  5.0,  'WARN',     'warehouse', 'WH-BUSAN',   '2026-03', '2026-03-13 09:00:00');

INSERT INTO mart.mart_constraint_root_cause (signal_id, root_cause, contributing_factors, domain, period) VALUES
('SIG-001', '마스크팩 대량 입고로 창고 용량 초과', 'PO-2603-001 500개 일시 입고', 'warehouse_3pl', '2026-03'),
('SIG-002', '네이버 품질불량 반품 급증', 'ITEM-005 마스크팩 10건 반품', 'demand_channel', '2026-03'),
('SIG-003', '한국콜마 납기 지연 반복', 'PO-2603-003 미입고', 'supply', '2026-03');

INSERT INTO mart.mart_constraint_action_plan (signal_id, action, priority, responsible, domain, period) VALUES
('SIG-001', '임시 보관 공간 확보 또는 출고 가속화', 'HIGH', '물류팀', 'warehouse_3pl', '2026-03'),
('SIG-002', '품질검사 기준 강화 및 공급사 피드백', 'MEDIUM', 'QC팀', 'demand_channel', '2026-03'),
('SIG-003', '대체 공급사 검토 또는 리드타임 버퍼 증가', 'HIGH', '구매팀', 'supply', '2026-03');

-- =============================================
-- STEP 16: 커버리지
-- =============================================

INSERT INTO mart.mart_coverage_period (period, domain, coverage_rate, included_rows, missing_rows, severity, is_closed_period) VALUES
('2026-03', 'fx_rate',              100.0, 2, 0, 'OK',   false),
('2026-03', 'revenue_settlement',   100.0, 7, 0, 'OK',   false),
('2026-03', 'cost_structure',       100.0, 5, 0, 'OK',   false),
('2026-03', 'logistics_transport',  85.0,  5, 1, 'WARN', false),
('2026-03', '3pl_billing',          80.0,  4, 1, 'WARN', false),
('2026-03', 'platform_fee',         90.0,  5, 0, 'OK',   false),
('2026-02', 'fx_rate',              100.0, 2, 0, 'OK',   false),
('2026-02', 'revenue_settlement',   100.0, 3, 0, 'OK',   false),
('2026-02', 'cost_structure',       100.0, 5, 0, 'OK',   false),
('2026-02', 'logistics_transport',  100.0, 3, 0, 'OK',   false),
('2026-01', 'fx_rate',              100.0, 2, 0, 'OK',   true),
('2026-01', 'revenue_settlement',   100.0, 5, 0, 'OK',   true),
('2026-01', 'cost_structure',       100.0, 5, 0, 'OK',   true);

-- =============================================
-- STEP 17: OPS 배치 로그 (관리자 패널용)
-- =============================================

DO $$ BEGIN
  -- system_batch_log가 ops 또는 raw에 있을 수 있음
  INSERT INTO ops.system_batch_log (batch_id, started_at, finished_at, status, file_count, rows_ingested)
  VALUES (1, '2026-03-13 01:00:00', '2026-03-13 01:05:00', 'SUCCESS', 10, 500);
EXCEPTION WHEN undefined_table THEN
  BEGIN
    INSERT INTO raw.system_batch_log (batch_id, started_at, finished_at, status, file_count, rows_ingested)
    VALUES (1, '2026-03-13 01:00:00', '2026-03-13 01:05:00', 'SUCCESS', 10, 500);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- =============================================
-- STEP 18: mart_inventory_turnover 뷰 생성 (없으면)
-- =============================================

CREATE OR REPLACE VIEW mart.mart_inventory_turnover AS
SELECT
    s.item_id,
    s.warehouse_id,
    COALESCE(SUM(sh.qty_shipped), 0) AS total_shipped,
    AVG(s.onhand_qty) AS avg_onhand,
    CASE WHEN AVG(s.onhand_qty) > 0
         THEN COALESCE(SUM(sh.qty_shipped), 0) / AVG(s.onhand_qty)
         ELSE NULL
    END AS turnover_ratio
FROM core.fact_inventory_snapshot s
LEFT JOIN core.fact_shipment sh
    ON s.item_id = sh.item_id
    AND sh.channel_order_id IS NOT NULL
GROUP BY s.item_id, s.warehouse_id;

-- =============================================
-- 완료! 데이터 확인
-- =============================================
SELECT 'DONE: Sample data inserted' AS status;
SELECT schemaname, relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname IN ('core', 'mart')
  AND n_live_tup > 0
ORDER BY schemaname, relname;
