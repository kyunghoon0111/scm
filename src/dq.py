"""Data quality checks. CRITICAL/HIGH -> FAIL.

Every DQ check returns DQResult objects.
The pipeline rejects files when any CRITICAL or HIGH check fails.
"""
import polars as pl
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from src.config import AppConfig


# ── 한글 컬럼명 매핑 ──

COLUMN_KO: dict[str, str] = {
    "channel_order_id": "주문번호",
    "line_no": "행번호",
    "order_date": "주문일자",
    "channel_store_id": "채널/스토어ID",
    "item_id": "상품코드",
    "qty_ordered": "주문수량",
    "shipment_id": "출고번호",
    "ship_date": "출고일자",
    "warehouse_id": "창고코드",
    "qty_shipped": "출고수량",
    "return_id": "반품번호",
    "return_date": "반품일자",
    "qty_returned": "반품수량",
    "snapshot_date": "스냅샷일자",
    "onhand_qty": "보유수량",
    "lot_id": "로트번호",
    "po_id": "발주번호",
    "po_date": "발주일자",
    "supplier_id": "공급업체코드",
    "receipt_id": "입고번호",
    "receipt_date": "입고일자",
    "qty_received": "입고수량",
    "settlement_id": "정산번호",
    "period": "기간",
    "currency": "통화",
    "invoice_no": "송장번호",
    "invoice_line_no": "송장행번호",
    "charge_type": "비용유형",
    "amount": "금액",
    "rate_to_krw": "원화환율",
    "cost_component": "원가구성",
    "effective_from": "적용시작일",
    "cost_per_unit_krw": "단위원가(원)",
    "source_system": "소스시스템",
    "weight": "중량",
    "volume_cbm": "부피(CBM)",
    "expiry_date": "유통기한",
    "unit_price": "단가",
    "eta_date": "입고예정일",
    "net_payout": "순정산금액",
    "gross_sales": "총매출",
}

TABLE_KO: dict[str, str] = {
    "fact_order": "주문",
    "fact_shipment": "출고",
    "fact_return": "반품",
    "fact_inventory_snapshot": "재고 스냅샷",
    "fact_po": "발주",
    "fact_receipt": "입고",
    "fact_settlement": "정산",
    "fact_charge_actual": "비용",
    "fact_exchange_rate": "환율",
    "fact_cost_structure": "원가",
}

# 수량 컬럼 (음수 불허)
QTY_COLUMNS = {
    "qty_ordered", "qty_shipped", "qty_returned", "onhand_qty",
    "qty_received",
}

# 금액 이상치 기준 (KRW 기준, 1억)
AMOUNT_OUTLIER_THRESHOLD = 100_000_000

# 날짜 검증 범위
DATE_RANGE_PAST_YEARS = 10
DATE_RANGE_FUTURE_DAYS = 60


def _col_ko(col: str) -> str:
    """컬럼명의 한글 표시명을 반환."""
    ko = COLUMN_KO.get(col)
    return f"{col} ({ko})" if ko else col


def _table_ko(table: str) -> str:
    """테이블명의 한글 표시명을 반환."""
    ko = TABLE_KO.get(table)
    return f"{table} ({ko})" if ko else table


@dataclass
class DQResult:
    check_name: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    passed: bool
    detail: str


# ═══════════════════════════════════════════════════════════════
# 기존 검사 (CRITICAL / HIGH)
# ═══════════════════════════════════════════════════════════════


def check_required_columns(df: pl.DataFrame, table_name: str, config: AppConfig) -> list[DQResult]:
    """필수 컬럼 존재 여부 검사."""
    results = []
    schema = config.get_schema(table_name)
    present = {c.lower() for c in df.columns}

    missing = []
    for col_def in schema.required_columns:
        if col_def.name.lower() not in present:
            missing.append(col_def.name)

    if missing:
        missing_display = ", ".join(_col_ko(c) for c in missing)
        results.append(DQResult(
            check_name="required_columns",
            severity="CRITICAL",
            passed=False,
            detail=f"[{_table_ko(table_name)}] 필수 컬럼이 누락되었습니다: {missing_display}"
        ))
    else:
        results.append(DQResult(
            check_name="required_columns",
            severity="CRITICAL",
            passed=True,
            detail=f"[{_table_ko(table_name)}] 모든 필수 컬럼이 존재합니다"
        ))
    return results


