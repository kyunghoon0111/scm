/**
 * React Query 엔드포인트별 staleTime 설정.
 *
 * staleTime: 이 시간 내에는 캐시된 데이터를 바로 사용하고 API 재호출하지 않음.
 */
export const QUERY_CONFIG = {
  // 실시간성 필요 없는 마트 데이터 (5분)
  inventory: { staleTime: 5 * 60 * 1000 },
  pnl: { staleTime: 5 * 60 * 1000 },
  coverage: { staleTime: 5 * 60 * 1000 },

  // 자주 안 바뀌는 데이터
  chargeAllocation: { staleTime: 30 * 60 * 1000 }, // 30분
  turnover: { staleTime: 10 * 60 * 1000 },         // 10분

  // 파이프라인 상태는 짧게
  pipelineStatus: { staleTime: 30 * 1000 },         // 30초

  // 병목 신호는 짧게
  constraintSignals: { staleTime: 2 * 60 * 1000 },  // 2분

  // 대사검증 (5분)
  reco: { staleTime: 5 * 60 * 1000 },

  // 이상치 신호 (2분)
  anomaly: { staleTime: 2 * 60 * 1000 },

  // 관리자 (1분)
  admin: { staleTime: 60 * 1000 },
} as const;
