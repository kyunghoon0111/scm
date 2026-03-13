-- =============================================================
-- 08_ml_schema.sql
-- Supabase PostgreSQL: ML 확장 스키마
-- docs/확장_로드맵.md 모듈 1~3, 5 기반
--
-- 모듈 1: 수요 예측 (fact_demand_forecast, dim_forecast_model,
--                   mart_forecast_accuracy, mart_demand_plan)
-- 모듈 2: 보충 발주 (mart_replenishment_plan)
-- 모듈 3: 리드타임 예측 (fact_lead_time_forecast, mart_lead_time_analysis)
-- 모듈 5: 예측 거버넌스 (mart_model_performance)
--
-- 스키마만 생성, 실제 ML 구현은 Phase 5 이후.
-- 기존 파이프라인(run.py) 수정 없이 inbox/ CSV 투입 방식 유지.
-- =============================================================


-- ================================================================
-- 모듈 1: 수요 예측 (Demand Forecasting)
-- ================================================================

-- ----- core.fact_demand_forecast -----
-- 외부 예측 모델 결과 적재
CREATE TABLE IF NOT EXISTS core.fact_demand_forecast (
    forecast_id         TEXT            NOT NULL,
    forecast_date       DATE            NOT NULL,
    target_date         DATE            NOT NULL,
    item_id             TEXT            NOT NULL,
    warehouse_id        TEXT,
    channel_store_id    TEXT,
    forecast_qty        DOUBLE PRECISION NOT NULL,
    forecast_method     TEXT            NOT NULL,
    model_version       TEXT,
    lower_bound         DOUBLE PRECISION,
    upper_bound         DOUBLE PRECISION,
    confidence_level    DOUBLE PRECISION DEFAULT 0.95,
    -- 시스템 컬럼
    source_system       TEXT,
    load_batch_id       BIGINT,
    source_file_hash    TEXT,
    source_pk           TEXT,
    loaded_at           TIMESTAMP       DEFAULT NOW(),
    PRIMARY KEY (forecast_id)
);

COMMENT ON TABLE core.fact_demand_forecast IS '외부 수요 예측 모델 결과 (예측일, 대상일, 품목별 예측 수량). inbox/ CSV 투입';