def check_null_business_keys(df: pl.DataFrame, table_name: str, config: AppConfig) -> list[DQResult]:
    """비즈니스 키에 NULL 값이 없는지 검사."""
    results = []
    schema = config.get_schema(table_name)

    for bk_col in schema.business_key:
        if bk_col not in df.columns:
            continue

        null_count = df.filter(pl.col(bk_col).is_null()).height
        if null_count > 0:
            results.append(DQResult(
                check_name=f"null_business_key_{bk_col}",
                severity="CRITICAL",
                passed=False,
                detail=(
                    f"[{_table_ko(table_name)}] {_col_ko(bk_col)}에 "
                    f"빈 값이 {null_count}건 있습니다"
                )
            ))
        else:
            results.append(DQResult(
                check_name=f"null_business_key_{bk_col}",
                severity="CRITICAL",
                passed=True,
                detail=f"[{_table_ko(table_name)}] {_col_ko(bk_col)}에 빈 값이 없습니다"
            ))
    return results


def check_duplicate_business_keys(df: pl.DataFrame, table_name: str, config: AppConfig) -> list[DQResult]:
    """비즈니스 키 중복 검사."""
    results = []
    schema = config.get_schema(table_name)
    bk_cols = [c for c in schema.business_key if c in df.columns]

    if not bk_cols:
        return results

    dup_count = df.height - df.unique(subset=bk_cols).height
    if dup_count > 0:
        bk_display = ", ".join(_col_ko(c) for c in bk_cols)
        results.append(DQResult(
            check_name="duplicate_business_keys",
            severity="HIGH",
            passed=False,
            detail=(
                f"[{_table_ko(table_name)}] 기본키({bk_display}) 중복이 "
                f"{dup_count}건 발견되었습니다"
            )
        ))
    else:
        results.append(DQResult(
            check_name="duplicate_business_keys",
            severity="HIGH",
            passed=True,
            detail=f"[{_table_ko(table_name)}] 기본키 중복이 없습니다"
        ))
    return results


def check_charge_types(df: pl.DataFrame, config: AppConfig) -> list[DQResult]:
    """fact_charge_actual: 비용유형이 정책에 등록되어 있는지 검사."""
    results = []
    if "charge_type" not in df.columns:
        return results

    valid_types = config.get_valid_charge_types()
    actual_types = set(df["charge_type"].unique().to_list())
    unknown = actual_types - valid_types

    if unknown:
        results.append(DQResult(
            check_name="charge_type_validation",
            severity="HIGH",
            passed=False,
            detail=(
                f"[fact_charge_actual (비용)] 등록되지 않은 비용유형이 있습니다: "
                f"{', '.join(sorted(unknown))}"
            )
        ))
    else:
        results.append(DQResult(
            check_name="charge_type_validation",
            severity="HIGH",
            passed=True,
            detail="[fact_charge_actual (비용)] 모든 비용유형이 유효합니다"
        ))
    return results


def check_type_coercion(df: pl.DataFrame, table_name: str, config: AppConfig) -> list[DQResult]:
    """컬럼 타입 변환 가능 여부 검사."""
    results = []
    schema = config.get_schema(table_name)
    all_cols = list(schema.required_columns) + list(schema.optional_columns)

    type_map = {
        "VARCHAR": pl.Utf8,
        "BIGINT": pl.Int64,
        "DOUBLE": pl.Float64,
        "DATE": pl.Date,
        "BOOLEAN": pl.Boolean,
    }

    for col_def in all_cols:
        if col_def.name not in df.columns:
            continue
        target_type = type_map.get(col_def.type)
        if target_type is None:
            continue

        if df[col_def.name].dtype == pl.Utf8 and target_type != pl.Utf8:
            try:
                if target_type == pl.Int64:
                    df[col_def.name].cast(pl.Int64, strict=True)
                elif target_type == pl.Float64:
                    df[col_def.name].cast(pl.Float64, strict=True)
                elif target_type == pl.Date:
                    df[col_def.name].str.to_date(strict=False)
                elif target_type == pl.Boolean:
                    pass
            except Exception:
                type_ko = {"BIGINT": "정수", "DOUBLE": "실수", "DATE": "날짜", "BOOLEAN": "참/거짓"}
                target_ko = type_ko.get(col_def.type, col_def.type)
                results.append(DQResult(
                    check_name=f"type_coercion_{col_def.name}",
                    severity="HIGH",
                    passed=False,
                    detail=(
                        f"[{_table_ko(table_name)}] {_col_ko(col_def.name)} 컬럼을 "
                        f"{target_ko}({col_def.type}) 타입으로 변환할 수 없습니다"
                    )
                ))
                continue

        results.append(DQResult(
            check_name=f"type_coercion_{col_def.name}",
            severity="HIGH",
            passed=True,
            detail=f"[{_table_ko(table_name)}] {_col_ko(col_def.name)} 타입 변환 가능"
        ))
    return results


