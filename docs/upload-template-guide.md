# 업로드 파일 형식 안내

데이터를 업로드할 때 파일에 어떤 열(컬럼)이 있어야 하는지 정리합니다.

---

## 공통 규칙

- **파일 형식**: CSV, XLSX, XLS 모두 가능
- **헤더**: 첫 번째 행에 컬럼 이름이 있어야 합니다
- **필수 열**: 반드시 값이 있어야 합니다. 비어있으면 해당 행은 건너뜁니다
- **선택 열**: 없어도 업로드 가능합니다. 있으면 더 정밀한 분석이 됩니다
- **유사한 헤더명**: 시스템이 자동으로 매핑합니다 (예: "재고수량" → onhand_qty)

---

## 1. 재고 현황 (Inventory Snapshot)

현재 창고에 있는 재고를 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | snapshot_date | 재고 기준일 (예: 2025-03-01) |
| **필수** | warehouse_id | 창고 코드 |
| **필수** | item_id | 품목 코드 |
| **필수** | onhand_qty | 보유 수량 |
| 선택 | lot_id | 로트 번호 |
| 선택 | sellable_qty | 판매 가능 수량 |
| 선택 | blocked_qty | 보류/차단 수량 |
| 선택 | expiry_date | 유통기한 |
| 선택 | mfg_date | 제조일 |
| 선택 | qc_status | 품질검사 상태 |
| 선택 | hold_flag | 보류 여부 |
| 선택 | source_system | 출처 시스템명 |
| 선택 | owner_id | 소유자/위탁자 코드 |
| 선택 | inventory_status | 재고 상태 (정상/불량/반품 등) |
| 선택 | channel_store_id | 판매 채널 |
| 선택 | reserved_qty | 예약 수량 |
| 선택 | damaged_qty | 파손 수량 |
| 선택 | in_transit_qty | 이동 중 수량 |
| 선택 | safety_stock_qty | 안전재고 수량 |
| 선택 | unit_cost | 단가 |
| 선택 | country | 국가 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-inventory.csv`

---

## 2. 발주 (Purchase Order)

공급사에 발주한 내역을 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | po_id | 발주 번호 |
| **필수** | po_date | 발주일 |
| **필수** | supplier_id | 공급사 코드 |
| **필수** | item_id | 품목 코드 |
| **필수** | qty_ordered | 발주 수량 |
| 선택 | eta_date | 예상 도착일 |
| 선택 | unit_price | 단가 |
| 선택 | currency | 통화 (KRW, USD 등) |
| 선택 | incoterms | 무역 조건 (FOB, CIF 등) |
| 선택 | source_system | 출처 시스템명 |
| 선택 | po_line_id | 발주 행 번호 |
| 선택 | warehouse_id | 입고 창고 |
| 선택 | country | 국가 |
| 선택 | expected_lead_time_days | 예상 리드타임 (일) |
| 선택 | order_status | 발주 상태 |
| 선택 | buyer_id | 구매 담당자 코드 |
| 선택 | moq_qty | 최소 주문 수량 |
| 선택 | pack_size | 포장 단위 |
| 선택 | tax_amount | 세금 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-purchase-order.csv`

---

## 3. 입고 (Receipt)

물건이 실제로 창고에 도착한 내역을 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | receipt_id | 입고 번호 |
| **필수** | receipt_date | 입고일 |
| **필수** | warehouse_id | 창고 코드 |
| **필수** | item_id | 품목 코드 |
| **필수** | qty_received | 입고 수량 |
| 선택 | po_id | 원래 발주 번호 (연결용) |
| 선택 | lot_id | 로트 번호 |
| 선택 | expiry_date | 유통기한 |
| 선택 | mfg_date | 제조일 |
| 선택 | qc_status | 품질검사 상태 |
| 선택 | source_system | 출처 시스템명 |
| 선택 | receipt_line_id | 입고 행 번호 |
| 선택 | po_line_id | 발주 행 번호 (연결용) |
| 선택 | putaway_completed_at | 적치 완료 시각 |
| 선택 | inspection_result | 검수 결과 |
| 선택 | damaged_qty | 파손 수량 |
| 선택 | short_received_qty | 부족 입고 수량 |
| 선택 | excess_received_qty | 초과 입고 수량 |
| 선택 | carrier_id | 운송사 코드 |
| 선택 | dock_id | 도크/하역장 코드 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-receipt.csv`

---

## 4. 출고 (Shipment)

창고에서 물건을 내보낸 내역을 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | shipment_id | 출고 번호 |
| **필수** | ship_date | 출고일 |
| **필수** | warehouse_id | 출고 창고 |
| **필수** | item_id | 품목 코드 |
| **필수** | qty_shipped | 출고 수량 |
| 선택 | lot_id | 로트 번호 |
| 선택 | weight | 중량 |
| 선택 | volume_cbm | 체적 (CBM) |
| 선택 | channel_order_id | 주문 번호 |
| 선택 | channel_store_id | 판매 채널 |
| 선택 | source_system | 출처 시스템명 |
| 선택 | shipment_line_id | 출고 행 번호 |
| 선택 | order_id | 주문 ID |
| 선택 | order_line_id | 주문 행 번호 |
| 선택 | country | 국가 |
| 선택 | carrier_id | 택배사/운송사 코드 |
| 선택 | tracking_no | 운송장 번호 |
| 선택 | shipping_fee | 배송비 |
| 선택 | promised_ship_date | 약속 출고일 |
| 선택 | delivered_at | 배송 완료 시각 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-shipment.csv`

