# Phase 3 — 운영 관리 UI

목표: 관리자가 데이터 이력을 추적하고 문제를 직접 처리할 수 있게 한다.
예상 세션: 4회
선행 조건: Phase 2 세션 1~3 이상 완료

---

## 세션 1: 업로드 이력 조회

지금 업로드 기록을 보려면 Supabase SQL Editor에 들어가야 한다.
관리자 화면에서 바로 확인할 수 있어야 한다.

### 할 일

1. 업로드 이력 API
   - `backend/app/main.py`에 `GET /api/ops/upload-history` 엔드포인트 추가
   - `raw.system_file_log` + `raw.system_batch_log` 조인
   - 응답: batch_id, file_name, table_name, row_count, status, file_hash, processed_at
   - 페이지네이션 지원 (limit, offset)
   - 필터: status, table_name, 날짜 범위
2. 프론트엔드 이력 화면
   - `frontend/src/components/admin/UploadHistory.tsx` 신규
   - 테이블: 배치별 파일 목록, 상태 뱃지 (success/duplicate/error)
   - 필터: 상태, 테이블, 날짜 범위
   - 배치 클릭 시 상세 (파일별 적재 행 수, 해시, 에러 메시지)
3. AdminPanel에 탭 추가
   - 기존 "작업 이력" 옆에 "업로드 이력" 탭

### 핵심 파일

- `backend/app/main.py` (엔드포인트 추가)
- `frontend/src/components/admin/UploadHistory.tsx` (신규)
- `frontend/src/api/backendApi.ts` (API 함수 추가)
- `frontend/src/pages/AdminPanel.tsx` (탭 추가)

### 완료 기준

- 관리자가 업로드 이력을 화면에서 확인할 수 있다
- 실패한 업로드를 바로 찾을 수 있다
- 배치별 상세 정보가 나온다

---

## 세션 2: 재처리 (수동 파이프라인 실행)

특정 배치만 다시 promote하거나, mart만 재빌드하고 싶을 때가 있다.
지금은 전체 파이프라인을 다시 돌리는 것밖에 안 된다.

### 할 일

1. 단계별 실행 엔드포인트 추가
   - `POST /api/ops/promote` — promote_raw_uploads.py만 실행 (옵션: --batch-id)
   - `POST /api/ops/rebuild-marts` — run.py --once 중 mart 빌드만 실행
   - 각각 별도 job으로 기록
2. 특정 배치 재처리
   - `POST /api/ops/reprocess` — 특정 batch_id의 file_log status를 리셋 + 재promote
   - system_file_log에서 해당 배치의 status를 'pending'으로 변경
   - 그 후 promote 실행
3. 프론트엔드 UI
   - `frontend/src/components/admin/PipelineControl.tsx` 신규 (기존 AdminPanel 로직 분리)
   - 단계별 실행 버튼: "Promote만", "Mart 재빌드만", "전체 재실행"
   - 특정 배치 재처리: 업로드 이력에서 배치 선택 → "재처리" 버튼
   - 모든 위험 작업에 확인 다이얼로그

### 핵심 파일

- `backend/app/main.py` (엔드포인트 추가)
- `frontend/src/components/admin/PipelineControl.tsx` (신규)
- `frontend/src/api/backendApi.ts` (API 함수 추가)
- `frontend/src/pages/AdminPanel.tsx` (수정)

### 완료 기준

- 관리자가 파이프라인을 단계별로 실행할 수 있다
- 특정 배치만 재처리할 수 있다
- 모든 실행 결과가 작업 이력에 기록된다

---

## 세션 3: DQ (데이터 품질) 대시보드

파이프라인이 돌 때 데이터 품질 검사 결과가 `raw.system_dq_report`에 쌓이지만,
이걸 볼 수 있는 화면이 없다.

### 할 일

1. DQ 조회 API
   - `GET /api/ops/dq-report` — 최근 DQ 검사 결과
   - 필터: severity, table_name, batch_id
   - 집계: severity별 통과/실패 건수
2. 프론트엔드 DQ 화면
   - `frontend/src/components/admin/DqDashboard.tsx` 신규
   - 요약 카드: CRITICAL / HIGH / MEDIUM / LOW 건수
   - 테이블: 검사 항목별 통과/실패 상태
   - 실패 항목 클릭 시 상세 (detail 필드)
3. AdminPanel에 "데이터 품질" 탭 추가

### 핵심 파일

- `backend/app/main.py` (엔드포인트 추가)
- `frontend/src/components/admin/DqDashboard.tsx` (신규)
- `frontend/src/api/backendApi.ts` (API 함수 추가)
- `frontend/src/pages/AdminPanel.tsx` (탭 추가)

### 완료 기준

- 관리자가 DQ 검사 결과를 한눈에 볼 수 있다
- CRITICAL 이슈가 있으면 바로 식별된다
- 이슈 상세를 클릭으로 확인할 수 있다

---

## 세션 4: 감사 로그

누가 언제 무엇을 했는지 추적. 운영 시스템의 기본.

### 할 일

1. 감사 로그 수집 확장
   - `ops.ops_adjustment_log`는 이미 있지만, 업로드/롤백/잠금해제 등은 안 쌓임
   - `backend/app/main.py`의 주요 작업에 감사 로그 기록 추가:
     - 업로드 완료 시
     - 롤백 실행 시
     - 파이프라인 잠금 해제 시
     - 기간 마감 시
   - `ops.ops_audit_log` 테이블 신규 (또는 기존 adjustment_log 확장)
   - 컬럼: action, actor, target, detail, timestamp
2. 감사 로그 조회 API
   - `GET /api/ops/audit-log` — 최근 감사 이력
   - 필터: action 유형, 날짜 범위
3. 프론트엔드 감사 화면
   - `frontend/src/components/admin/AuditLog.tsx` 신규
   - 타임라인 형태: 누가 → 무엇을 → 언제
   - 필터: 액션 유형, 날짜 범위

### 핵심 파일

- `migrations/21_audit_log.sql` (신규)
- `backend/app/main.py` (감사 로그 기록 추가)
- `frontend/src/components/admin/AuditLog.tsx` (신규)
- `frontend/src/api/backendApi.ts` (API 함수 추가)
- `frontend/src/pages/AdminPanel.tsx` (탭 추가)

### 완료 기준

- 모든 주요 운영 작업이 감사 로그에 기록된다
- 관리자가 "누가 언제 무엇을 했는지" 화면에서 확인할 수 있다
- 문제 발생 시 추적이 가능하다