# ═══════════════════════════════════════════════════════════════
# 신규 검사 (세션 4 추가)
# ═══════════════════════════════════════════════════════════════


def check_quantity_range(df: pl.DataFrame, table_name: str, _config: AppConfig) -> list[DQResult]:
    """수량 컬럼 음수 검사 (HIGH — 파일 거부)."""
    results = []

    for col in QTY_COLUMNS:
        if col not in df.columns:
            continue
        # 숫자로 변환 시도 (문자열이면 캐스트)
        series = df[col]
        if series.dtype == pl.Utf8:
            try:
                series = series.cast(pl.Float64, strict=False)
            except Exception:
                continue

        if series.dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32, pl.Int16, pl.Int8):
            neg_count = series.filter(series < 0).len()
            if neg_count > 0:
                # 음수 행 번호 샘플 (최대 5건)
                neg_rows = df.with_row_index("__row__").filter(pl.col(col).cast(pl.Float64, strict=False) < 0)
                sample_rows = neg_rows["__row__"].head(5).to_list()
                sample_str = ", ".join(str(r + 1) for r in sample_rows)  # 1-based

                results.append(DQResult(
                    check_name=f"quantity_range_{col}",
                    severity="HIGH",
                    passed=False,
                    detail=(
                        f"[{_table_ko(table_name)}] {_col_ko(col)}에 음수 값이 "
                        f"{neg_count}건 있습니다 (행: {sample_str})"
                    )
                ))
            else:
                results.append(DQResult(
                    check_name=f"quantity_range_{col}",
                    severity="HIGH",
                    passed=True,
                    detail=f"[{_table_ko(table_name)}] {_col_ko(col)} 음수 없음"
                ))
    return results


def check_amount_outlier(df: pl.DataFrame, table_name: str, _config: AppConfig) -> list[DQResult]:
    """금액 이상치 경고 (MEDIUM — 경고만, 파일 거부 안 함)."""
    results = []

    amount_cols = {"amount", "unit_price", "cost_per_unit_krw", "net_payout", "gross_sales"}
    for col in amount_cols:
        if col not in df.columns:
            continue

        series = df[col]
        if series.dtype == pl.Utf8:
            try:
                series = series.cast(pl.Float64, strict=False)
            except Exception:
                continue

        if series.dtype in (pl.Float64, pl.Float32, pl.Int64, pl.Int32):
            outlier_count = series.filter(series.abs() > AMOUNT_OUTLIER_THRESHOLD).len()
            if outlier_count > 0:
                results.append(DQResult(
                    check_name=f"amount_outlier_{col}",
                    severity="MEDIUM",
                    passed=False,
                    detail=(
                        f"[{_table_ko(table_name)}] {_col_ko(col)}에 이상치 "
                        f"(절대값 > 1억)가 {outlier_count}건 있습니다"
                    )
                ))
            else:
                results.append(DQResult(
                    check_name=f"amount_outlier_{col}",
                    severity="MEDIUM",
                    passed=True,
                    detail=f"[{_table_ko(table_name)}] {_col_ko(col)} 이상치 없음"
                ))
    return results


