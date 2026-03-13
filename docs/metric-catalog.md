# 지표 카탈로그 초안

이 문서는 대시보드 지표를 어떤 기준으로 늘릴지 정리한 초안입니다.
핵심은 "무조건 많은 지표"가 아니라, "대부분의 회사에서 바로 쓸 수 있는 지표"와 "특정 업종에서만 의미 있는 지표"를 분리하는 것입니다.

## 왜 이 문서가 필요한가

회사마다 사용하는 문서와 컬럼 이름이 다르고, 같은 뜻의 값도 형식이 제각각입니다.
그래서 처음부터 모든 지표를 한 번에 만들면 구조가 금방 꼬입니다.

지표를 늘릴 때는 아래 순서가 필요합니다.

1. 지표가 범용인지 업종 특화인지 구분
2. 지표 계산에 필요한 최소 컬럼 정의
3. 원본 문서를 `raw -> core`로 어떻게 표준화할지 결정
4. 마지막에 화면용 `mart` 지표로 올리기

## 지표 분류 원칙

### 1. 공통 지표

대부분의 회사가 업종과 관계없이 바로 이해하고 사용할 수 있는 지표입니다.

예시:
- 재고 현황
- 품절 위험
- 미입고 발주
- 리드타임
- 출고/반품
- 매출
- 매출원가
- 공헌이익
- 영업이익
- 수익성 순위

이 그룹은 우선 개발 대상입니다.

### 2. 선택 지표

특정 업종이나 운영 방식에서만 의미가 큰 지표입니다.

예시:
- 유통기한 위험
- FEFO
- 제조일 기반 분석
- 냉장/냉동 보관 리스크
- 로트 단위 추적

이 그룹은 "없어도 시스템이 성립"해야 하며, 필요한 회사만 추가로 켜는 구조가 좋습니다.

## 컬럼 정의 원칙

각 지표는 아래 3단계로 컬럼을 나눕니다.

- 필수 컬럼
  - 이 값이 없으면 지표 계산이 불가능함
- 권장 컬럼
  - 없더라도 계산은 되지만 품질이 떨어짐
- 선택 컬럼
  - 특정 업종, 특정 화면, 고급 분석에서만 사용

## 공통 지표 목록

### SCM

#### 재고 현황

목적:
- 지금 보유한 재고와 판매 가능한 재고를 빠르게 파악

필수 컬럼:
- `snapshot_date`
- `warehouse_id`
- `item_id`
- `onhand_qty`

권장 컬럼:
- `sellable_qty`
- `blocked_qty`
- `lot_id`

선택 컬럼:
- `expiry_date`
- `mfg_date`
- `qc_status`
- `hold_flag`

화면 후보:
- 총 재고
- 판매 가능 재고
- 보류 재고
- 창고별 재고 비중

#### 품절 위험

목적:
- 어떤 품목이 얼마나 빨리 부족해질지 확인

필수 컬럼:
- `item_id`
- `warehouse_id`
- `sellable_qty`
- 수요 계산에 필요한 기준 컬럼

권장 컬럼:
- `avg_daily_demand`
- `threshold_days`

선택 컬럼:
- `channel_store_id`
- `supplier_id`

화면 후보:
- 품절 품목 수
- 기준 이하 품목 수
- 평균 커버 일수
- 기준 대비 여유 일수

#### 미입고 발주

목적:
- 발주했지만 아직 입고되지 않은 물량 확인

필수 컬럼:
- `po_id`
- `item_id`
- `supplier_id`
- `po_date`
- `qty_ordered`

권장 컬럼:
- `qty_received`
- `eta_date`

선택 컬럼:
- `first_receipt_date`
- `po_lead_days`
- `delay_days`

화면 후보:
- 미입고 발주 건수
- 미입고 수량
- 지연 발주 건수
- 평균 리드타임

#### 리드타임

목적:
- 공급처별 또는 품목별 입고 리드타임 편차 파악

필수 컬럼:
- `po_id`
- `po_date`
- `receipt_date`
- `supplier_id`
- `item_id`

권장 컬럼:
- `eta_date`

선택 컬럼:
- `warehouse_id`
- `country`

화면 후보:
- 평균 리드타임
- 지연 비율
- 공급처별 리드타임 순위

#### 출고/반품

목적:
- 실제 출고 흐름과 반품 흐름을 함께 확인

필수 컬럼:
- `ship_date`
- `item_id`
- `warehouse_id`
- `qty_shipped`

권장 컬럼:
- `return_date`
- `qty_returned`
- `channel_store_id`

