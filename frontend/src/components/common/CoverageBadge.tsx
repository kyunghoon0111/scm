import type { CoverageFlag } from "../../types/common";

interface CoverageBadgeProps {
  flag: CoverageFlag | null | undefined;
}

export default function CoverageBadge({ flag }: CoverageBadgeProps) {
  const current = flag ?? "NO_DATA";

  const config =
    current === "ACTUAL"
      ? {
          label: "정상",
          title: "핵심 원천이 충분히 들어와 바로 해석할 수 있는 수치입니다.",
          className: "bg-emerald-100 text-emerald-800",
        }
      : current === "PARTIAL"
        ? {
            label: "일부 누락",
            title: "일부 원천이 비어 있어 참고용으로만 봐야 합니다. 아래 안내에서 부족한 파일을 확인하세요.",
            className: "bg-amber-100 text-amber-800",
          }
        : {
            label: "데이터 없음",
            title: "현재 조회기간에 해당 데이터가 없습니다. 기간을 바꾸거나 필요한 파일을 업로드해야 합니다.",
            className: "bg-stone-200 text-stone-700",
          };

  return (
    <span
      title={config.title}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}