---

## 5. 반품 (Return)

고객이 반품한 내역을 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | return_id | 반품 번호 |
| **필수** | return_date | 반품일 |
| **필수** | warehouse_id | 입고 창고 |
| **필수** | item_id | 품목 코드 |
| **필수** | qty_returned | 반품 수량 |
| 선택 | lot_id | 로트 번호 |
| 선택 | channel_order_id | 원래 주문 번호 |
| 선택 | reason | 반품 사유 |
| 선택 | disposition | 처분 방법 (재입고/폐기 등) |
| 선택 | source_system | 출처 시스템명 |
| 선택 | return_line_id | 반품 행 번호 |
| 선택 | channel_store_id | 판매 채널 |
| 선택 | order_id | 주문 ID |
| 선택 | order_line_id | 주문 행 번호 |
| 선택 | refund_amount | 환불 금액 |
| 선택 | return_shipping_fee | 반품 배송비 |
| 선택 | return_reason_code | 반품 사유 코드 |
| 선택 | return_quality_grade | 반품 품질 등급 |
| 선택 | resellable_flag | 재판매 가능 여부 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-return.csv`

---

## 6. 매출/정산 (Sales)

채널별 매출과 정산 내역을 올립니다. 주문 원장이 아니라 매출/정산 라인 성격입니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | settlement_id | 정산 번호 |
| **필수** | line_no | 행 번호 |
| **필수** | period | 정산 월 (예: 2025-03) |
| **필수** | channel_store_id | 판매 채널 |
| **필수** | currency | 통화 |
| **필수** | gross_sales | 총매출 |
| 선택 | item_id | 품목 코드 |
| 선택 | discounts | 할인액 |
| 선택 | fees | 수수료 |
| 선택 | refunds | 환불액 |
| 선택 | net_payout | 순입금액 |
| 선택 | source_system | 출처 시스템명 |
| 선택 | order_id | 주문 ID |
| 선택 | order_line_id | 주문 행 번호 |
| 선택 | order_date | 주문일 |
| 선택 | ship_date | 출고일 |
| 선택 | country | 국가 |
| 선택 | quantity_sold | 판매 수량 |
| 선택 | unit_selling_price | 판매 단가 |
| 선택 | tax_amount | 세금 |
| 선택 | promo_cost | 프로모션 비용 |
| 선택 | platform_fee | 플랫폼 수수료 |
| 선택 | payment_fee | 결제 수수료 |
| 선택 | coupon_amount | 쿠폰 할인액 |
| 선택 | sales_channel_group | 판매 채널 그룹 (예: 온라인/오프라인) |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-sales.csv`

---

## 7. 비용 (Charge)

운송비, 3PL 비용, 플랫폼 수수료 등 실제 비용 청구 내역을 올립니다.

| 구분 | 열 이름 | 설명 |
|------|---------|------|
| **필수** | invoice_no | 청구서 번호 |
| **필수** | invoice_line_no | 행 번호 |
| **필수** | charge_type | 비용 유형 (운송비, 창고비 등) |
| **필수** | amount | 금액 |
| **필수** | currency | 통화 |
| **필수** | period | 해당 월 |
| 선택 | invoice_date | 청구일 |
| 선택 | vendor_partner_id | 거래처 코드 |
| 선택 | charge_basis | 과금 기준 (건별, 무게별 등) |
| 선택 | reference_type | 참조 유형 |
| 선택 | reference_id | 참조 번호 |
| 선택 | channel_store_id | 관련 채널 |
| 선택 | warehouse_id | 관련 창고 |
| 선택 | country | 국가 |
| 선택 | source_system | 출처 시스템명 |
| 선택 | supplier_id | 공급사 코드 |
| 선택 | charge_category | 비용 분류 |
| 선택 | cost_center | 비용 센터 |
| 선택 | item_id | 품목 코드 |
| 선택 | allocation_key | 배분 기준 키 |
| 선택 | allocation_basis_value | 배분 기준 값 |
| 선택 | tax_amount | 세금 |
| 선택 | invoice_status | 청구서 상태 |
| 선택 | reference_period | 참조 월 |
| 선택 | accrual_flag | 발생주의 여부 |
| 선택 | source_updated_at | 원천 시스템 최종 갱신 시각 |

샘플 파일: `docs/sample-upload-charge.csv`
