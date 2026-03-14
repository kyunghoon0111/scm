# Phase 2 — SCM 핵심 지표 추가 (완료)

목표: SCM 의사결정에 필요한 핵심 지표를 추가한다.
상태: **전체 완료**
세션: 5~6회

---

## 세션 1: 재고회전율 (Inventory Turnover)

재고 효율성의 가장 기본 지표. 없으면 재고가 많은지 적은지 판단 불가.

### 할 일

1. mart 테이블 추가
   - `mart.mart_inventory_turnover` — 이미 DDL은 `src/db.py`에 있음
   - 마이그레이션: `migrations/18_inventory_turnover.sql` 신규
   - 컬럼: period, item_id, warehouse_id, avg_inventory, cogs_or_shipment, turnover_ratio, days_on_hand
2. mart 빌더 확인/수정
   - `src/mart_scm.py`의 `build_mart_inventory_turnover()` 확인
   - 계산 로직: turnover = 출고수량(또는 COGS) / 평균재고
   - days_on_hand = 365 / turnover_ratio
   - 평균재고 = (기초 + 기말) / 2 (snapshot 기반)
3. 프론트엔드 카드 추가
   - `frontend/src/components/scm/InventoryTurnover.tsx` 신규
   - KPI 카드: 전체 회전율, 평균 DOH
   - 테이블: 품목별 회전율 순위 (상위/하위)
   - 차트: 월별 회전율 추이 (Recharts BarChart)
4. API 훅 추가
   - `scmApi.ts`에 `useTurnoverAnalysis()` — 이미 존재, 데이터 매핑 확인
5. SCMDashboard 탭에 추가
   - 기존 탭 또는 "재고 분석" 탭에 포함

### 핵심 파일

- `migrations/18_inventory_turnover.sql` (신규 — DDL 이미 있으면 확인만)
- `src/mart_scm.py` (확인/수정)
- `frontend/src/components/scm/InventoryTurnover.tsx` (신규)
- `frontend/src/api/scmApi.ts` (확인)
- `frontend/src/pages/SCMDashboard.tsx` (탭 추가)

### 완료 기준

- 대시보드에서 품목별 재고회전율을 볼 수 있다
- 회전율이 낮은 품목(장기체류)을 바로 식별할 수 있다
- 월별 추이 차트가 나온다

---

## 세션 2: ABC 분류

SKU가 늘면 전부 똑같이 관리할 수 없다. 매출 기여도 기반으로 A/B/C 등급을 나눠서 A등급에 집중.

### 할 일

1. mart 테이블 추가
   - `migrations/19_abc_classification.sql` 신규
   - `mart.mart_abc_classification`
   - 컬럼: period, item_id, revenue_krw, cumulative_pct, abc_grade, sku_count_in_grade
2. mart 빌더 추가
   - `src/mart_scm.py`에 `build_mart_abc_classification()` 추가
   - 로직: 매출 내림차순 정렬 → 누적 비율 계산 → A(~80%), B(80~95%), C(95~100%)
   - 데이터 소스: `mart.mart_pnl_revenue` (net_revenue_krw 기준)
3. 프론트엔드 카드 추가
   - `frontend/src/components/scm/AbcClassification.tsx` 신규
   - 파이 차트: A/B/C 비율 (SKU 수, 매출 비중)
   - 테이블: 등급별 품목 목록
   - KPI: A등급 SKU 수 / 전체 SKU 수
4. API 훅 추가
   - `scmApi.ts`에 `useAbcClassification()` 추가

### 핵심 파일

- `migrations/19_abc_classification.sql` (신규)
- `src/mart_scm.py` (추가)
- `frontend/src/components/scm/AbcClassification.tsx` (신규)
- `frontend/src/api/scmApi.ts` (추가)
- `frontend/src/types/scm.ts` (타입 추가)

### 완료 기준

- 품목별 ABC 등급이 표시된다
- A등급 품목 집중 관리 목록이 나온다
- 기간별로 등급 변동을 확인할 수 있다

---

## 세션 3: 공급사 스코어카드

공급사 평가 없이는 소싱 의사결정을 할 수 없다. 납기준수율, 리드타임 변동, 품질 지표.

### 할 일