-- ----- core.dim_forecast_model -----
-- 예측 모델 메타데이터
CREATE TABLE IF NOT EXISTS core.dim_forecast_model (
    model_id            TEXT            NOT NULL PRIMARY KEY,
    model_name          TEXT            NOT NULL,
    model_type          TEXT            NOT NULL,  -- PROPHET / ARIMA / XGBOOST / NAIVE_AVG
    parameters_json     TEXT,
    trained_at          TIMESTAMP,
    training_data_range TEXT,
    is_active           BOOLEAN         DEFAULT true,
    description         TEXT,
    -- 시스템 컬럼
    source_system       TEXT,
    load_batch_id       BIGINT,
    source_file_hash    TEXT,
    source_pk           TEXT,
    loaded_at           TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE core.dim_forecast_model IS '예측 모델 메타데이터 (모델 유형: PROPHET/ARIMA/XGBOOST/NAIVE_AVG)';

-- ----- mart.mart_forecast_accuracy -----
-- 예측 정확도 (MAPE, bias 추적)
CREATE TABLE IF NOT EXISTS mart.mart_forecast_accuracy (
    period              TEXT            NOT NULL,
    item_id             TEXT            NOT NULL,
    warehouse_id        TEXT,
    forecast_method     TEXT            NOT NULL,
    actual_qty          DOUBLE PRECISION,
    forecast_qty        DOUBLE PRECISION,
    error_qty           DOUBLE PRECISION,
    abs_error           DOUBLE PRECISION,
    mape                DOUBLE PRECISION,
    bias                DOUBLE PRECISION,
    accuracy_pct        DOUBLE PRECISION
);

COMMENT ON TABLE mart.mart_forecast_accuracy IS '예측 정확도 (MAPE, Bias). actual_qty: fact_shipment 집계, forecast_qty: fact_demand_forecast 집계';

-- ----- mart.mart_demand_plan -----
-- 수요 계획 (안전재고, 재주문점)
CREATE TABLE IF NOT EXISTS mart.mart_demand_plan (
    item_id             TEXT            NOT NULL,
    warehouse_id        TEXT,
    plan_date           DATE            NOT NULL,
    forecast_30d        DOUBLE PRECISION,
    forecast_60d        DOUBLE PRECISION,
    forecast_90d        DOUBLE PRECISION,
    safety_stock_qty    DOUBLE PRECISION,
    reorder_point       DOUBLE PRECISION,
    confidence_level    DOUBLE PRECISION,
    forecast_method     TEXT
);

COMMENT ON TABLE mart.mart_demand_plan IS '수요 계획. 30/60/90일 예측 수량 + 안전재고 + 재주문점';


-- ================================================================
-- 모듈 2: 보충 발주 (Replenishment Planning)
-- ================================================================

-- ----- mart.mart_replenishment_plan -----
CREATE TABLE IF NOT EXISTS mart.mart_replenishment_plan (
    item_id             TEXT            NOT NULL,
    warehouse_id        TEXT,
    plan_date           DATE            NOT NULL,
    current_stock       DOUBLE PRECISION,
    reorder_point       DOUBLE PRECISION,
    safety_stock        DOUBLE PRECISION,
    recommended_order_qty DOUBLE PRECISION,
    urgency             TEXT,           -- CRITICAL / HIGH / NORMAL
    forecast_method     TEXT
);

COMMENT ON TABLE mart.mart_replenishment_plan IS '보충 발주 추천. urgency: CRITICAL(즉시)/HIGH(1주내)/NORMAL(정기)';


-- ================================================================
-- 모듈 3: 리드타임 예측 (Lead Time Forecasting)
-- ================================================================

-- ----- core.fact_lead_time_forecast -----
CREATE TABLE IF NOT EXISTS core.fact_lead_time_forecast (
    forecast_id         TEXT            NOT NULL PRIMARY KEY,
    forecast_date       DATE            NOT NULL,
    supplier_id         TEXT,
    item_id             TEXT,
    origin_country      TEXT,
    dest_warehouse_id   TEXT,
    predicted_lead_days DOUBLE PRECISION,
    lower_bound_days    DOUBLE PRECISION,
    upper_bound_days    DOUBLE PRECISION,
    confidence_level    DOUBLE PRECISION DEFAULT 0.95,
    forecast_method     TEXT,
    -- 시스템 컬럼
    source_system       TEXT,
    load_batch_id       BIGINT,
    source_file_hash    TEXT,
    source_pk           TEXT,
    loaded_at           TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE core.fact_lead_time_forecast IS '공급사별 리드타임 예측. inbox/ CSV 투입';

-- ----- mart.mart_lead_time_analysis -----
CREATE TABLE IF NOT EXISTS mart.mart_lead_time_analysis (
    period              TEXT            NOT NULL,
    supplier_id         TEXT            NOT NULL,
    item_id             TEXT,
    actual_lead_days_avg    DOUBLE PRECISION,
    actual_lead_days_p50    DOUBLE PRECISION,
    actual_lead_days_p90    DOUBLE PRECISION,
    predicted_lead_days_avg DOUBLE PRECISION,
    prediction_error_days   DOUBLE PRECISION,
    late_po_ratio       DOUBLE PRECISION,
    total_po_count      INTEGER
);

COMMENT ON TABLE mart.mart_lead_time_analysis IS '리드타임 분석. 실적(p50/p90) vs 예측, 지연율';


-- ================================================================
-- 모듈 5: 예측 거버넌스 (Forecast Governance)
-- ================================================================

-- ----- mart.mart_model_performance -----
CREATE TABLE IF NOT EXISTS mart.mart_model_performance (
    period              TEXT            NOT NULL,
    item_id             TEXT,
    warehouse_id        TEXT,
    forecast_method     TEXT            NOT NULL,
    mape                DOUBLE PRECISION,
    bias                DOUBLE PRECISION,
    rank_in_period      INTEGER,
    is_champion         BOOLEAN         DEFAULT false,
    mape_prev_period    DOUBLE PRECISION,
    mape_trend          TEXT,           -- IMPROVING / STABLE / DEGRADING
    drift_detected      BOOLEAN         DEFAULT false
);

COMMENT ON TABLE mart.mart_model_performance IS '모델 성과 추적. Champion 선정, Drift 감지 (mape_trend: IMPROVING/STABLE/DEGRADING)';


-- ================================================================
-- ML 인덱스
-- ================================================================

-- 수요예측: 품목+대상일 조회
CREATE INDEX IF NOT EXISTS idx_demand_forecast_item_target
    ON core.fact_demand_forecast(item_id, target_date);

-- 수요예측: 예측일 범위 조회
CREATE INDEX IF NOT EXISTS idx_demand_forecast_date
    ON core.fact_demand_forecast(forecast_date);

-- 리드타임 예측: 공급사+품목 조회
CREATE INDEX IF NOT EXISTS idx_lead_time_forecast_supplier
    ON core.fact_lead_time_forecast(supplier_id, item_id);

-- 예측 정확도: 기간+품목 조회
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_period
    ON mart.mart_forecast_accuracy(period, item_id);

-- 수요 계획: 품목+계획일 조회
CREATE INDEX IF NOT EXISTS idx_demand_plan_item_date
    ON mart.mart_demand_plan(item_id, plan_date);

-- 보충 발주: 긴급도 필터
CREATE INDEX IF NOT EXISTS idx_replenishment_urgency
    ON mart.mart_replenishment_plan(urgency, item_id);

-- 리드타임 분석: 기간+공급사 조회
CREATE INDEX IF NOT EXISTS idx_lead_time_analysis_period
    ON mart.mart_lead_time_analysis(period, supplier_id);

-- 모델 성과: 기간+champion 필터
CREATE INDEX IF NOT EXISTS idx_model_performance_period
    ON mart.mart_model_performance(period, is_champion);


-- ================================================================
-- ML 테이블 RLS
-- ================================================================

-- MART 테이블: scm + pnl + readonly 읽기 가능
ALTER TABLE mart.mart_forecast_accuracy   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_demand_plan         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_replenishment_plan  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_lead_time_analysis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_model_performance   ENABLE ROW LEVEL SECURITY;

-- admin: 전체 접근
CREATE POLICY "admin_full_access" ON mart.mart_forecast_accuracy
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_demand_plan
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_replenishment_plan
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_lead_time_analysis
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_model_performance
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 예측 정확도/수요 계획/모델 성과: scm + pnl + readonly
CREATE POLICY "ml_read" ON mart.mart_forecast_accuracy
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'pnl', 'readonly'));
CREATE POLICY "ml_read" ON mart.mart_demand_plan
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'pnl', 'readonly'));
CREATE POLICY "ml_read" ON mart.mart_model_performance
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'pnl', 'readonly'));

-- 보충 발주/리드타임 분석: scm + readonly (SCM 특화)
CREATE POLICY "ml_scm_read" ON mart.mart_replenishment_plan
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'readonly'));
CREATE POLICY "ml_scm_read" ON mart.mart_lead_time_analysis
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('scm', 'readonly'));
