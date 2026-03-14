# Upload Template Guide

이 문서는 업로드 화면에서 사용하는 공통 업로드 계약을 설명한다.

관련 문서:
- `docs/raw-to-core-mapping.md`
- `docs/metric-catalog.md`
- `docs/phase2-upload-schema-proposal.md`

## 목적

현재 업로드 계약은 두 단계로 본다.

- Phase 1: 여러 원천 시스템에서 공통으로 받을 수 있는 최소 필수 컬럼
- Phase 2: 운영 해상도와 P&L 설명력을 높이기 위한 선택 컬럼 확장

중요한 원칙:
- Phase 1 필수 컬럼은 유지한다
- Phase 2 컬럼은 대부분 optional이다
- 기존 파일 형식은 계속 허용한다

## 공통 규칙

- 업로드 파일은 CSV, XLSX, XLS를 지원한다
- 헤더는 템플릿 기준 이름을 권장한다
- 유사한 헤더는 내장 alias와 `ops.column_mappings`로 매핑한다
- 필수 컬럼이 비면 해당 행은 건너뛴다
- 선택 컬럼은 비어 있어도 적재 가능하다

## 1. Inventory Snapshot

테이블:
- `raw.upload_inventory_snapshot`

필수:
- `snapshot_date`
- `warehouse_id`
- `item_id`
- `onhand_qty`

Phase 1 선택:
- `lot_id`
- `sellable_qty`
- `blocked_qty`
- `expiry_date`
- `mfg_date`
- `qc_status`
- `hold_flag`
- `source_system`

Phase 2 선택:
- `owner_id`
- `inventory_status`
- `channel_store_id`
- `reserved_qty`
- `damaged_qty`
- `in_transit_qty`
- `safety_stock_qty`
- `unit_cost`
- `country`
- `source_updated_at`

## 2. Purchase Order

테이블:
- `raw.upload_purchase_order`

필수:
- `po_id`
- `po_date`
- `supplier_id`
- `item_id`
- `qty_ordered`

Phase 1 선택:
- `eta_date`
- `unit_price`
- `currency`
- `incoterms`
- `source_system`

Phase 2 선택:
- `po_line_id`
- `warehouse_id`
- `country`
- `expected_lead_time_days`
- `order_status`
- `buyer_id`
- `moq_qty`
- `pack_size`
- `tax_amount`
- `source_updated_at`

## 3. Receipt

테이블:
- `raw.upload_receipt`

필수:
- `receipt_id`
- `receipt_date`
- `warehouse_id`
- `item_id`
- `qty_received`

Phase 1 선택:
- `po_id`
- `lot_id`
- `expiry_date`
- `mfg_date`
- `qc_status`
- `source_system`

Phase 2 선택:
- `receipt_line_id`
- `po_line_id`
- `putaway_completed_at`
- `inspection_result`
- `damaged_qty`
- `short_received_qty`
- `excess_received_qty`
- `carrier_id`
- `dock_id`
- `source_updated_at`

## 4. Shipment

테이블:
- `raw.upload_shipment`

필수:
- `shipment_id`
- `ship_date`
- `warehouse_id`
- `item_id`
- `qty_shipped`

Phase 1 선택:
- `lot_id`
- `weight`
- `volume_cbm`
- `channel_order_id`
- `channel_store_id`
- `source_system`

Phase 2 선택:
- `shipment_line_id`
- `order_id`
- `order_line_id`
- `country`
- `carrier_id`
- `tracking_no`
- `shipping_fee`
- `promised_ship_date`
- `delivered_at`
- `source_updated_at`

## 5. Return

테이블:
- `raw.upload_return`

필수:
- `return_id`
- `return_date`
- `warehouse_id`
- `item_id`
- `qty_returned`

Phase 1 선택:
- `lot_id`
- `channel_order_id`
- `reason`
- `disposition`
- `source_system`

Phase 2 선택:
- `return_line_id`
- `channel_store_id`
- `order_id`
- `order_line_id`
- `refund_amount`
- `return_shipping_fee`
- `return_reason_code`
- `return_quality_grade`
- `resellable_flag`
- `source_updated_at`

## 6. Sales / Settlement

테이블:
- `raw.upload_sales`

현재 의미:
- 주문 원장 전체가 아니라 매출/정산 라인 성격이 강하다

필수:
- `settlement_id`
- `line_no`
- `period`
- `channel_store_id`
- `currency`
- `gross_sales`

Phase 1 선택:
- `item_id`
- `discounts`
- `fees`
- `refunds`
- `net_payout`
- `source_system`

Phase 2 선택:
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
- `source_updated_at`

## 7. Charge

테이블:
- `raw.upload_charge`

현재 의미:
- 운송비, 3PL, 플랫폼 청구 등 실제 비용 라인

필수:
- `invoice_no`
- `invoice_line_no`
- `charge_type`
- `amount`
- `currency`
- `period`

Phase 1 선택:
- `invoice_date`
- `vendor_partner_id`
- `charge_basis`
- `reference_type`
- `reference_id`
- `channel_store_id`
- `warehouse_id`
- `country`
- `source_system`

Phase 2 선택:
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
- `source_updated_at`

## 추천 확장 순서

1. `upload_sales` 확장
2. `upload_charge` 확장
3. `upload_shipment` / `upload_return` 연결 키 확장
4. `upload_inventory_snapshot` / `upload_purchase_order` / `upload_receipt` 운영 컬럼 확장

이 순서가 P&L 설명력과 SCM 추적력을 가장 빠르게 올린다.
