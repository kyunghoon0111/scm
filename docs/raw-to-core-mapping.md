# Raw To Core 매핑 가이드

이 문서는 업로드 파일이 DB 안에서 어떻게 표준 데이터로 정리되는지 설명합니다.

핵심 구조:
- `raw`: 업로드 받은 원본 계약 테이블
- `core`: 분석과 집계에 쓰는 표준 테이블
- `mart`: 화면에서 바로 쓰는 결과 테이블 / 뷰

기준 문서:
- `docs/upload-template-guide.md`
- `docs/metric-catalog.md`

## 왜 이 단계가 필요한가

회사마다 파일 이름과 컬럼명이 다릅니다.

예를 들어 같은 의미라도 아래처럼 제각각일 수 있습니다.
- `상품코드`
- `SKU`
- `ITEM_CD`
- `품번`

그래서 원본 파일을 바로 대시보드에 쓰지 않고, 먼저 `core` 표준 컬럼으로 정리합니다.

## 공통 매핑 원칙

- 같은 의미면 원본 컬럼명은 달라도 됩니다.
- `core`에서는 이름과 의미를 고정합니다.
- 숫자와 날짜는 `raw` 적재 단계에서 1차 정리합니다.
- 계산용 지표는 `mart`에서 만듭니다.

## 매핑 대상 데이터셋

### 1. 재고 스냅샷

`raw.upload_inventory_snapshot` -> `core.fact_inventory_snapshot`

주요 매핑:
- `snapshot_date` -> `snapshot_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `lot_id` -> `lot_id`
- `onhand_qty` -> `onhand_qty`
- `expiry_date` -> `expiry_date`
- `qc_status` -> `qc_status`
- `hold_flag` -> `hold_flag`

추가 규칙:
- `lot_id`가 비면 `__NONE__`으로 정규화
- `sellable_qty`, `blocked_qty`는 `raw` 보조 정보로 저장하고 `mart` 계산에 활용 가능

### 2. 발주

`raw.upload_purchase_order` -> `core.fact_po`

주요 매핑:
- `po_id` -> `po_id`
- `po_date` -> `po_date`
- `supplier_id` -> `supplier_id`
- `item_id` -> `item_id`
- `qty_ordered` -> `qty_ordered`
- `eta_date` -> `eta_date`
- `incoterms` -> `incoterms`
- `currency` -> `currency`
- `unit_price` -> `unit_price`

### 3. 입고

`raw.upload_receipt` -> `core.fact_receipt`

주요 매핑:
- `receipt_id` -> `receipt_id`
- `receipt_date` -> `receipt_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_received` -> `qty_received`
- `po_id` -> `po_id`
- `lot_id` -> `lot_id`
- `expiry_date` -> `expiry_date`
- `mfg_date` -> `mfg_date`
- `qc_status` -> `qc_status`

### 4. 출고

`raw.upload_shipment` -> `core.fact_shipment`

주요 매핑:
- `shipment_id` -> `shipment_id`
- `ship_date` -> `ship_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_shipped` -> `qty_shipped`
- `lot_id` -> `lot_id`
- `weight` -> `weight`
- `volume_cbm` -> `volume_cbm`
- `channel_order_id` -> `channel_order_id`
- `channel_store_id` -> `channel_store_id`

### 5. 반품

`raw.upload_return` -> `core.fact_return`

주요 매핑:
- `return_id` -> `return_id`
- `return_date` -> `return_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_returned` -> `qty_returned`
- `lot_id` -> `lot_id`
- `channel_order_id` -> `channel_order_id`
- `reason` -> `reason`
- `disposition` -> `disposition`

### 6. 매출

`raw.upload_sales` -> `core.fact_settlement`

주요 매핑:
- `settlement_id` -> `settlement_id`
- `line_no` -> `line_no`
- `period` -> `period`
- `channel_store_id` -> `channel_store_id`
- `currency` -> `currency`
- `item_id` -> `item_id`
- `gross_sales` -> `gross_sales`
- `discounts` -> `discounts`
- `fees` -> `fees`
- `refunds` -> `refunds`
- `net_payout` -> `net_payout`

### 7. 비용

`raw.upload_charge` -> `core.fact_charge_actual`

주요 매핑:
- `invoice_no` -> `invoice_no`
- `invoice_line_no` -> `invoice_line_no`
- `charge_type` -> `charge_type`
- `amount` -> `amount`
- `currency` -> `currency`
- `period` -> `period`
- `invoice_date` -> `invoice_date`
- `vendor_partner_id` -> `vendor_partner_id`
- `charge_basis` -> `charge_basis`
- `reference_type` -> `reference_type`
- `reference_id` -> `reference_id`
- `channel_store_id` -> `channel_store_id`
- `warehouse_id` -> `warehouse_id`
- `country` -> `country`

## Raw 에서 추가로 보관하는 운영 컬럼

모든 업로드 계약 테이블은 아래 운영 컬럼을 함께 가집니다.

- `batch_id`
- `source_file_name`
- `source_row_no`
- `uploaded_at`

이 컬럼들은 사용자 화면용 지표가 아니라, 추적과 재처리를 위한 운영 메타데이터입니다.

## Mart 와 연결되는 방식

`core`로 정리된 데이터는 아래 화면 지표로 이어집니다.

- `core.fact_inventory_snapshot` -> `mart_inventory_onhand`, `mart_stockout_risk`
- `core.fact_po` + `core.fact_receipt` -> `mart_open_po`, `v_lead_time_analysis`
- `core.fact_shipment` + `core.fact_return` -> `mart_shipment_daily`, `mart_return_analysis`
- `core.fact_settlement` -> `mart_pnl_revenue`
- `core.fact_charge_actual` + 원가 구조 -> `mart_pnl_variable_cost`, `mart_pnl_contribution`, `mart_pnl_operating_profit`

## 변경 원칙

새 템플릿을 추가하거나 컬럼을 바꿀 때는 아래를 같이 수정해야 합니다.

1. `docs/upload-template-guide.md`
2. `docs/raw-to-core-mapping.md`
3. 관련 `raw/core/mart` SQL
4. Supabase 마이그레이션

문서만 먼저 바꾸고 DB를 나중에 바꾸는 방식은 허용하지 않습니다.

