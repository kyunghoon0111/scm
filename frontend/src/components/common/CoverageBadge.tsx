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
          title: "필요한 원천 데이터가 충분히 들어와 현재 숫자를 그대로 읽어도 됩니다.",
          className: "bg-emerald-100 text-emerald-800",
        }
      : current === "PARTIAL"
        ? {
            label: "보완 필요",
            title: "일부 원천 데이터가 빠져 있어 참고용 수치입니다. 아래 안내에서 어떤 파일이 더 필요한지 확인하세요.",
            className: "bg-amber-100 text-amber-800",
          }
        : {
            label: "데이터 없음",
            title: "현재 조회기간에는 표시할 데이터가 없습니다. 해당 템플릿 업로드나 기간 변경이 필요합니다.",
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
