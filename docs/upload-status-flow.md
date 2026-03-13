# 업로드 상태 흐름

이 문서는 업로드 기능이 어떤 순서로 처리되는지 설명합니다.

기준 문서:
- `docs/upload-template-guide.md`
- `docs/raw-to-core-mapping.md`

## 전체 흐름

업로드는 아래 4단계로 진행됩니다.

1. 템플릿 다운로드
2. 프론트에서 파일 검토 후 `raw.upload_*`에 적재
3. 운영 스크립트로 `raw -> core` 승격
4. 파이프라인으로 `mart` 재계산

즉 업로드 화면에서 끝나는 것이 아니라, 그 다음 단계가 이어져야 대시보드에 반영됩니다.

## 단계별 상태

### 1. 준비

- 사용자가 템플릿을 내려받습니다.
- 필수 컬럼이 있는지 확인합니다.

### 2. 파일 검토

- 파일 헤더를 읽습니다.
- 데이터셋 유형을 자동 판별합니다.
- 컬럼 매핑과 미리보기를 보여줍니다.

### 3. Raw 적재

- 프론트에서 `raw.upload_*` 계약 테이블에 insert 합니다.
- 이 단계에서 보이는 결과:
  - 적재 행 수
  - 건너뜀 수
  - 오류 메시지

### 4. Core 승격

- 운영자가 아래 스크립트를 실행합니다.

```cmd
python scripts/promote_raw_uploads.py
```

- 특정 업로드 배치만 승격하려면:

```cmd
python scripts/promote_raw_uploads.py --batch-id 1234567890
```

### 5. Mart 재계산

- `core`에 반영된 뒤 파이프라인을 실행해 `mart`를 다시 계산합니다.

```cmd
python run.py --once
```

## 업로드 후 확인할 것

### Raw 확인

```sql
select *
from raw.upload_inventory_snapshot
order by uploaded_at desc
limit 20;
```

### Core 확인

```sql
select *
from core.fact_inventory_snapshot
order by loaded_at desc
limit 20;
```

### Mart 확인

```sql
select *
from mart.mart_inventory_onhand
order by snapshot_date desc
limit 20;
```

## 실패 시 어디서 멈췄는지 보는 법

- 프론트에서 실패:
  - 헤더 누락, 필수값 누락, 권한 문제
- `raw -> core`에서 실패:
  - `promote_raw_uploads.py` 실행 로그 확인
- `mart` 반영에서 실패:
  - `run.py --once` 실행 로그 확인

## 현재 기준 완료 범위

- 템플릿 다운로드: 완료
- 파일 검토 / raw 적재: 완료
- `raw -> core` 승격 스크립트: 완료
- `mart` 재계산 파이프라인: 기존 구현 사용

