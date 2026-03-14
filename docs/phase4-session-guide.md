# Phase 4 — 분석 도구 고도화 (완료)

목표: 숫자를 보여주는 대시보드에서 의사결정을 돕는 분석 도구로 진화한다.
상태: **전체 완료**
세션: 4~5회

---

## 세션 1: Drill-down 네비게이션

지금은 카드별로 독립적이라, "품절 위험 품목 → 그 품목의 발주 현황 → 공급사 성과"
같은 연결이 안 된다. 클릭하면 관련 데이터로 이동하는 흐름이 필요하다.

### 할 일

1. 크로스 필터 연동 설계
   - 테이블 행 클릭 시 해당 item_id/warehouse_id/supplier_id를 글로벌 필터에 설정
   - 다른 탭으로 이동해도 필터가 유지됨
   - 예: 품절 위험 테이블에서 SKU-A 클릭 → 필터에 item_id=SKU-A 설정 → 발주 탭 이동 시 SKU-A만 보임
2. 행 클릭 핸들러 추가
   - 테이블 형태 컴포넌트들에 `onRowClick` 핸들러 추가
   - 클릭 시 filterStore의 해당 필터 값 설정
   - 시각적 피드백: 클릭 가능한 행에 hover 스타일, 커서 변경
3. 빠른 이동 링크
   - KPI 카드에 "상세 보기 →" 링크 추가
   - 예: 품절 위험 카드의 "위험 5건" → 클릭 시 품절 위험 탭으로 이동

### 핵심 파일

- `frontend/src/store/filterStore.ts` (네비게이션 액션 추가)
- `frontend/src/components/scm/*.tsx` (행 클릭 핸들러)
- `frontend/src/components/pnl/*.tsx` (행 클릭 핸들러)
- `frontend/src/components/common/KpiCard.tsx` (링크 추가)

### 완료 기준

- 테이블 행을 클릭하면 관련 필터가 자동 설정된다
- 탭 이동 후에도 필터가 유지된다
- KPI 카드에서 상세 화면으로 바로 이동할 수 있다

---

## 세션 2: 비교 분석 (기간 대비)

"지난달 대비 재고가 늘었나 줄었나?" — 가장 기본적인 분석 질문인데 지금은 답할 수 없다.

### 할 일

1. 비교 기간 선택 UI
   - `GlobalFilter.tsx`에 "비교 기간" 선택 추가
   - 옵션: 전월, 전분기, 전년 동기, 사용자 지정
   - filterStore에 `compareFromDate`, `compareToDate` 추가
2. 비교 데이터 조회
   - API 훅에 비교 기간 쿼리 추가 (동일 API, 다른 날짜 범위)
   - 두 결과를 합쳐서 비교 데이터 생성
3. 비교 표시 UI
   - KPI 카드: 현재값 + 변화량 + 변화율 (▲▼ 표시)
   - 차트: 현재 기간 vs 비교 기간 오버레이
   - 테이블: 변화량 컬럼 추가 (증감 색상 표시)

### 핵심 파일

- `frontend/src/store/filterStore.ts` (비교 기간 상태 추가)
- `frontend/src/components/common/GlobalFilter.tsx` (비교 기간 UI)
- `frontend/src/components/common/KpiCard.tsx` (변화량 표시)
- `frontend/src/components/scm/*.tsx` (비교 렌더링)
- `frontend/src/components/pnl/*.tsx` (비교 렌더링)

### 완료 기준

- 전월/전분기/전년 대비 변화를 한눈에 볼 수 있다
- KPI 카드에 증감 방향과 비율이 표시된다
- 차트에서 두 기간을 겹쳐 비교할 수 있다

---

## 세션 3: 커스텀 리포트

정형화된 대시보드 외에, 사용자가 직접 축을 선택해서 데이터를 보고 싶은 경우.

### 할 일

1. 리포트 빌더 페이지
   - `frontend/src/pages/ReportBuilder.tsx` 신규
   - App.tsx에 라우트 추가: `/report`
   - 권한: `scm:read` 또는 `pnl:read`
2. 축 선택 UI
   - 행 축: period, item_id, warehouse_id, channel_store_id, supplier_id, country
   - 값: 미리 정의된 지표 목록 (매출, 원가, 이익, 재고수량, 출고수량 등)
   - 필터: 기존 글로벌 필터 + 추가 조건
3. 동적 쿼리 생성
   - 프론트에서 선택한 축/값을 Supabase 쿼리로 변환
   - GROUP BY + SUM/AVG 적용
   - 결과를 피벗 테이블 형태로 표시
4. 엑셀 다운로드 연동
   - Phase 1.5에서 만든 export 유틸 재사용

### 핵심 파일

- `frontend/src/pages/ReportBuilder.tsx` (신규)
- `frontend/src/api/reportApi.ts` (신규 — 동적 쿼리 빌더)
- `frontend/src/components/common/PivotTable.tsx` (신규)
- `frontend/src/App.tsx` (라우트 추가)

### 완료 기준

- 사용자가 행 축과 값을 선택해서 자유롭게 데이터를 볼 수 있다
- 결과를 엑셀로 다운로드할 수 있다
- 기존 필터와 연동된다

---

## 세션 4: 원인 분석 강화

병목/제약 화면은 이미 있지만, "왜 이런 문제가 생겼는지"에 대한 답이 약하다.

### 할 일

1. 제약 신호 → 근본 원인 연결 강화
   - `mart.mart_constraint_root_cause`는 이미 있음
   - 빌더 로직 보강: contributing_factors에 구체적 데이터 포함
   - 예: "품절 위험" → "지난 30일 평균 수요 X개, 현재고 Y개, 미입고 PO Z건"
2. 근본 원인 UI 개선
   - `frontend/src/components/scm/ConstraintOverview.tsx` 수정
   - 제약 신호 클릭 → 슬라이드 패널로 근본 원인 + 권장 조치 표시
   - 권장 조치에 "관련 화면으로 이동" 링크 포함
3. 액션 플랜 추적
   - `mart.mart_constraint_action_plan`에 상태 추가 (대기/진행중/완료)
   - 관리자가 액션 상태를 업데이트할 수 있는 UI

### 핵심 파일

- `src/mart_constraint.py` (빌더 로직 보강)
- `frontend/src/components/scm/ConstraintOverview.tsx` (수정)
- `frontend/src/components/scm/ConstraintDetail.tsx` (신규 — 슬라이드 패널)
- `frontend/src/api/scmApi.ts` (근본 원인 API 추가)

### 완료 기준

- 제약 신호를 클릭하면 근본 원인이 구체적 데이터와 함께 나온다
- 권장 조치가 제시되고, 관련 화면으로 바로 이동할 수 있다
- 조치 상태를 추적할 수 있다
