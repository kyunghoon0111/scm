-- =============================================================
-- 03_core_facts.sql
-- Supabase PostgreSQL: CORE 팩트 테이블 10개
-- 원본: src/db.py CORE_FACT_TABLES (DuckDB)
-- 변환: DOUBLE → DOUBLE PRECISION, VARCHAR → TEXT,
--       current_timestamp → NOW()
-- 센티넬 '__NONE__' 사용 컬럼에 COMMENT 포함
-- =============================================================

-- ----- core.fact_order -----
-- 입도: 주문 라인당 1행
-- PK: (channel_order_id, line_no)
CREATE TABLE IF NOT EXISTS core.fact_order (
    channel_order_id     TEXT NOT NULL,
    line_no              BIGINT NOT NULL,
    order_date           DATE NOT NULL,
    channel_store_id     TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    qty_ordered          DOUBLE PRECISION NOT NULL,
    partner_id           TEXT,
    ship_from_warehouse_id TEXT,
    currency             TEXT,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (channel_order_id, line_no)
);

COMMENT ON TABLE core.fact_order IS '주문 팩트. PK: (channel_order_id, line_no). OMS 발급 자연 키';

-- ----- core.fact_shipment -----
-- 입도: 출고 라인당 1행
-- PK: (shipment_id, item_id, lot_id)
-- 센티넬: lot_id → '__NONE__' (로트 미추적 시)
CREATE TABLE IF NOT EXISTS core.fact_shipment (
    shipment_id          TEXT NOT NULL,
    ship_date            DATE NOT NULL,
    warehouse_id         TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    qty_shipped          DOUBLE PRECISION NOT NULL,
    lot_id               TEXT NOT NULL DEFAULT '__NONE__',
    weight               DOUBLE PRECISION,
    volume_cbm           DOUBLE PRECISION,
    channel_order_id     TEXT,
    channel_store_id     TEXT,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (shipment_id, item_id, lot_id)
);

COMMENT ON TABLE core.fact_shipment IS '출고 팩트. PK: (shipment_id, item_id, lot_id)';
COMMENT ON COLUMN core.fact_shipment.lot_id IS '로트 식별자. 미추적 시 센티넬 ''__NONE__'' 사용 (NULL 금지)';

-- ----- core.fact_return -----
-- 입도: 반품 라인당 1행
-- PK: (return_id, item_id, lot_id)
-- 센티넬: lot_id → '__NONE__'
CREATE TABLE IF NOT EXISTS core.fact_return (
    return_id            TEXT NOT NULL,
    return_date          DATE NOT NULL,
    warehouse_id         TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    qty_returned         DOUBLE PRECISION NOT NULL,
    lot_id               TEXT NOT NULL DEFAULT '__NONE__',
    channel_order_id     TEXT,
    reason               TEXT,
    disposition          TEXT,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (return_id, item_id, lot_id)
);

COMMENT ON TABLE core.fact_return IS '반품 팩트. PK: (return_id, item_id, lot_id)';
COMMENT ON COLUMN core.fact_return.lot_id IS '로트 식별자. 미추적 시 센티넬 ''__NONE__'' 사용 (NULL 금지)';

-- ----- core.fact_inventory_snapshot -----
-- 입도: 품목 × 창고 × 로트 × 스냅샷일 1행
-- PK: (snapshot_date, warehouse_id, item_id, lot_id)
-- 센티넬: lot_id → '__NONE__'
CREATE TABLE IF NOT EXISTS core.fact_inventory_snapshot (
    snapshot_date        DATE NOT NULL,
    warehouse_id         TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    lot_id               TEXT NOT NULL,
    onhand_qty           DOUBLE PRECISION NOT NULL,
    expiry_date          DATE,
    qc_status            TEXT,
    hold_flag            BOOLEAN DEFAULT false,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, warehouse_id, item_id, lot_id)
);

COMMENT ON TABLE core.fact_inventory_snapshot IS '재고 스냅샷 팩트. PK: (snapshot_date, warehouse_id, item_id, lot_id)';
COMMENT ON COLUMN core.fact_inventory_snapshot.lot_id IS '로트 식별자. 미추적 시 센티넬 ''__NONE__'' 사용 (NULL 금지)';

-- ----- core.fact_po -----
-- 입도: 발주 라인당 1행
-- PK: (po_id, item_id)
CREATE TABLE IF NOT EXISTS core.fact_po (
    po_id                TEXT NOT NULL,
    po_date              DATE NOT NULL,
    supplier_id          TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    qty_ordered          DOUBLE PRECISION NOT NULL,
    eta_date             DATE,
    incoterms            TEXT,
    currency             TEXT,
    unit_price           DOUBLE PRECISION,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (po_id, item_id)
);

