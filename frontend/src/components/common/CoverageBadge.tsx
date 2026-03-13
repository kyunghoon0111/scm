import type { CoverageFlag } from "../../types/common";

interface CoverageBadgeProps {
  flag: CoverageFlag | null | undefined;
}

export default function CoverageBadge({ flag }: CoverageBadgeProps) {
  const isActual = flag === "ACTUAL";
  const label = isActual ? "실측" : "부분";
  const tooltip = isActual ? undefined : "일부 상위 데이터가 없거나 아직 완전하지 않습니다.";

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] ${
        isActual ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}
