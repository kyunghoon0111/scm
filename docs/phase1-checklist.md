# Phase 1 체크리스트

이 문서는 지금 프로젝트가 어디까지 구현됐는지 빠르게 확인하기 위한 체크리스트입니다.

최종 갱신일: 2026-03-14

## 화면

- SCM
  - 재고 현황
  - 품절 위험
  - 미입고 발주
  - 리드타임
  - 출고/반품
- P&L
  - 매출
  - COGS
  - 공헌이익
  - 영업이익
  - 수익성 순위
- 공통
  - 로그인
  - 업로드
  - 설정
  - 관리자 안내

## 프론트 구현 상태

- 문구 한국어화: 완료
- 대시보드 탭 확장: 완료
- 업로드 화면:
  - 템플릿 다운로드: 완료
  - 파일 미리보기: 완료
  - raw 적재: 완료

## 데이터 계약 상태

- `raw` 업로드 계약 테이블: 완료
- `core` 표준 팩트 테이블: 완료
- `mart` 조회 테이블 / 뷰: 완료
- 문서:
  - `docs/upload-template-guide.md`
  - `docs/raw-to-core-mapping.md`
  - `docs/metric-catalog.md`

## 운영 스크립트 상태

- 마이그레이션 적용:
  - `python scripts/apply_migrations.py`
- Supabase 접근 검증:
  - `python scripts/verify_supabase_access.py`
- raw -> core 승격:
  - `python scripts/promote_raw_uploads.py`
- 전체 파이프라인 실행:
  - `python run.py --once`

## Supabase 반영 상태

- `11_upload_contracts.sql`: 반영 필요 또는 반영 확인
- API Exposed schemas:
  - `mart`
  - `raw`
  - `ops`

## 아직 남아 있는 최종 검증

- 샘플 값이 들어간 파일로 raw 적재 확인
- `promote_raw_uploads.py` 실행 후 core 반영 확인
- `run.py --once` 실행 후 mart 반영 확인

## 완료 기준

아래가 모두 맞으면 Phase 1은 실사용 기준으로 완료입니다.

- 화면이 정상 조회된다
- 업로드 템플릿과 raw 계약이 맞는다
- 업로드 파일이 raw에 들어간다
- raw 데이터가 core로 승격된다
- mart 재계산 후 대시보드에 반영된다