선택 컬럼:
- `reason`
- `disposition`
- `partner_id`

화면 후보:
- 출고 수량
- 반품 수량
- 반품률
- 일별 출고 추이

### P&L

#### 매출

목적:
- 기간별 매출과 차감 구조 확인

필수 컬럼:
- `period`
- `item_id`
- `channel_store_id`
- `gross_sales`

권장 컬럼:
- `discounts`
- `refunds`
- `country`

선택 컬럼:
- `source`
- `partner_id`

화면 후보:
- 총매출
- 할인
- 환불
- 순매출
- 채널 수

#### 매출원가

목적:
- 순수량과 단위원가 기준으로 원가 파악

필수 컬럼:
- `period`
- `item_id`
- `qty_net`
- `unit_cost`

권장 컬럼:
- `qty_shipped`
- `qty_returned`
- `country`

선택 컬럼:
- `warehouse_id`
- `cost_component`

화면 후보:
- 총 매출원가
- 평균 단위원가
- 반품률

#### 공헌이익

목적:
- 매출에서 변동비까지 반영한 실제 기여도 확인

필수 컬럼:
- `period`
- `item_id`
- `net_revenue`
- `gross_margin`
- `total_variable_cost`

권장 컬럼:
- `channel_store_id`
- `country`

선택 컬럼:
- `charge_domain`
- `charge_type`

화면 후보:
- 공헌이익
- 공헌이익률
- 채널별 기여도

#### 영업이익

목적:
- 공헌이익에서 고정비를 제외한 최종 이익 확인

필수 컬럼:
- `period`
- `item_id`
- `contribution`
- `fixed_cost`
- `operating_profit`

권장 컬럼:
- `operating_profit_pct`
- `country`

선택 컬럼:
- `channel_store_id`

화면 후보:
- 영업이익
- 평균 이익률
- 흑자/적자 행 수
- 기간별 추이

#### 수익성 순위

목적:
- 어떤 품목과 채널이 실제로 수익을 만드는지 우선순위로 파악

필수 컬럼:
- `period`
- `item_id`
- `contribution`

권장 컬럼:
- `channel_store_id`
- `country`
- `rank_by_contribution`

선택 컬럼:
- `gross_margin_pct`
- `contribution_pct`

화면 후보:
- 상위 수익 품목
- 하위 손실 품목
- 국가별 수익성 비교

## 선택 지표 목록

### 유통기한 위험

지원 업종:
- 식품
- 화장품
- 제약
- 일부 생활소비재

필수 컬럼:
- `snapshot_date`
- `item_id`
- `onhand_qty`
- `expiry_date`

권장 컬럼:
- `warehouse_id`
- `lot_id`

선택 컬럼:
- `mfg_date`
- `sellable_qty`

주의:
- 이 지표는 범용 기본 탭으로 두지 않는 편이 좋습니다.
- 지원 업종일 때만 켜는 구조가 안전합니다.

### FEFO / 로트 추적

지원 업종:
- 유통기한 또는 제조 로트 관리가 중요한 업종

필수 컬럼:
- `lot_id`
- `item_id`
- `warehouse_id`
- `expiry_date`

권장 컬럼:
- `snapshot_date`
- `sellable_qty`

주의:
- 일반 제조/유통 회사에서는 필요 없을 수 있습니다.

## 구현 우선순위 제안

### 1차 확장

- 리드타임
- 출고/반품
- 공헌이익
- 수익성 순위

이유:
- 범용성이 높음
- 업종 의존도가 낮음
- 이미 현재 코드 구조와 잘 맞음

### 2차 확장

- 재고회전
- 과재고
- 서비스레벨
- 커버리지

이유:
- 데이터 품질과 운영 해석 기준이 조금 더 필요함

### 3차 확장

- 유통기한 위험
- FEFO
- 로트 기반 상세 분석

이유:
- 업종 특화 성격이 강함

## 다음 작업 권장 순서

1. 공통 지표 1차 확장 목록 확정
2. 각 지표별 필수 컬럼을 `core` 기준으로 문서화
3. 회사별 원본 문서를 `raw -> core`로 매핑
4. 필요한 `mart/view`를 추가
5. 마지막에 화면 탭 확장

## 한 줄 정리

지표를 늘릴 수는 있지만, 모든 지표를 같은 무게로 다루면 안 됩니다.
먼저 범용 지표를 표준화하고, 업종 특화 지표는 옵션으로 분리하는 구조가 가장 안전합니다.
