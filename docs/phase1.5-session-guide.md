# Phase 1.5 — 안정화

목표: 현업이 실제로 쓸 수 있는 수준으로 만든다.
예상 세션: 4~5회

---

## 세션 1: 엑셀 다운로드

현업은 대시보드 데이터를 반드시 엑셀로 뽑아서 추가 분석한다.
이 기능 없으면 "쓸 수 없는 대시보드"다.

### 할 일

1. 공통 다운로드 유틸 만들기
   - `frontend/src/lib/export.ts` 신규
   - `xlsx` 패키지는 이미 설치돼 있음 (`package.json` 확인)
   - 함수: `exportToExcel(rows: Record<string, unknown>[], fileName: string)`
   - 한글 시트명, 날짜 포맷, 숫자/통화 서식 적용
2. 각 대시보드 카드에 다운로드 버튼 추가
   - SCM: InventoryOnhand, StockoutRisk, OpenPO, LeadTime, ShipmentReturn
   - PNL: Revenue, COGS, Contribution, OperatingProfit, ProfitabilityRanking
   - 버튼 위치: 카드 상단 우측, 아이콘 + "다운로드"
3. 다운로드 시 현재 필터 조건을 파일명에 포함
   - 예: `재고현황_2026-01_2026-03_WH01.xlsx`

### 핵심 파일

- `frontend/src/lib/export.ts` (신규)
- `frontend/src/components/scm/*.tsx` (버튼 추가)
- `frontend/src/components/pnl/*.tsx` (버튼 추가)

### 완료 기준

- 모든 대시보드 카드에서 엑셀 다운로드가 동작한다
- 다운로드된 파일에 현재 필터 조건이 반영돼 있다
- 빈 데이터일 때 빈 시트가 아니라 안내 메시지가 나온다

---

## 세션 2: 필터 드롭다운

지금 창고/상품/채널 필터가 텍스트 자유 입력이라 오타 하나에 빈 결과가 나온다.
실제 데이터 기반 드롭다운 + 자동완성으로 바꿔야 현업이 쓸 수 있다.

### 할 일

1. 필터 옵션 데이터를 가져오는 API 추가
   - `frontend/src/api/filterApi.ts` 신규
   - Supabase에서 DISTINCT 값 조회
   - `fetchWarehouseOptions()` → `core.fact_inventory_snapshot`의 warehouse_id 목록
   - `fetchItemOptions()` → `core.fact_inventory_snapshot`의 item_id 목록
   - `fetchChannelOptions()` → `core.fact_settlement`의 channel_store_id 목록
2. `GlobalFilter.tsx` 수정
   - 텍스트 input → 검색 가능한 드롭다운 (combobox)
   - 옵션 목록은 React Query로 캐시 (staleTime: 5분)
   - "전체" 옵션 포함 (null 선택)
   - 타이핑하면 필터링되는 자동완성
3. 외부 라이브러리 없이 구현 (또는 최소한의 headless UI 사용)

### 핵심 파일

- `frontend/src/api/filterApi.ts` (신규)
- `frontend/src/components/common/GlobalFilter.tsx` (수정)
- `frontend/src/components/common/ComboBox.tsx` (신규 — 재사용 가능한 드롭다운)

### 완료 기준

- 창고/상품/채널 필터가 드롭다운으로 동작한다
- 실제 데이터에 있는 값만 선택할 수 있다
- 타이핑으로 검색 가능하다
- "전체" 선택 시 필터 해제된다

---

## 세션 3: 페이지네이션

지금 모든 쿼리가 전체 데이터를 한 번에 가져온다.
SKU 1,000개 이상이면 성능 저하. 특히 재고 현황, 발주 목록은 대량 데이터 필수.

### 할 일

1. 페이지네이션 공통 로직
   - `frontend/src/lib/pagination.ts` 신규
   - Supabase `.range(from, to)` 활용
   - 페이지 크기 기본값: 50행
2. API 레이어 수정
   - `scmApi.ts`, `pnlApi.ts`의 테이블 조회 함수에 `page`, `pageSize` 파라미터 추가
   - Supabase 쿼리에 `.range()` 적용
   - 응답에 `totalCount` 포함 (Supabase `count: 'exact'` 옵션)
3. 테이블 컴포넌트에 페이지 네비게이션 추가
   - 이전/다음 버튼
   - 현재 페이지 / 전체 페이지 표시
   - 페이지 크기 선택 (25 / 50 / 100)
