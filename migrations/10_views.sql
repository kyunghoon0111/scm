-- =============================================================
-- 10_views.sql
-- Supabase PostgreSQL: 프론트엔드 조회용 View + RPC 함수
--
-- 기존 FastAPI 엔드포인트에서 CTE/JOIN으로 처리하던 복잡 쿼리를
-- PostgreSQL View / Function 으로 전환.
-- =============================================================


-- ================================================================
-- View 1: v_lead_time_analysis
-- SCM 탭 7 (리드타임 분석)
-- fact_po + fact_receipt 조인하여 공급사별 리드타임 통계
-- ================================================================

DROP VIEW IF EXISTS mart.v_lead_time_analysis CASCADE;
CREATE OR REPLACE VIEW mart.v_lead_time_analysis AS
SELECT
    TO_CHAR(p.po_date, 'YYYY-MM')                       AS period,
    p.supplier_id,
    p.item_id,
    COUNT(*)                                              AS total_count,
    AVG(r.receipt_date - p.po_date)                       AS avg_lead_days,
    MIN(r.receipt_date - p.po_date)                       AS min_lead_days,
    MAX(r.receipt_date - p.po_date)                       AS max_lead_days,
    PERCENTILE_CONT(0.25) WITHIN GROUP (
        ORDER BY (r.receipt_date - p.po_date)
    )                                                     AS q1_lead_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (r.receipt_date - p.po_date)
    )                                                     AS median_lead_days,
    PERCENTILE_CONT(0.75) WITHIN GROUP (
        ORDER BY (r.receipt_date - p.po_date)
    )                                                     AS q3_lead_days,
    -- ETA 대비 실제 지연 (양수=지연, 음수=조기도착)
    AVG(r.receipt_date - COALESCE(p.eta_date, p.po_date + 14)) AS avg_eta_vs_actual,
    -- 지연율: promised_date 초과 건 비율
    COUNT(*) FILTER (
        WHERE r.receipt_date > COALESCE(p.eta_date, p.po_date + 14)
    )::DOUBLE PRECISION / NULLIF(COUNT(*), 0)             AS late_po_ratio,
    -- 평균 지연일수 (지연 건만)
    AVG(
        CASE WHEN r.receipt_date > COALESCE(p.eta_date, p.po_date + 14)
             THEN r.receipt_date - COALESCE(p.eta_date, p.po_date + 14)
        END
    )                                                     AS avg_delay_days
FROM core.fact_po p
LEFT JOIN core.fact_receipt r
    ON  p.po_id   = r.po_id
    AND p.item_id = r.item_id
WHERE r.receipt_date IS NOT NULL
GROUP BY 1, 2, 3;

COMMENT ON VIEW mart.v_lead_time_analysis IS
    'SCM 리드타임 분석: fact_po + fact_receipt 조인. 공급사×품목별 리드타임 통계';


-- ================================================================
-- View 2: v_profitability_ranking
-- P&L 탭 8 (수익성 순위)
-- revenue + gross_margin + contribution 3중 조인
-- ================================================================

DROP VIEW IF EXISTS mart.v_profitability_ranking CASCADE;
CREATE OR REPLACE VIEW mart.v_profitability_ranking AS
SELECT
    r.period,
    r.item_id,
    r.channel_store_id,
    r.country,
    r.net_revenue_krw,
    gm.gross_margin_krw,
    gm.gross_margin_pct,
    c.contribution_krw,
    c.contribution_pct,
    -- 순위
    ROW_NUMBER() OVER (
        PARTITION BY r.period
        ORDER BY COALESCE(c.contribution_krw, gm.gross_margin_krw, r.net_revenue_krw) DESC
    ) AS rank_by_contribution,
    -- coverage_flag 전파
    CASE
        WHEN COALESCE(r.coverage_flag, 'PARTIAL') = 'ACTUAL'
         AND COALESCE(gm.coverage_flag, 'PARTIAL') = 'ACTUAL'
         AND COALESCE(c.coverage_flag, 'PARTIAL') = 'ACTUAL'
        THEN 'ACTUAL'
        ELSE 'PARTIAL'
    END AS coverage_flag