1. mart 테이블 추가
   - `migrations/20_supplier_scorecard.sql` 신규
   - `mart.mart_supplier_scorecard`
   - 컬럼: period, supplier_id, total_po_count, on_time_count, on_time_rate,
     avg_lead_days, lead_time_stddev, qty_ordered, qty_received, fill_rate,
     defect_count, defect_rate, overall_score
2. mart 빌더 추가
   - `src/mart_scm.py`에 `build_mart_supplier_scorecard()` 추가
   - 데이터 소스: `core.fact_po` + `core.fact_receipt`
   - 납기준수율 = on_time_count / total_po_count
   - 충족률 = qty_received / qty_ordered
   - 종합 점수 = 가중 평균 (납기 40%, 충족률 30%, 리드타임 안정성 30%)
3. 프론트엔드 카드 추가
   - `frontend/src/components/scm/SupplierScorecard.tsx` 신규
   - 레이더 차트: 공급사별 5축 스코어
   - 테이블: 공급사별 점수 순위
   - KPI: 평균 납기준수율, 최저 점수 공급사 경고
4. 기존 LeadTime 탭과 연계
   - "공급사 성과" 서브탭 추가 또는 별도 탭

### 핵심 파일

- `migrations/20_supplier_scorecard.sql` (신규)
- `src/mart_scm.py` (추가)
- `frontend/src/components/scm/SupplierScorecard.tsx` (신규)
- `frontend/src/api/scmApi.ts` (추가)
- `frontend/src/types/scm.ts` (타입 추가)

### 완료 기준

- 공급사별 종합 점수가 표시된다
- 납기 지연이 잦은 공급사를 바로 식별할 수 있다
- 기간별 공급사 성과 추이를 볼 수 있다

---

## 세션 4: 채널별 수익성

어느 채널이 돈을 벌고 잃는지. P&L의 핵심 의사결정 포인트.

### 할 일

1. 프론트엔드 drill-down 추가 (mart 데이터는 이미 있음)
   - `mart_pnl_revenue`, `mart_pnl_contribution` 등은 이미 channel_store_id 컬럼 보유
   - 별도 mart 불필요, 기존 데이터를 채널 축으로 집계하면 됨
2. 채널별 수익성 카드 추가
   - `frontend/src/components/pnl/ChannelProfitability.tsx` 신규
   - 스택 바 차트: 채널별 매출/원가/이익 비교
   - 테이블: 채널별 공헌이익률 순위
   - KPI: 최고/최저 수익 채널, 채널 수
3. API 훅 추가
   - `pnlApi.ts`에 `useChannelProfitability()` 추가
   - 기존 mart에서 channel_store_id로 GROUP BY
4. PNLDashboard 탭에 추가

### 핵심 파일

- `frontend/src/components/pnl/ChannelProfitability.tsx` (신규)
- `frontend/src/api/pnlApi.ts` (추가)
- `frontend/src/types/pnl.ts` (타입 추가)
- `frontend/src/pages/PNLDashboard.tsx` (탭 추가)

### 완료 기준

- 채널별 매출/이익 비교가 한 화면에 보인다
- 수익성이 낮은 채널을 바로 식별할 수 있다
- 채널 필터 드롭다운과 연동된다

---

## 세션 5: 파이프라인 알림

파이프라인 실패해도 아무도 모른다. 관리자 패널에 들어가 봐야 아는 구조.

### 할 일

1. 파이프라인 실패 시 슬랙 알림
   - `backend/app/main.py`의 `execute_finalize_job()` 수정
   - 실패 시 Slack Webhook으로 알림 전송
   - 환경변수: `SLACK_WEBHOOK_URL`
   - 알림 내용: job_id, 실패 단계, 에러 메시지, 타임스탬프
2. 성공 시에도 요약 알림 (선택)
   - 적재 행 수, 소요 시간, 커버리지 변화
3. GitHub Actions 파이프라인에도 알림 추가
   - `.github/workflows/pipeline.yml` 수정
   - 실패 시 Slack 알림 step 추가

### 핵심 파일

- `backend/app/main.py` (수정 — finalize job에 알림 추가)
- `.github/workflows/pipeline.yml` (수정)

### 완료 기준

- 파이프라인 실패 시 슬랙 채널에 즉시 알림이 온다
- 알림에 에러 내용이 포함돼 있어 바로 원인 파악이 가능하다
- 성공 시 요약 알림이 온다 (선택)