4. 적용 대상 (테이블 형태 컴포넌트만)
   - InventoryOnhand, StockoutRisk, OpenPO, ExpiryRisk, FefoPickList
   - ProfitabilityRanking
   - 차트 컴포넌트는 전체 데이터 유지

### 핵심 파일

- `frontend/src/lib/pagination.ts` (신규)
- `frontend/src/components/common/Pagination.tsx` (신규)
- `frontend/src/api/scmApi.ts` (수정)
- `frontend/src/api/pnlApi.ts` (수정)
- 테이블 형태 컴포넌트들 (수정)

### 완료 기준

- 테이블 컴포넌트가 페이지 단위로 데이터를 가져온다
- 페이지 이동이 매끄럽다 (로딩 표시 포함)
- 1,000행 이상에서도 느려지지 않는다
- 차트 컴포넌트는 영향 없다

---

## 세션 4: CI/CD + 에러 트래킹

수동 배포는 사고 원인. 프론트 에러가 발생해도 지금은 아무도 모른다.

### 할 일

1. GitHub Actions 빌드/테스트 워크플로우
   - `.github/workflows/ci.yml` 신규
   - main 브랜치 push 시: `npm ci` → `tsc --noEmit` → `npm run build`
   - PR 시: 위 + lint check
   - 기존 `pipeline.yml`은 데이터 파이프라인 전용으로 유지
2. Vercel 배포 자동화 확인
   - Vercel은 GitHub 연동으로 이미 자동 배포 중 (확인)
   - Preview 배포 (PR별)가 동작하는지 확인
3. 프론트엔드 에러 트래킹
   - Sentry 무료 플랜 연동 (또는 대안)
   - `ErrorBoundary.tsx`에 Sentry 리포트 연결
   - 비동기 에러 (API 호출 실패 등) 캡처
   - 환경변수: `VITE_SENTRY_DSN`

### 핵심 파일

- `.github/workflows/ci.yml` (신규)
- `frontend/src/lib/sentry.ts` (신규)
- `frontend/src/components/common/ErrorBoundary.tsx` (수정)
- `frontend/src/main.tsx` (Sentry init 추가)

### 완료 기준

- main push 시 빌드가 자동으로 돌고, 실패하면 알림이 온다
- 프론트 에러 발생 시 Sentry에 기록된다
- 배포 과정에서 사람이 수동으로 하는 일이 없다

---

## 세션 5: 기본 테스트

테스트가 0개인 상태에서 기능을 쌓으면 회귀 버그를 잡을 수 없다.
전부 다 테스트하지 않더라도 핵심 경로만 잡는다.

### 할 일

1. 테스트 환경 설정
   - `vitest` + `@testing-library/react` 설치
   - `frontend/vitest.config.ts` 설정
   - `frontend/src/test/setup.ts` (Supabase mock, matchMedia polyfill 등)
2. API 응답 스키마 테스트
   - `frontend/src/api/__tests__/scmApi.test.ts`
   - `frontend/src/api/__tests__/pnlApi.test.ts`
   - wrap() 함수 단위 테스트
   - API 응답 구조가 타입과 일치하는지 확인
3. 핵심 유틸 테스트
   - `frontend/src/lib/__tests__/format.test.ts` — fmtKrw, fmtPct
   - `frontend/src/lib/__tests__/export.test.ts` — 엑셀 생성
   - `frontend/src/lib/__tests__/timeGrain.test.ts` — 시간 단위 추천
4. 스토어 테스트
   - `frontend/src/store/__tests__/filterStore.test.ts`
   - 날짜 변경 시 period/groupBy 자동 동기화 확인
5. CI에 테스트 추가
   - `.github/workflows/ci.yml`에 `npx vitest run` 단계 추가

### 핵심 파일

- `frontend/vitest.config.ts` (신규)
- `frontend/src/test/setup.ts` (신규)
- `frontend/src/api/__tests__/*.test.ts` (신규)
- `frontend/src/lib/__tests__/*.test.ts` (신규)
- `frontend/src/store/__tests__/*.test.ts` (신규)
- `.github/workflows/ci.yml` (수정)

### 완료 기준

- `npx vitest run`이 통과한다
- CI에서 테스트가 자동으로 돌아간다
- 최소한 유틸 함수 + API wrap + 스토어 로직이 커버된다
