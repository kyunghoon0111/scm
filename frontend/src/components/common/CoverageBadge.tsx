import type { CoverageFlag } from "../../types/common";

interface CoverageBadgeProps {
  flag: CoverageFlag | null | undefined;
}

export default function CoverageBadge({ flag }: CoverageBadgeProps) {
  const isActual = flag === "ACTUAL";
  const isNoData = flag === "NO_DATA";
  const label = isActual ? "ACTUAL" : isNoData ? "NO DATA" : "PARTIAL";
  const tooltip = isActual
    ? "현재 기준으로 필요한 데이터가 채워져 있습니다."
    : isNoData
      ? "현재 필터 기준으로 조회된 데이터가 없습니다."
      : "일부 데이터가 누락되었거나 추정값이 포함되어 있습니다.";

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] ${
        isActual
          ? "bg-emerald-100 text-emerald-800"
          : isNoData
            ? "bg-stone-200 text-stone-700"
            : "bg-amber-100 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}
