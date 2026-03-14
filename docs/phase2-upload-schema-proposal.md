# Phase 2 Upload Schema Proposal

이 문서는 Phase 1의 최소 업로드 계약을 유지하면서, Phase 2에서 어떤 컬럼을 확장해야 운영 데이터 품질과 분석 해상도를 높일 수 있는지 정리한 제안서다.

관련 문서:
- `docs/upload-template-guide.md`
- `docs/raw-to-core-mapping.md`
- `docs/metric-catalog.md`

## Why

Phase 1 업로드 계약은 의도적으로 얇다.

- 여러 채널/ERP/WMS에서 공통 컬럼만 빠르게 받기 쉽다
- 초기 대시보드 검증에는 충분하다
- 대신 실제 운영 분석에 필요한 맥락이 부족하다

특히 아래가 약하다.

- 주문과 출고, 반품, 정산 간 연결 키
- 비용의 성격과 배부 기준
- 세금, 판촉비, 결제수수료, 플랫폼수수료 분리
- SKU 옵션/번들/상품속성
- 재고 소유주, 상태, 채널별 가용 재고

## Principles

Phase 2 확장은 아래 원칙을 따른다.

1. Phase 1 필수 컬럼은 그대로 유지한다.
2. 새 컬럼은 대부분 optional로 시작한다.
3. `raw`는 원천 보존, `core`에서 정규화, `mart`에서 집계 원칙을 유지한다.
4. 공급자가 아직 제공하지 못하는 컬럼 때문에 업로드 전체가 막히지 않게 한다.
5. 분석/정산 추적에 필요한 연결 키는 우선순위를 높게 둔다.

## Dataset Summary

### 1. Inventory Snapshot

Phase 1 핵심:
- `snapshot_date`
- `warehouse_id`
- `item_id`
- `onhand_qty`

Phase 2 추천 추가:
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

의미:
- 단순 현재고를 넘어서 가용재고, 보류재고, 소유주별 재고, 국가/채널별 재고를 분리할 수 있다.

### 2. Purchase Order

Phase 1 핵심:
- `po_id`
- `po_date`
- `supplier_id`
- `item_id`
- `qty_ordered`

Phase 2 추천 추가:
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

의미:
- 라인 수준 추적, 창고별 입고 계획, 실제 리드타임 비교가 쉬워진다.

### 3. Receipt

Phase 1 핵심:
- `receipt_id`
- `receipt_date`
- `warehouse_id`
- `item_id`
- `qty_received`

Phase 2 추천 추가:
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

의미:
- 발주 대비 부족/초과 입고, 검사 결과, 실제 입고 운영 품질까지 볼 수 있다.

### 4. Shipment

Phase 1 핵심:
- `shipment_id`
- `ship_date`
- `warehouse_id`
- `item_id`
- `qty_shipped`

Phase 2 추천 추가:
- `shipment_line_id`
- `order_id`
- `order_line_id`
- `channel_store_id`
- `country`
- `carrier_id`
- `tracking_no`
- `shipping_fee`
- `promised_ship_date`
- `delivered_at`
- `source_updated_at`

의미:
- 주문-출고 연결, 출고 SLA, 물류비와 배송 품질 추적이 가능해진다.

### 5. Return

Phase 1 핵심:
- `return_id`
- `return_date`
- `warehouse_id`
- `item_id`
- `qty_returned`

Phase 2 추천 추가:
- `return_line_id`
- `order_id`
- `order_line_id`
- `channel_store_id`
- `refund_amount`
- `return_shipping_fee`
- `return_reason_code`
- `return_quality_grade`
- `resellable_flag`
- `source_updated_at`

의미:
- 반품 사유 분석뿐 아니라 환불액, 재판매 가능 여부, 채널별 반품 손실까지 계산할 수 있다.

### 6. Sales / Settlement

Phase 1 핵심:
- `settlement_id`
- `line_no`
- `period`
- `channel_store_id`
- `currency`
- `gross_sales`