FROM mart.mart_pnl_revenue r
LEFT JOIN mart.mart_pnl_gross_margin gm
    ON  r.period           = gm.period
    AND r.item_id          = gm.item_id
    AND r.channel_store_id = gm.channel_store_id
    AND r.country          = gm.country
LEFT JOIN mart.mart_pnl_contribution c
    ON  r.period           = c.period
    AND r.item_id          = c.item_id
    AND r.channel_store_id = c.channel_store_id
    AND r.country          = c.country;

COMMENT ON VIEW mart.v_profitability_ranking IS
    'P&L 수익성 순위: revenue + gross_margin + contribution 3중 조인. coverage_flag 전파 적용';


-- ================================================================
-- View 3: v_pnl_coverage_row_level
-- P&L 탭 11 (커버리지 - 행 수준 집계)
-- 각 P&L 마트별 ACTUAL/PARTIAL 비율
-- ================================================================

DROP VIEW IF EXISTS mart.v_pnl_coverage_row_level CASCADE;
CREATE OR REPLACE VIEW mart.v_pnl_coverage_row_level AS
SELECT
    period,
    mart,
    COUNT(*) FILTER (WHERE coverage_flag = 'ACTUAL')  AS actual_count,
    COUNT(*) FILTER (WHERE coverage_flag = 'PARTIAL') AS partial_count,
    COUNT(*)                                           AS total_count,
    CASE WHEN COUNT(*) > 0
         THEN COUNT(*) FILTER (WHERE coverage_flag = 'ACTUAL')::DOUBLE PRECISION / COUNT(*)
         ELSE 0
    END                                                AS actual_ratio
FROM (
    SELECT period, 'revenue'          AS mart, coverage_flag FROM mart.mart_pnl_revenue
    UNION ALL
    SELECT period, 'cogs'             AS mart, coverage_flag FROM mart.mart_pnl_cogs
    UNION ALL
    SELECT period, 'gross_margin'     AS mart, coverage_flag FROM mart.mart_pnl_gross_margin
    UNION ALL
    SELECT period, 'variable_cost'    AS mart, coverage_flag FROM mart.mart_pnl_variable_cost
    UNION ALL
    SELECT period, 'contribution'     AS mart, coverage_flag FROM mart.mart_pnl_contribution
    UNION ALL
    SELECT period, 'operating_profit' AS mart, coverage_flag FROM mart.mart_pnl_operating_profit
) combined
GROUP BY period, mart;

COMMENT ON VIEW mart.v_pnl_coverage_row_level IS
    'P&L 커버리지 행 수준 집계: 마트별 ACTUAL/PARTIAL 비율';


-- ================================================================
-- RPC 1: get_system_status
-- Admin 탭 4 (시스템 상태)
-- 테이블별 행 수 + 최근 배치 + DQ 요약
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    tbl_counts JSON;
    last_batch RECORD;
    dq_summary RECORD;
    cov_summary RECORD;
