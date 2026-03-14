type CoverageDomain = {
  domain: string;
  coverage_rate: number;
  missing_rows: number | null;
};

interface CoverageNoticeProps {
  rows: CoverageDomain[];
  title: string;
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function getAction(domain: string) {
  const key = normalizeDomain(domain);

  if (key.includes("inventory")) {
    return "재고 스냅샷 템플릿을 업로드해 현재고와 판매가능재고를 보완하세요.";
  }
  if (key.includes("purchase") || key.includes("po")) {
    return "발주 템플릿을 업로드해 미입고 발주와 ETA를 채우세요.";
  }
  if (key.includes("receipt")) {
    return "입고 템플릿을 업로드해 실제 입고와 리드타임 계산을 보완하세요.";
  }
  if (key.includes("shipment")) {
    return "출고 템플릿을 업로드해 수요, 품절위험, 출고 추이를 보완하세요.";
  }
  if (key.includes("return")) {
    return "반품 템플릿을 업로드해 반품률과 사유 분석을 채우세요.";
  }
  if (key.includes("sales") || key.includes("settlement") || key.includes("revenue")) {
    return "매출·정산 템플릿을 업로드해 순매출과 채널 손익을 보완하세요.";
  }
  if (key.includes("charge") || key.includes("cost")) {
    return "비용 템플릿을 업로드해 변동비와 공헌이익 계산을 보완하세요.";
  }
  if (key.includes("forecast")) {
    return "예측 결과나 수요 계획 데이터를 넣어 예측 정확도와 보충계획을 채우세요.";
  }

  return "이 도메인에 해당하는 원천 업로드 파일을 다시 확인하고 부족한 행을 보완하세요.";
}

function getLabel(domain: string) {
  const key = normalizeDomain(domain);
  if (key.includes("inventory")) return "재고";
  if (key.includes("purchase") || key.includes("po")) return "발주";
  if (key.includes("receipt")) return "입고";
  if (key.includes("shipment")) return "출고";
  if (key.includes("return")) return "반품";
  if (key.includes("sales") || key.includes("settlement") || key.includes("revenue")) return "매출/정산";
  if (key.includes("charge") || key.includes("cost")) return "비용";
  if (key.includes("forecast")) return "예측";
  return domain;
}

export default function CoverageNotice({ rows, title }: CoverageNoticeProps) {
  const missing = rows
    .filter((row) => row.coverage_rate < 1 || (row.missing_rows ?? 0) > 0)
    .sort((left, right) => (right.missing_rows ?? 0) - (left.missing_rows ?? 0))
    .slice(0, 4);

  if (missing.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        <p className="font-semibold">{title}</p>
        <p className="mt-1">현재 조회기간 기준으로 필요한 원천 데이터가 충분합니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-amber-800">현재 숫자는 일부만 계산된 상태입니다. 아래 항목을 보완하면 지표 정확도가 올라갑니다.</p>
      <div className="mt-3 space-y-2">
        {missing.map((row) => (
          <div key={row.domain} className="rounded-xl bg-white/70 px-3 py-3">
            <p className="font-medium">{getLabel(row.domain)}</p>
            <p className="mt-1 text-xs text-amber-900/80">
              커버리지 {(row.coverage_rate * 100).toFixed(0)}% · 누락 {row.missing_rows ?? 0}행
            </p>
            <p className="mt-1 text-xs text-amber-900/80">{getAction(row.domain)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
