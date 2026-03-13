# 업로드 템플릿 가이드

이 문서는 사용자가 어떤 형식으로 원본 데이터를 준비해야 하는지 설명합니다.
현재 프론트의 업로드 화면은 템플릿 다운로드와 안내가 중심이며, 실제 적재 파이프라인은 별도 처리 기준을 따릅니다.

기준 문서:
- `docs/project-principles.md`
- `docs/raw-to-core-mapping.md`
- `docs/metric-catalog.md`

## 기본 원칙

- 원본 파일 형식은 CSV 또는 엑셀로 받을 수 있습니다.
- 컬럼명은 템플릿 기준을 권장합니다.
- 회사 내부 컬럼명이 다르더라도 같은 의미로 매핑할 수 있으면 됩니다.
- 필수 컬럼이 없으면 해당 데이터셋은 적재할 수 없습니다.
- 권장 컬럼은 없더라도 적재는 가능하지만, 지표 품질이 떨어질 수 있습니다.

## 먼저 맞춰야 하는 5개 데이터셋

이 프로젝트는 우선 아래 5개 데이터셋을 공통 업로드 기준으로 삼습니다.

1. 재고 스냅샷
2. 발주 / 입고
3. 출고 / 반품
4. 매출
5. 비용

실제 DB에는 운영상 이유로 발주와 입고, 출고와 반품을 각각 별도 테이블로 받습니다.

## 1. 재고 스냅샷 템플릿

사용 목적:
- 재고 현황
- 품절 위험
- 과재고
- 유통기한 옵션 지표

필수 컬럼:
- `snapshot_date`
- `warehouse_id`
- `item_id`
- `onhand_qty`

권장 컬럼:
- `lot_id`
- `sellable_qty`
- `blocked_qty`

선택 컬럼:
- `expiry_date`
- `mfg_date`
- `qc_status`
- `hold_flag`
- `source_system`

예시 헤더:
```csv
snapshot_date,warehouse_id,item_id,lot_id,onhand_qty,sellable_qty,blocked_qty,expiry_date,mfg_date,qc_status,hold_flag,source_system
```

## 2. 발주 템플릿

사용 목적:
- 미입고 발주
- 리드타임

필수 컬럼:
- `po_id`
- `po_date`
- `supplier_id`
- `item_id`
- `qty_ordered`

권장 컬럼:
- `eta_date`
- `unit_price`
- `currency`

선택 컬럼:
- `incoterms`
- `source_system`

예시 헤더:
```csv
po_id,po_date,supplier_id,item_id,qty_ordered,eta_date,unit_price,currency,incoterms,source_system
```

## 3. 입고 템플릿

사용 목적:
- 미입고 잔량 계산
- 발주 대비 실제 입고
- 리드타임 계산

필수 컬럼:
- `receipt_id`
- `receipt_date`
- `warehouse_id`
- `item_id`
- `qty_received`

권장 컬럼:
- `po_id`
- `lot_id`

선택 컬럼:
- `expiry_date`
- `mfg_date`
- `qc_status`
- `source_system`

예시 헤더:
```csv
receipt_id,receipt_date,warehouse_id,item_id,qty_received,po_id,lot_id,expiry_date,mfg_date,qc_status,source_system
```

## 4. 출고 템플릿

사용 목적:
- 출고 추이
- 물류 처리량
- 주문 대비 출고

필수 컬럼:
- `shipment_id`
- `ship_date`
- `warehouse_id`
- `item_id`
- `qty_shipped`

권장 컬럼:
- `channel_order_id`
- `channel_store_id`
- `lot_id`

선택 컬럼:
- `weight`
- `volume_cbm`
- `source_system`

예시 헤더:
```csv
shipment_id,ship_date,warehouse_id,item_id,qty_shipped,lot_id,channel_order_id,channel_store_id,weight,volume_cbm,source_system
```

## 5. 반품 템플릿

사용 목적:
- 반품 분석
- 반품 사유 요약

필수 컬럼:
- `return_id`
- `return_date`
- `warehouse_id`
- `item_id`
- `qty_returned`

권장 컬럼:
- `channel_order_id`
- `reason`
- `disposition`

선택 컬럼:
- `lot_id`
- `source_system`

예시 헤더:
```csv
return_id,return_date,warehouse_id,item_id,qty_returned,lot_id,channel_order_id,reason,disposition,source_system
```

## 6. 매출 템플릿

사용 목적:
- 매출
- 매출총이익
- 공헌이익

필수 컬럼:
- `period`
- `channel_store_id`
- `item_id`
- `gross_sales`

권장 컬럼:
- `discounts`
- `refunds`
- `fees`
- `net_payout`

선택 컬럼:
- `settlement_id`
- `line_no`
- `currency`
- `source_system`

예시 헤더:
```csv
period,channel_store_id,item_id,gross_sales,discounts,refunds,fees,net_payout,currency,settlement_id,line_no,source_system
```

## 7. 비용 템플릿

사용 목적:
- 변동비
- 공헌이익
- 비용 배분

필수 컬럼:
- `invoice_no`
- `invoice_line_no`
- `charge_type`
- `amount`
- `currency`
- `period`

권장 컬럼:
- `invoice_date`
- `vendor_partner_id`
- `channel_store_id`
- `warehouse_id`

선택 컬럼:
- `country`
- `reference_type`
- `reference_id`
- `charge_basis`
- `source_system`

예시 헤더:
```csv
invoice_no,invoice_line_no,charge_type,amount,currency,period,invoice_date,vendor_partner_id,channel_store_id,warehouse_id,country,reference_type,reference_id,charge_basis,source_system
```

## 필수 체크 기준

업로드 전 최소한 아래는 맞아야 합니다.

- 날짜 컬럼은 실제 날짜여야 합니다.
- 수량과 금액 컬럼에는 숫자만 들어가야 합니다.
- ID 컬럼은 빈 값이 아니어야 합니다.
- `period`는 `YYYY-MM` 형식을 권장합니다.
- 하나의 파일 안에서 헤더는 한 번만 나와야 합니다.

## 스키마와 함께 바뀌어야 하는 것

템플릿을 바꾸면 아래도 함께 바뀌어야 합니다.

1. `raw` 업로드 테이블
2. `core` 표준 컬럼 매핑
3. `mart` 집계 기준
4. Supabase 마이그레이션

즉 템플릿 문서만 바꾸는 방식은 허용하지 않습니다.

## 현재 상태

- 템플릿 다운로드: 가능
- 실제 업로드 적재: 운영 파이프라인 기준으로 별도 처리
- DB 기준 계약: `migrations/11_upload_contracts.sql`