def check_date_range(df: pl.DataFrame, table_name: str, config: AppConfig) -> list[DQResult]:
    """날짜 범위 검사 (MEDIUM — 미래 날짜, 너무 오래된 날짜 경고)."""
    results = []
    schema = config.get_schema(table_name)
    all_cols = list(schema.required_columns) + list(schema.optional_columns)
    date_cols = [c.name for c in all_cols if c.type == "DATE"]

    today = date.today()
    min_date = today - timedelta(days=365 * DATE_RANGE_PAST_YEARS)
    max_date = today + timedelta(days=DATE_RANGE_FUTURE_DAYS)

    for col in date_cols:
        if col not in df.columns:
            continue

        series = df[col]
        # 문자열이면 날짜로 변환 시도
        if series.dtype == pl.Utf8:
            try:
                series = series.str.to_date(strict=False)
            except Exception:
                continue

        if series.dtype != pl.Date:
            continue

        non_null = series.drop_nulls()
        if non_null.len() == 0:
            continue

        future_count = non_null.filter(non_null > max_date).len()
        past_count = non_null.filter(non_null < min_date).len()

        if future_count > 0:
            results.append(DQResult(
                check_name=f"date_range_future_{col}",
                severity="MEDIUM",
                passed=False,
                detail=(
                    f"[{_table_ko(table_name)}] {_col_ko(col)}에 미래 날짜가 "
                    f"{future_count}건 있습니다 (기준: {max_date})"
                )
            ))

        if past_count > 0:
            results.append(DQResult(
                check_name=f"date_range_past_{col}",
                severity="MEDIUM",
                passed=False,
                detail=(
                    f"[{_table_ko(table_name)}] {_col_ko(col)}에 "
                    f"{DATE_RANGE_PAST_YEARS}년 이전 날짜가 {past_count}건 있습니다"
                )
            ))

        if future_count == 0 and past_count == 0:
            results.append(DQResult(
                check_name=f"date_range_{col}",
                severity="MEDIUM",
                passed=True,
                detail=f"[{_table_ko(table_name)}] {_col_ko(col)} 날짜 범위 정상"
            ))
    return results