COMMENT ON TABLE core.fact_po IS '구매 발주 팩트. PK: (po_id, item_id)';

-- ----- core.fact_receipt -----
-- 입도: 입고 라인당 1행
-- PK: (receipt_id, item_id)
CREATE TABLE IF NOT EXISTS core.fact_receipt (
    receipt_id           TEXT NOT NULL,
    receipt_date         DATE NOT NULL,
    warehouse_id         TEXT NOT NULL,
    item_id              TEXT NOT NULL,
    qty_received         DOUBLE PRECISION NOT NULL,
    po_id                TEXT,
    lot_id               TEXT,
    expiry_date          DATE,
    mfg_date             DATE,
    qc_status            TEXT,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (receipt_id, item_id)
);

COMMENT ON TABLE core.fact_receipt IS '입고 팩트. PK: (receipt_id, item_id)';
COMMENT ON COLUMN core.fact_receipt.lot_id IS '입고 시 배정 로트. NULL 가능 (PK 아님). 센티넬 불필요';

-- ----- core.fact_settlement -----
-- 입도: 정산 라인당 1행
-- PK: (settlement_id, line_no)
CREATE TABLE IF NOT EXISTS core.fact_settlement (
    settlement_id        TEXT NOT NULL,
    line_no              BIGINT NOT NULL,
    period               TEXT NOT NULL,
    channel_store_id     TEXT NOT NULL,
    currency             TEXT NOT NULL,
    item_id              TEXT,
    gross_sales          DOUBLE PRECISION,
    discounts            DOUBLE PRECISION,
    fees                 DOUBLE PRECISION,
    refunds              DOUBLE PRECISION,
    net_payout           DOUBLE PRECISION,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (settlement_id, line_no)
);

COMMENT ON TABLE core.fact_settlement IS '정산 팩트. PK: (settlement_id, line_no). 3PL/마켓플레이스 인보이스';

-- ----- core.fact_charge_actual -----
-- 입도: 인보이스 비용 건당 1행
-- PK: (invoice_no, invoice_line_no, charge_type)
CREATE TABLE IF NOT EXISTS core.fact_charge_actual (
    invoice_no           TEXT NOT NULL,
    invoice_line_no      BIGINT NOT NULL,
    charge_type          TEXT NOT NULL,
    amount               DOUBLE PRECISION NOT NULL,
    currency             TEXT NOT NULL,
    period               TEXT NOT NULL,
    invoice_date         DATE,
    vendor_partner_id    TEXT,
    charge_basis         TEXT,
    reference_type       TEXT,
    reference_id         TEXT,
    channel_store_id     TEXT,
    warehouse_id         TEXT,
    country              TEXT,
    source_system        TEXT NOT NULL,
    load_batch_id        BIGINT NOT NULL,
    source_file_hash     TEXT NOT NULL,
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (invoice_no, invoice_line_no, charge_type)
);

COMMENT ON TABLE core.fact_charge_actual IS '실제 비용 팩트. PK: (invoice_no, invoice_line_no, charge_type)';

-- ----- core.fact_exchange_rate -----
-- 입도: 기간 × 통화별 1행
-- PK: (period, currency)
CREATE TABLE IF NOT EXISTS core.fact_exchange_rate (
    period               TEXT NOT NULL,
    currency             TEXT NOT NULL,
    rate_to_krw          DOUBLE PRECISION NOT NULL,
    source_system        TEXT DEFAULT 'manual',
    load_batch_id        BIGINT DEFAULT 0,
    source_file_hash     TEXT DEFAULT '',
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (period, currency)
);

COMMENT ON TABLE core.fact_exchange_rate IS '환율 팩트. PK: (period, currency). FX 1.0 폴백 금지 — 누락 시 NULL 전파';

-- ----- core.fact_cost_structure -----
-- 입도: 품목 × 비용구성요소 × 유효일자별 1행
-- PK: (item_id, cost_component, effective_from)
CREATE TABLE IF NOT EXISTS core.fact_cost_structure (
    item_id              TEXT NOT NULL,
    cost_component       TEXT NOT NULL,
    effective_from       DATE NOT NULL,
    cost_per_unit_krw    DOUBLE PRECISION NOT NULL,
    source_system        TEXT DEFAULT 'manual',
    load_batch_id        BIGINT DEFAULT 0,
    source_file_hash     TEXT DEFAULT '',
    source_pk            TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (item_id, cost_component, effective_from)
);

COMMENT ON TABLE core.fact_cost_structure IS '원가 구조 팩트. PK: (item_id, cost_component, effective_from). 원가 0 채움 금지';
