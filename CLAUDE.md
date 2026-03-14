# CLAUDE.md

이 파일은 이 저장소를 다시 열었을 때 가장 먼저 보는 요약 안내문입니다.

## 프로젝트 한 줄 요약

재고(SCM)와 손익(P&L) 데이터를 한 화면에서 보는 대시보드입니다.
Phase 1~4 완료. 현재 Phase 5(자동화/알림) 세션 1 완료.

## 현재 진행 상황

| 단계 | 이름 | 상태 |
|------|------|------|
| Phase 1 | 핵심 화면 + 파이프라인 | 완료 |
| Phase 1.5 | 안정화 (엑셀, 필터, 페이지네이션) | 완료 |
| Phase 2 | 데이터 심화 (회전율, ABC, 공급사 등) | 완료 |
| Phase 3 | 운영 관리 UI (업로드 이력, DQ 등) | 완료 |
| Phase 4 | 분석 고도화 (드릴다운, 비교, 병목) | 완료 |
| Phase 5 | 자동화/알림 | **세션 1 완료** — 이상치 탐지 |

## 대시보드에서 보는 화면

### 공급망(SCM)
- 재고 현황, 재고회전율, 품절 위험
- 미입고 발주, 리드타임, 출고/반품
- 병목 현황, 예측
- **이상 신호 배너** (Phase 5 신규)

### 손익(P&L)
- 매출, 매출원가(COGS), 공헌이익
- 영업이익, 수익성 순위
- **이상 신호 배너** (Phase 5 신규)

### 관리자
- 업로드 이력, 파이프라인 관리, 설정

## 핵심 원칙

- 화면은 정리된 `mart` 데이터만 사용합니다.
- `raw`, `core`, `ops` 데이터는 화면에 직접 노출하지 않습니다.
- 권한은 JWT role → app_metadata → user_metadata 순으로 판단합니다.
- 관리자 기능은 관리자만 접근할 수 있습니다.

## 문서 안내

- `docs/future-plan.md` — 전체 로드맵과 진행 현황
- `docs/dashboard-data-guide.md` — 화면별로 어떤 데이터를 보여주는지
- `docs/access-control-guide.md` — 누가 무엇을 볼 수 있는지
- `docs/upload-template-guide.md` — 업로드 파일 형식과 예시

## 세션 가이드 (개발 작업 상세)

- `docs/phase1.5-session-guide.md` — 안정화 (5세션)
- `docs/phase2-session-guide.md` — 데이터 심화 (5~6세션)
- `docs/phase3-session-guide.md` — 운영 관리 UI (4세션)
- `docs/phase4-session-guide.md` — 분석 고도화 (4~5세션)
- `docs/phase5-session-guide.md` — 자동화/알림 (4~5세션)

## 운영 스크립트

- `scripts/apply_migrations.py` — DB 마이그레이션 적용
- `scripts/verify_supabase_access.py` — Supabase 접근 검증
- `scripts/update_status.py` — 상태 업데이트
