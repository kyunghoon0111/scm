# 다음에 할 일

최종 갱신일: 2026-03-15

## 지금 상태

Phase 1 완료. 대시보드가 정상 동작하고 파이프라인이 end-to-end로 돌아간다.

- 화면 6개 정상 조회 (재고 현황, 품절 위험, 미입고 발주, 매출, 매출원가, 영업이익)
- 업로드 → raw → core → mart 파이프라인 정상
- Railway 백엔드 시작 시 마이그레이션 자동 적용
- 중복 업로드 강제 옵션 추가
- 역할 해석 프론트/DB 통일
- 코드 중복 정리 (fmtKrw, fmtPct, wrap)
- 관리자 확인 다이얼로그 추가

## 다음 작업: Phase 1.5 세션 1

**엑셀 다운로드 기능 추가**

세부 내용은 `docs/phase1.5-session-guide.md` 세션 1 참조.

## 전체 로드맵

| Phase | 내용 | 세션 수 | 상태 |
|-------|------|---------|------|
| 1 | 핵심 화면 + 파이프라인 + 권한 | - | 완료 |
| 1.5 | 안정화 (엑셀, 필터, 페이지네이션, CI/CD, 테스트) | 5 | 다음 |
| 2 | 데이터 심화 (회전율, ABC, 공급사, 채널, 알림) | 5~6 | 대기 |
| 3 | 운영 관리 UI (이력, 재처리, DQ, 감사) | 4 | 대기 |
| 4 | 분석 고도화 (drill-down, 비교, 리포트, 원인분석) | 4~5 | 대기 |
| 5 | 자동화/알림 (이상치, 알림, 추천, 스케줄) | 4~5 | 대기 |

## 세션 가이드 문서

- `docs/phase1.5-session-guide.md`
- `docs/phase2-session-guide.md`
- `docs/phase3-session-guide.md`
- `docs/phase4-session-guide.md`
- `docs/phase5-session-guide.md`
