-- =============================================================
-- 02_core_dimensions.sql
-- Supabase PostgreSQL: CORE 차원 테이블 6개
-- 원본: src/db.py CORE_DIM_TABLES (DuckDB)
-- 변환: DOUBLE → DOUBLE PRECISION, VARCHAR → TEXT,
--       current_timestamp → NOW()
-- =============================================================

-- ----- core.dim_item -----
CREATE TABLE IF NOT EXISTS core.dim_item (
    item_id       TEXT PRIMARY KEY,
    item_type     TEXT,
    uom_id        TEXT,
    pack_size     DOUBLE PRECISION,
    weight        DOUBLE PRECISION,
    volume_cbm    DOUBLE PRECISION,
    category      TEXT,
    active_flag   BOOLEAN DEFAULT true,
    expiry_control_flag BOOLEAN DEFAULT false,
    expiry_basis  TEXT,
    shelf_life_days INTEGER,
    min_sellable_days INTEGER,
    pao_days      INTEGER,
    qc_required_flag BOOLEAN DEFAULT false,
    loaded_at     TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE core.dim_item IS '품목 마스터 (SKU). PK: item_id (자연 비즈니스 키)';

-- ----- core.dim_partner -----
CREATE TABLE IF NOT EXISTS core.dim_partner (
    partner_id       TEXT PRIMARY KEY,
    partner_type     TEXT,
    country          TEXT,
    default_currency TEXT,
    tax_profile      TEXT,
    loaded_at        TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE core.dim_partner IS '거래처 마스터 (SUPPLIER/3PL/CARRIER/CUSTOMER). PK: partner_id';

-- ----- core.dim_channel_store -----
CREATE TABLE IF NOT EXISTS core.dim_channel_store (
    channel_store_id    TEXT PRIMARY KEY,
    channel             TEXT,
    store               TEXT,
    settlement_currency TEXT,
    settlement_cycle    TEXT,
    loaded_at           TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE core.dim_channel_store IS '판매 채널·스토어 마스터. PK: channel_store_id';

-- ----- core.dim_warehouse -----
CREATE TABLE IF NOT EXISTS core.dim_warehouse (
    warehouse_id         TEXT PRIMARY KEY,
    warehouse_type       TEXT,
    country              TEXT,
    cost_center          TEXT,
    operator_partner_id  TEXT,
    loaded_at            TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE core.dim_warehouse IS '창고/DC 마스터. PK: warehouse_id. operator_partner_id → dim_partner';

-- ----- core.dim_uom_conversion -----
CREATE TABLE IF NOT EXISTS core.dim_uom_conversion (
    from_uom       TEXT NOT NULL,
    to_uom         TEXT NOT NULL,
    factor         DOUBLE PRECISION NOT NULL,
    effective_from DATE NOT NULL,
    loaded_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (from_uom, to_uom, effective_from)
);

COMMENT ON TABLE core.dim_uom_conversion IS '단위 환산 마스터. PK: (from_uom, to_uom, effective_from)';

-- ----- core.dim_charge_policy -----
CREATE TABLE IF NOT EXISTS core.dim_charge_policy (
    charge_type              TEXT PRIMARY KEY,
    charge_domain            TEXT NOT NULL,
    cost_stage               TEXT NOT NULL,
    capitalizable_flag       BOOLEAN NOT NULL DEFAULT false,
    default_allocation_basis TEXT NOT NULL,
    severity_if_missing      TEXT NOT NULL DEFAULT 'warn',
    loaded_at                TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE core.dim_charge_policy IS '비용 유형 정책 마스터. PK: charge_type. charge_policy.yaml에서 시드';
