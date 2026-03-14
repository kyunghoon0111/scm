import CoverageBadge from "./CoverageBadge";

interface KpiCardProps {
  title: string;
  value: number | string | null | undefined;
  unit?: string;
  coverageFlag?: "ACTUAL" | "PARTIAL" | "NO_DATA" | null;
  onClick?: () => void;
  linkLabel?: string;
}

function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export default function KpiCard({ title, value, unit, coverageFlag = null, onClick, linkLabel }: KpiCardProps) {
  return (
    <div
      className={`panel-card-strong${onClick ? " cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-orange-200" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{title}</p>
        {coverageFlag && <CoverageBadge flag={coverageFlag} />}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <p className="text-3xl font-semibold tracking-tight text-gray-900">{formatValue(value)}</p>
        {unit ? <span className="pb-1 text-xs uppercase tracking-[0.18em] text-orange-700">{unit}</span> : null}
      </div>
      {onClick && linkLabel && (
        <p className="mt-2 text-xs font-medium text-orange-600">{linkLabel} &rarr;</p>
      )}
    </div>
  );
}