BEGIN
    IF (auth.jwt() ->> 'role') NOT IN ('admin', 'ops') THEN
        RAISE EXCEPTION 'admin 또는 ops 역할만 시스템 상태를 조회할 수 있습니다.';
    END IF;
    -- 테이블별 행 수
    SELECT json_object_agg(table_name, row_count)
    INTO tbl_counts
    FROM (
        SELECT schemaname || '.' || relname AS table_name,
               n_live_tup                   AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname IN ('core', 'mart', 'ops', 'raw')
        ORDER BY schemaname, relname
    ) t;

    -- 최근 배치
    SELECT *
    INTO last_batch
    FROM raw.system_batch_log
    ORDER BY started_at DESC
    LIMIT 1;

    -- DQ 이슈 요약
    SELECT
        COALESCE(SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END), 0) AS critical,
        COALESCE(SUM(CASE WHEN severity = 'HIGH'     THEN 1 ELSE 0 END), 0) AS high,
        COALESCE(SUM(CASE WHEN severity = 'MEDIUM'   THEN 1 ELSE 0 END), 0) AS medium,
        COALESCE(SUM(CASE WHEN severity = 'LOW'      THEN 1 ELSE 0 END), 0) AS low
    INTO dq_summary
    FROM ops.ops_issue_log;

    -- 커버리지 요약
    SELECT
        period,
        CASE WHEN COUNT(*) > 0
             THEN COUNT(*) FILTER (WHERE coverage_flag = 'ACTUAL')::DOUBLE PRECISION / COUNT(*)
             ELSE 0
        END AS rate
    INTO cov_summary
    FROM mart.mart_coverage_period
    GROUP BY period
    ORDER BY period DESC
    LIMIT 1;

    result := json_build_object(
        'db', json_build_object(
            'engine', 'PostgreSQL (Supabase)',
            'connected', true
        ),
        'pipeline', json_build_object(
            'locked',          COALESCE(last_batch.status = 'running', false),
            'last_run_id',     last_batch.batch_id,
            'last_run_at',     last_batch.started_at,
            'last_run_result', last_batch.status
        ),
        'tables', COALESCE(tbl_counts, '{}'::JSON),
        'dq_issues', json_build_object(
            'critical', COALESCE(dq_summary.critical, 0),
            'high',     COALESCE(dq_summary.high, 0),
            'medium',   COALESCE(dq_summary.medium, 0),
            'low',      COALESCE(dq_summary.low, 0)
        ),
        'coverage', json_build_object(
            'period', COALESCE(cov_summary.period, ''),
            'rate',   COALESCE(cov_summary.rate, 0)
        )
    );

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_system_status IS
    'Admin 시스템 상태: 테이블 행 수 + 최근 배치 + DQ 요약 + 커버리지';


-- ================================================================
-- RPC 2: rollback_batches
-- Admin 파이프라인 롤백
-- ================================================================

