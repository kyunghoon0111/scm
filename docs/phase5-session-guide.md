# Phase 5 — 자동화/알림

목표: 사람이 대시보드를 들여다보지 않아도, 시스템이 이상을 감지하고 알려준다.
예상 세션: 4~5회
선행 조건: Phase 3 + Phase 4 세션 1~2 완료

---

## 세션 1: 이상치 탐지

재고 급변, 매출 급락, 반품률 급등 같은 이상 신호를 자동으로 잡아낸다.

### 할 일

1. 이상치 탐지 로직
   - `src/anomaly.py` 신규
   - 방법: 이동 평균 ± 2σ 기반 (단순하지만 실용적)
   - 대상 지표:
     - 일별 출고수량 (급증/급감)
     - 일별 반품수량 (급증)
     - 품목별 재고 변동 (비정상 감소)
     - 채널별 매출 변동 (급락)
   - 결과: `mart.mart_anomaly_signals` 테이블에 저장
2. mart 테이블 추가
   - `migrations/22_anomaly_signals.sql` 신규
   - 컬럼: signal_id, metric_name, entity_type, entity_id, period,
     current_value, expected_value, deviation, severity, detected_at
3. 파이프라인에 이상치 탐지 단계 추가
   - `run.py`의 `run_pipeline()`에 anomaly 단계 추가 (Phase 7 이후)
4. 프론트엔드 알림 카드
   - `frontend/src/components/common/AnomalyBanner.tsx` 신규
   - 대시보드 상단에 이상 신호가 있으면 배너 표시
   - 클릭 시 해당 지표/화면으로 이동

### 핵심 파일

- `src/anomaly.py` (신규)
- `migrations/22_anomaly_signals.sql` (신규)
- `run.py` (파이프라인 단계 추가)
- `frontend/src/components/common/AnomalyBanner.tsx` (신규)
- `frontend/src/api/scmApi.ts` (이상치 조회 추가)

### 완료 기준

- 파이프라인 실행 시 이상치가 자동으로 탐지된다
- 대시보드에 이상 신호 배너가 표시된다
- 이상 신호를 클릭하면 관련 데이터를 바로 볼 수 있다

---

## 세션 2: 알림 시스템

이상치가 탐지되면 슬랙/이메일로 알려준다. 대시보드를 안 봐도 된다.

### 할 일

1. 알림 발송 모듈
   - `src/notify.py` 신규
   - Slack Webhook 알림 (이미 Phase 2 세션 5에서 기반 작업)
   - 이메일 알림 (선택 — SendGrid/SES 등)
   - 알림 템플릿: 지표명, 현재값, 기대값, 편차, 심각도
2. 알림 규칙 설정
   - `ops.ops_alert_rules` 테이블 신규
   - 컬럼: rule_id, metric_name, severity_threshold, notify_channel, enabled
   - 기본 규칙: CRITICAL은 즉시, HIGH는 일 1회 요약
3. 파이프라인 연동
   - anomaly 탐지 후 알림 규칙 매칭 → 해당 채널로 발송
   - 중복 알림 방지: 동일 신호는 24시간 내 1회만
4. 프론트엔드 알림 설정 UI
   - `frontend/src/components/settings/AlertSettings.tsx` 신규
   - 규칙 목록 / 추가 / 수정 / 삭제
   - 테스트 알림 발송 기능

### 핵심 파일

- `src/notify.py` (신규)
- `migrations/23_alert_rules.sql` (신규)
- `run.py` (알림 발송 단계 추가)
- `frontend/src/components/settings/AlertSettings.tsx` (신규)
- `frontend/src/pages/SettingsPage.tsx` (탭 추가)

### 완료 기준

- 이상치 탐지 시 슬랙 알림이 자동으로 온다
- 알림 규칙을 화면에서 설정할 수 있다
- 중복 알림이 오지 않는다

---

## 세션 3: 추천 액션

"문제가 있다"만 알려주는 게 아니라 "이렇게 하면 된다"까지 제안한다.

### 할 일

1. 추천 액션 엔진
   - `src/recommend.py` 신규
   - 규칙 기반 추천 (ML이 아닌 비즈니스 룰):
     - 품절 위험 → "긴급 발주 X개 권장 (안전재고 기준)"
     - 과재고 → "프로모션 할인 또는 타 창고 이관 권장"
     - 유통기한 임박 → "FEFO 피킹 우선순위 조정 권장"
     - 납기 지연 → "대체 공급사 B 검토 (리드타임 Y일 단축)"
     - 매출 급락 → "채널 Z의 재고 확인 필요"
   - 결과: `mart.mart_recommended_actions` 테이블에 저장
2. mart 테이블 추가
   - `migrations/24_recommended_actions.sql` 신규
   - 컬럼: action_id, signal_id, action_type, description, priority,
     entity_type, entity_id, estimated_impact, status, created_at
3. 프론트엔드 추천 패널
   - `frontend/src/components/common/ActionPanel.tsx` 신규
   - 대시보드 사이드 패널 또는 별도 탭
   - 우선순위별 정렬
   - 상태 업데이트 (대기 → 진행중 → 완료 → 무시)

### 핵심 파일

- `src/recommend.py` (신규)
- `migrations/24_recommended_actions.sql` (신규)
- `run.py` (추천 단계 추가)
- `frontend/src/components/common/ActionPanel.tsx` (신규)

### 완료 기준

- 문제 탐지 시 구체적 추천 액션이 제시된다
- 추천에 예상 효과가 포함된다
- 액션 상태를 추적할 수 있다

---

## 세션 4: 스케줄 배치

지금은 업로드 → 수동 후처리 구조. 정기 데이터는 자동으로 처리돼야 한다.

### 할 일

1. 스케줄 실행 설정
   - GitHub Actions 스케줄 이미 있음 (`.github/workflows/pipeline.yml` — 매일 1 AM UTC)
   - 현재 구조 확인 및 보강:
     - Supabase Storage에서 파일 다운로드 → inbox/ → run.py --once
     - 실패 시 자동 재시도 (최대 2회)
     - 성공/실패 알림 (Phase 2 세션 5의 Slack 연동 활용)
2. Supabase Storage 연동
   - 외부 시스템이 정기적으로 CSV를 Supabase Storage에 올리는 구조
   - 파이프라인이 Storage에서 파일을 가져와 처리
   - 처리 완료된 파일은 `processed/` 폴더로 이동
3. 스케줄 관리 UI
   - `frontend/src/components/settings/ScheduleSettings.tsx` 신규
   - 현재 스케줄 상태 표시 (다음 실행 시간, 마지막 실행 결과)
   - 수동 트리거 버튼
   - 스케줄 활성화/비활성화
4. 모니터링
   - 연속 실패 시 에스컬레이션 (Slack → 이메일)
   - 실행 시간 추이 모니터링 (느려지면 경고)

### 핵심 파일

- `.github/workflows/pipeline.yml` (보강)
- `scripts/fetch_storage_files.py` (신규 — Storage → inbox 다운로드)
- `frontend/src/components/settings/ScheduleSettings.tsx` (신규)
- `frontend/src/pages/SettingsPage.tsx` (탭 추가)

### 완료 기준

- 정기 데이터가 자동으로 처리된다
- 실패 시 자동 재시도 + 알림이 온다
- 관리자가 스케줄 상태를 화면에서 확인할 수 있다
- 수동 트리거도 가능하다
