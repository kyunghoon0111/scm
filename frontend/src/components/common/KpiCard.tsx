import CoverageBadge from "./CoverageBadge";

interface KpiCardProps {
  title: string;
  value: number | string | null | undefined;
  unit?: string;
  coverageFlag?: "ACTUAL" | "PARTIAL" | null;
}

function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export default function KpiCard({ title, value, unit, coverageFlag = null }: KpiCardProps) {
  return (
    <div className="panel-card-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{title}</p>
        {coverageFlag && <CoverageBadge flag={coverageFlag} />}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <p className="text-3xl font-semibold tracking-tight text-gray-900">{formatValue(value)}</p>
        {unit ? <span className="pb-1 text-xs uppercase tracking-[0.18em] text-orange-700">{unit}</span> : null}
      </div>
    </div>
  );
}