CREATE OR REPLACE FUNCTION public.rollback_batches(batch_count INTEGER DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    batch_ids BIGINT[];
    deleted_count INTEGER := 0;
BEGIN
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'admin 역할만 최근 배치를 롤백할 수 있습니다.';
    END IF;

    -- 최근 N개 배치 ID 조회
    SELECT ARRAY_AGG(batch_id ORDER BY started_at DESC)
    INTO batch_ids
    FROM (
        SELECT batch_id, started_at
        FROM raw.system_batch_log
        ORDER BY started_at DESC
        LIMIT batch_count
    ) recent;

    IF batch_ids IS NULL THEN
        RETURN json_build_object('success', false, 'message', '롤백할 배치가 없습니다.');
    END IF;

    -- CORE 팩트 테이블에서 해당 배치 데이터 삭제
    DELETE FROM core.fact_order            WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_shipment         WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_return           WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_inventory_snapshot WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_po               WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_receipt          WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_settlement       WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_charge_actual    WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_exchange_rate    WHERE load_batch_id = ANY(batch_ids);
    DELETE FROM core.fact_cost_structure   WHERE load_batch_id = ANY(batch_ids);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 배치 로그 상태 업데이트
    UPDATE raw.system_batch_log
    SET status = 'rolled_back'
    WHERE batch_id = ANY(batch_ids);

    RETURN json_build_object(
        'success', true,
        'rolled_back_batches', batch_ids,
        'message', format('%s개 배치 롤백 완료. 마트 재빌드가 필요합니다.', array_length(batch_ids, 1))
    );
END;
$$;

COMMENT ON FUNCTION public.rollback_batches IS
    '최근 N개 배치 롤백: CORE 팩트 데이터 삭제 + 배치 상태 ROLLED_BACK';


-- ================================================================
-- RPC 3: close_period
-- Admin 기간 마감
-- ================================================================

CREATE OR REPLACE FUNCTION public.close_period(
    p_period TEXT,
    p_force BOOLEAN DEFAULT false,
    p_reason TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_locked BOOLEAN;
BEGIN
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'admin 역할만 기간을 마감할 수 있습니다.';
    END IF;

    SELECT lock_flag INTO current_locked
    FROM ops.ops_period_close
    WHERE period = p_period;

    IF current_locked IS NULL THEN
        -- 새 기간 생성 후 마감
        INSERT INTO ops.ops_period_close (period, closed_at, closed_by, lock_flag, notes)
        VALUES (p_period, NOW(), current_user, true, NULLIF(p_reason, ''));
    ELSIF current_locked AND NOT p_force THEN
        RETURN json_build_object(
            'success', false,
            'message', format('기간 %s은 LOCKED 상태입니다. force=true로 호출하세요.', p_period)
        );
    ELSE
        UPDATE ops.ops_period_close
        SET lock_flag = true,
            closed_at = NOW(),
            closed_by = current_user,
            notes = NULLIF(p_reason, '')
        WHERE period = p_period;
    END IF;

    RETURN json_build_object('success', true, 'message', format('기간 %s 마감 완료', p_period));
END;
$$;

COMMENT ON FUNCTION public.close_period IS '기간 마감: OPEN → CLOSED. LOCKED 상태는 force=true 필요';


-- ================================================================
-- RPC 4: list_users (인증 사용자 목록)
-- auth.users 테이블 조회 (SECURITY DEFINER로 admin만 접근)
-- ================================================================

CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (
    id TEXT,
    email TEXT,
    name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- admin 역할 확인
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'admin 역할만 사용자 목록을 조회할 수 있습니다.';
    END IF;

    RETURN QUERY
    SELECT
        u.id::TEXT,
        u.email::TEXT,
        COALESCE(u.raw_user_meta_data ->> 'name', u.email)::TEXT AS name,
        COALESCE(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role', 'readonly')::TEXT AS role,
        u.created_at,
        u.last_sign_in_at AS last_login
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_users IS '인증 사용자 목록 (admin 전용)';


-- ================================================================
-- RPC 5: update_user_role
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'admin 역할만 사용자 역할을 변경할 수 있습니다.';
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
    WHERE id = p_user_id::UUID;

    RETURN json_build_object('success', true, 'message', format('사용자 %s 역할이 %s로 변경됨', p_user_id, p_role));
END;
$$;


-- ================================================================
-- RPC 6: invite_user
-- ================================================================

CREATE OR REPLACE FUNCTION public.invite_user(p_email TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'admin 역할만 사용자를 초대할 수 있습니다.';
    END IF;

    -- Supabase Auth Admin API를 통한 초대는 Edge Function에서 처리해야 함
    -- 여기서는 ops.user_invites 테이블에 기록만 남김
    INSERT INTO ops.user_invites (email, role, invited_by, invited_at)
    VALUES (p_email, p_role, current_user, NOW())
    ON CONFLICT (email) DO UPDATE SET role = p_role, invited_at = NOW();

    RETURN json_build_object('success', true, 'message', format('%s 초대 완료 (역할: %s)', p_email, p_role));
END;
$$;


-- ================================================================
-- RLS for Views (뷰는 기본 테이블 RLS를 상속)
-- ================================================================

-- 뷰는 기본 테이블의 RLS를 자동으로 상속하므로 별도 정책 불필요.
-- SECURITY DEFINER 함수는 함수 작성자 권한으로 실행되므로
-- 함수 내에서 직접 권한 검사를 수행합니다.


-- ================================================================
-- 인덱스 (뷰 성능 최적화)
-- ================================================================

-- v_lead_time_analysis 최적화
CREATE INDEX IF NOT EXISTS idx_fact_po_supplier_date
    ON core.fact_po (supplier_id, po_date);
CREATE INDEX IF NOT EXISTS idx_fact_receipt_po_item
    ON core.fact_receipt (po_id, item_id);

-- v_profitability_ranking 최적화 (기존 인덱스로 충분)

-- user_invites 테이블 (RPC 6용)
CREATE TABLE IF NOT EXISTS ops.user_invites (
    email TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    invited_by TEXT,
    invited_at TIMESTAMPTZ DEFAULT NOW()
);
