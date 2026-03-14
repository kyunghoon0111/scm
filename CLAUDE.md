# CLAUDE.md

이 파일은 이 저장소를 다시 열었을 때 가장 먼저 보는 요약 안내문입니다.
긴 설명보다, 지금 무엇이 중요하고 어떤 문서를 보면 되는지만 적습니다.

## 먼저 볼 문서

1. `docs/next-session.md`
2. `docs/dashboard-data-guide.md`
3. `docs/access-control-guide.md`
4. `docs/phase1-checklist.md`

## 프로젝트 한 줄 요약

이 프로젝트는 재고와 손익 정보를 보여주는 대시보드입니다.
Phase 1 완료. 다음은 Phase 1.5 안정화 (엑셀 다운로드, 필터, 페이지네이션 등).

## 지금 실제로 보는 화면

- 재고 현황
- 품절 위험
- 미입고 발주
- 매출
- 매출원가
- 영업이익

업로드, 설정, 관리자 화면은 아직 본격 운영 화면이 아니라 안내 화면입니다.

## 데이터와 권한 원칙

- 화면은 정리된 `mart` 데이터를 우선 사용합니다.
- 내부 운영용 `raw`, `core`, `ops` 데이터는 화면에 직접 연결하지 않습니다.
- 권한은 `JWT role`을 먼저 보고, 없으면 사용자 메타데이터를 참고합니다.
- 관리자 기능은 관리자만 사용할 수 있어야 합니다.

## 지금 중요한 문서

- `docs/next-session.md`: 다음 작업자가 바로 이어서 할 일
- `docs/phase1-checklist.md`: 현재 어디까지 끝났는지
- `docs/dashboard-data-guide.md`: 화면별 데이터 설명
- `docs/access-control-guide.md`: 누가 무엇을 볼 수 있어야 하는지
- `docs/upload-template-guide.md`: 업로드 파일 형식 기준
- `docs/upload-status-flow.md`: 업로드 상태 흐름
- `docs/raw-to-core-mapping.md`: 원본 데이터를 정리하는 기준
- `docs/future-plan.md`: 전체 로드맵 (Phase 1.5~5)

## 운영 반영에 쓰는 스크립트

- `scripts/apply_migrations.py`
- `scripts/verify_supabase_access.py`
- `scripts/update_status.py`

## 세션 가이드

- `docs/phase1.5-session-guide.md`: 안정화 (5세션)
- `docs/phase2-session-guide.md`: 데이터 심화 (5~6세션)
- `docs/phase3-session-guide.md`: 운영 관리 UI (4세션)
- `docs/phase4-session-guide.md`: 분석 고도화 (4~5세션)
- `docs/phase5-session-guide.md`: 자동화/알림 (4~5세션)
