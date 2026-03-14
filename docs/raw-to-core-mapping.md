# Raw To Core Mapping Guide

이 문서는 업로드 파일이 `raw`에 적재된 뒤, 어떤 식으로 `core`와 `mart`에 연결되는지 설명한다.

관련 문서:
- `docs/upload-template-guide.md`
- `docs/metric-catalog.md`
- `docs/phase2-upload-schema-proposal.md`

## 계층 원칙

- `raw`: 업로드 원본 계약 테이블
- `core`: 분석과 추적에 쓰는 정규화 테이블
- `mart`: 화면과 리포트가 직접 읽는 집계 테이블

핵심 원칙:
- `raw`는 가능한 한 원본을 보존한다
- `core`에서 키와 타입을 정리한다
- `mart`에서 화면용 집계와 계산을 만든다

## Inventory Snapshot

`raw.upload_inventory_snapshot` -> `core.fact_inventory_snapshot`

핵심 매핑:
- `snapshot_date` -> `snapshot_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `lot_id` -> `lot_id`
- `onhand_qty` -> `onhand_qty`
- `expiry_date` -> `expiry_date`
- `qc_status` -> `qc_status`
- `hold_flag` -> `hold_flag`

Phase 2 보조 컬럼:
- `owner_id`
- `inventory_status`
- `channel_store_id`
- `reserved_qty`
- `damaged_qty`
- `in_transit_qty`
- `safety_stock_qty`
- `unit_cost`
- `country`

주 사용 mart:
- `mart.mart_inventory_onhand`
- `mart.mart_stockout_risk`

## Purchase Order

`raw.upload_purchase_order` -> `core.fact_po`

핵심 매핑:
- `po_id` -> `po_id`
- `po_date` -> `po_date`
- `supplier_id` -> `supplier_id`
- `item_id` -> `item_id`
- `qty_ordered` -> `qty_ordered`
- `eta_date` -> `eta_date`
- `currency` -> `currency`
- `unit_price` -> `unit_price`
- `incoterms` -> `incoterms`

Phase 2 보조 컬럼:
- `po_line_id`
- `warehouse_id`
- `country`
- `expected_lead_time_days`
- `order_status`
- `buyer_id`
- `moq_qty`
- `pack_size`
- `tax_amount`

주 사용 mart:
- `mart.mart_open_po`
- 리드타임 분석 뷰/집계

## Receipt

`raw.upload_receipt` -> `core.fact_receipt`

핵심 매핑:
- `receipt_id` -> `receipt_id`
- `receipt_date` -> `receipt_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_received` -> `qty_received`
- `po_id` -> `po_id`
- `lot_id` -> `lot_id`

Phase 2 보조 컬럼:
- `receipt_line_id`
- `po_line_id`
- `putaway_completed_at`
- `inspection_result`
- `damaged_qty`
- `short_received_qty`
- `excess_received_qty`
- `carrier_id`
- `dock_id`

주 사용 mart:
- `mart.mart_open_po`
- 리드타임 분석

## Shipment

`raw.upload_shipment` -> `core.fact_shipment`

핵심 매핑:
- `shipment_id` -> `shipment_id`
- `ship_date` -> `ship_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_shipped` -> `qty_shipped`
- `lot_id` -> `lot_id`
- `channel_order_id` -> `channel_order_id`
- `channel_store_id` -> `channel_store_id`

Phase 2 보조 컬럼:
- `shipment_line_id`
- `order_id`
- `order_line_id`
- `country`
- `carrier_id`
- `tracking_no`
- `shipping_fee`
- `promised_ship_date`
- `delivered_at`

주 사용 mart:
- 출고/반품 집계
- 품절 위험 계산 보조

## Return

`raw.upload_return` -> `core.fact_return`

핵심 매핑:
- `return_id` -> `return_id`
- `return_date` -> `return_date`
- `warehouse_id` -> `warehouse_id`
- `item_id` -> `item_id`
- `qty_returned` -> `qty_returned`
- `channel_order_id` -> `channel_order_id`
- `reason` -> `reason`
- `disposition` -> `disposition`

Phase 2 보조 컬럼:
- `return_line_id`
- `channel_store_id`
- `order_id`
- `order_line_id`
- `refund_amount`
- `return_shipping_fee`
- `return_reason_code`
- `return_quality_grade`
- `resellable_flag`

주 사용 mart:
- 반품 분석
- 수익성 손실 분석

## Sales / Settlement

`raw.upload_sales` -> `core.fact_settlement`

핵심 매핑:
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

Phase 2 보조 컬럼:
- `order_id`
- `order_line_id`
- `order_date`
- `ship_date`
- `country`
- `quantity_sold`
- `unit_selling_price`
- `tax_amount`
- `promo_cost`
- `platform_fee`
- `payment_fee`
- `coupon_amount`
- `sales_channel_group`

주 사용 mart:
- `mart.mart_pnl_revenue`

## Charge

`raw.upload_charge` -> `core.fact_charge_actual`

핵심 매핑:
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

Phase 2 보조 컬럼:
- `supplier_id`
- `charge_category`
- `cost_center`
- `item_id`
- `allocation_key`
- `allocation_basis_value`
- `tax_amount`
- `invoice_status`
- `reference_period`
- `accrual_flag`

주 사용 mart:
- 비용 집계
- 공헌이익
- 영업이익

## 운영 메타 컬럼

모든 업로드 raw 테이블은 아래 운영 메타 컬럼을 갖는다.

- `batch_id`
- `source_file_name`
- `source_row_no`
- `uploaded_at`
- `source_system`
- `source_updated_at` (Phase 2 이후 일부 테이블)

이 컬럼들은 추적과 재처리에 중요하다.

## Phase 2 핵심 포인트

가장 먼저 강화할 영역:

1. `upload_sales`
2. `upload_charge`
3. `upload_shipment` / `upload_return`

이유:
- 매출, 비용, 반품, 물류 연결이 수익성 설명력에 가장 큰 영향을 준다.

## 변경 원칙

업로드 계약을 바꿀 때는 아래를 같이 맞춘다.

1. `migrations/*upload_contracts*.sql`
2. `frontend/src/api/uploadApi.ts`
3. `docs/upload-template-guide.md`
4. 필요 시 `core`/`mart` 계산 로직