def check_period_continuity(df: pl.DataFrame, table_name: str, _config: AppConfig) -> list[DQResult]:
    """기간 연속성 검사 (MEDIUM — 빠진 기간 경고).

    period 컬럼(YYYY-MM 형식)이 있는 테이블에서 기간 연속성을 확인합니다.
    예: 2025-01, 2025-03만 있고 2025-02가 없으면 경고.
    """
    results = []
    if "period" not in df.columns:
        return results

    periods = df["period"].drop_nulls().unique().sort().to_list()
    if len(periods) < 2:
        return results

    # YYYY-MM 형식 파싱
    parsed = []
    for p in periods:
        p_str = str(p).strip()
        if len(p_str) >= 7 and p_str[4] == "-":
            try:
                year = int(p_str[:4])
                month = int(p_str[5:7])
                parsed.append((year, month, p_str))
            except ValueError:
                continue

    if len(parsed) < 2:
        return results

    parsed.sort()
    missing_periods = []

    for i in range(len(parsed) - 1):
        y1, m1, _ = parsed[i]
        y2, m2, _ = parsed[i + 1]

        # 다음 기간 계산
        expected_y = y1 + (m1 // 12)
        expected_m = (m1 % 12) + 1

        while (expected_y, expected_m) < (y2, m2):
            missing_periods.append(f"{expected_y}-{expected_m:02d}")
            expected_y = expected_y + (expected_m // 12)
            expected_m = (expected_m % 12) + 1

    if missing_periods:
        # 최대 5개까지만 표시
        display = ", ".join(missing_periods[:5])
        extra = f" 외 {len(missing_periods) - 5}건" if len(missing_periods) > 5 else ""
        results.append(DQResult(
            check_name="period_continuity",
            severity="MEDIUM",
            passed=False,
            detail=(
                f"[{_table_ko(table_name)}] 빠진 기간이 있습니다: "
                f"{display}{extra} (총 {len(missing_periods)}건)"
            )
        ))
    else:
        results.append(DQResult(
            check_name="period_continuity",
            severity="MEDIUM",
            passed=True,
            detail=f"[{_table_ko(table_name)}] 기간 연속성 정상"
        ))
    return results


def check_cross_validation(
    df: pl.DataFrame,
    table_name: str,
    _config: AppConfig,
    context_dfs: dict[str, pl.DataFrame] | None = None,
) -> list[DQResult]:
    """교차 검증 (MEDIUM — 테이블 간 데이터 정합성 경고).

    현재 배치에서 같이 적재되는 다른 테이블의 DataFrame을 context_dfs로 받아 검증합니다.
    context_dfs가 없으면 단일 테이블 내 교차 검증만 수행합니다.
    """
    results = []

    if context_dfs is None:
        context_dfs = {}

    # 출고수량 합 > 재고수량 경고
    if table_name == "fact_shipment" and "fact_inventory_snapshot" in context_dfs:
        inv_df = context_dfs["fact_inventory_snapshot"]
        if "qty_shipped" in df.columns and "onhand_qty" in inv_df.columns:
            total_shipped = df["qty_shipped"].cast(pl.Float64, strict=False).sum()
            total_onhand = inv_df["onhand_qty"].cast(pl.Float64, strict=False).sum()
            if total_shipped is not None and total_onhand is not None:
                if total_shipped > total_onhand:
                    results.append(DQResult(
                        check_name="cross_shipment_vs_inventory",
                        severity="MEDIUM",
                        passed=False,
                        detail=(
                            f"[교차검증] 총 출고수량({total_shipped:,.0f})이 "
                            f"총 보유수량({total_onhand:,.0f})보다 큽니다"
                        )
                    ))

    # 반품수량 > 출고수량 경고
    if table_name == "fact_return" and "fact_shipment" in context_dfs:
        ship_df = context_dfs["fact_shipment"]
        if "qty_returned" in df.columns and "qty_shipped" in ship_df.columns:
            total_returned = df["qty_returned"].cast(pl.Float64, strict=False).sum()
            total_shipped = ship_df["qty_shipped"].cast(pl.Float64, strict=False).sum()
            if total_returned is not None and total_shipped is not None:
                if total_returned > total_shipped:
                    results.append(DQResult(
                        check_name="cross_return_vs_shipment",
                        severity="MEDIUM",
                        passed=False,
                        detail=(
                            f"[교차검증] 총 반품수량({total_returned:,.0f})이 "
                            f"총 출고수량({total_shipped:,.0f})보다 큽니다"
                        )
                    ))

    return results


# ═══════════════════════════════════════════════════════════════
# 통합 실행
# ═══════════════════════════════════════════════════════════════


def run_all_checks(
    df: pl.DataFrame,
    table_name: str,
    config: AppConfig,
    context_dfs: dict[str, pl.DataFrame] | None = None,
) -> list[DQResult]:
    """모든 DQ 검사를 실행합니다.

    Args:
        df: 검사 대상 DataFrame
        table_name: 테이블 이름
        config: 설정 객체
        context_dfs: 교차 검증을 위한 다른 테이블 DataFrames (선택)
    """
    results: list[DQResult] = []

    # CRITICAL / HIGH (실패 시 파일 거부)
    results.extend(check_required_columns(df, table_name, config))
    results.extend(check_null_business_keys(df, table_name, config))
    results.extend(check_duplicate_business_keys(df, table_name, config))
    results.extend(check_type_coercion(df, table_name, config))
    if table_name == "fact_charge_actual":
        results.extend(check_charge_types(df, config))
    results.extend(check_quantity_range(df, table_name, config))

    # MEDIUM (경고만, 파일 거부 안 함)
    results.extend(check_amount_outlier(df, table_name, config))
    results.extend(check_date_range(df, table_name, config))
    results.extend(check_period_continuity(df, table_name, config))
    results.extend(check_cross_validation(df, table_name, config, context_dfs))

    return results


def has_failures(results: list[DQResult]) -> bool:
    """CRITICAL 또는 HIGH 검사 실패가 있는지 확인합니다."""
    return any(not r.passed and r.severity in ("CRITICAL", "HIGH") for r in results)


def format_results_summary(results: list[DQResult]) -> str:
    """DQ 결과를 한글 요약 문자열로 변환합니다."""
    failures = [r for r in results if not r.passed and r.severity in ("CRITICAL", "HIGH")]
    warnings = [r for r in results if not r.passed and r.severity in ("MEDIUM", "LOW")]

    lines = []
    if failures:
        lines.append(f"=== 심각 오류 ({len(failures)}건) — 파일이 거부됩니다 ===")
        for r in failures:
            lines.append(f"  [{r.severity}] {r.detail}")

    if warnings:
        lines.append(f"=== 경고 ({len(warnings)}건) — 참고하세요 ===")
        for r in warnings:
            lines.append(f"  [{r.severity}] {r.detail}")

    if not failures and not warnings:
        lines.append("모든 검사를 통과했습니다.")

    return "\n".join(lines)