현재 의미:
- 주문 원장 전체가 아니라 정산/매출 라인에 가깝다.
- 매출총액, 할인, 환불, 수수료, 실수령액 중심이다.

Phase 2 추천 추가:
- `order_id`
- `order_line_id`
- `order_date`
- `ship_date`
- `item_id`를 사실상 필수 수준으로 승격
- `country`
- `tax_amount`
- `promo_cost`
- `platform_fee`
- `payment_fee`
- `coupon_amount`
- `quantity_sold`
- `unit_selling_price`
- `sales_channel_group`
- `source_updated_at`

의미:
- P&L을 단순 정산 요약이 아니라 주문/상품/채널/국가 단위로 더 정확하게 볼 수 있다.

### 7. Charge

Phase 1 핵심:
- `invoice_no`
- `invoice_line_no`
- `charge_type`
- `amount`
- `currency`
- `period`

현재 의미:
- 운송비, 3PL, 외부 청구분 등 실제 비용 라인이다.
- 매출과 직접 연결되지 않는 비용도 담는다.

Phase 2 추천 추가:
- `charge_category`
- `cost_center`
- `supplier_id`
- `channel_store_id`
- `item_id`
- `warehouse_id`
- `country`
- `allocation_key`
- `allocation_basis_value`
- `tax_amount`
- `invoice_status`
- `reference_period`
- `accrual_flag`
- `source_updated_at`

의미:
- 비용의 성격을 분리하고, 채널/상품/창고에 합리적으로 배부할 수 있다.

## Cross-Dataset Keys

Phase 2에서 특히 중요한 연결 키:

- `order_id`
- `order_line_id`
- `po_line_id`
- `shipment_line_id`
- `return_line_id`
- `channel_store_id`
- `item_id`
- `warehouse_id`
- `country`

이 키들이 들어오면 아래 연결이 쉬워진다.

- 주문 -> 출고 -> 반품
- 발주 -> 입고
- 매출 -> 비용 배부
- 상품/채널/국가별 수익성

## Minimum Upgrade Path

한 번에 다 늘리기보다 아래 순서를 권장한다.

### Step 1

Sales와 Charge를 먼저 보강:
- `order_id`
- `order_line_id`
- `country`
- `tax_amount`
- `platform_fee`
- `payment_fee`
- `charge_category`
- `cost_center`
- `allocation_key`

효과:
- P&L 정확도가 가장 빠르게 올라간다.

### Step 2

Shipment와 Return 연결 보강:
- `order_id`
- `order_line_id`
- `channel_store_id`
- `carrier_id`
- `tracking_no`
- `refund_amount`

효과:
- 매출-물류-반품 연결이 된다.

### Step 3

Inventory와 PO/Receipt 운영 컬럼 보강:
- `inventory_status`
- `reserved_qty`
- `owner_id`
- `po_line_id`
- `inspection_result`
- `short_received_qty`

효과:
- SCM 지표 해상도가 올라간다.

## Recommendation

Phase 2에서 가장 먼저 키워야 하는 건 `sales`와 `charge`다.

이유:
- 현재 P&L은 만들 수는 있지만 설명력이 약하다.
- 비용 배부와 채널/상품 수익성 해석이 어렵다.
- 매출과 반품, 수수료, 외부 청구가 느슨하게 연결돼 있다.

즉 우선순위는 아래가 맞다.

1. `upload_sales` 확장
2. `upload_charge` 확장
3. `upload_shipment` / `upload_return` 연결 키 확장
4. `upload_inventory_snapshot` / `upload_purchase_order` / `upload_receipt` 운영 컬럼 확장

## Compatibility Rule

확장 시에도 기존 Phase 1 업로드 파일은 계속 허용하는 것이 좋다.

- 기존 필수 컬럼은 유지
- Phase 2 컬럼은 optional로 추가
- `core`에서 null 허용 후 점진적 품질 향상
- `mart`는 컬럼 존재 여부에 따라 계산식 분기

이 방식이면 현재 데모/운영 흐름을 깨지 않고 확장할 수 있다.
