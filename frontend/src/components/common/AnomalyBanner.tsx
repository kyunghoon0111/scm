import { useState } from "react";
import { useAnomalySignals } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { AnomalySignalRow } from "../../types/scm";

const METRIC_LABELS: Record<string, string> = {
  daily_shipment_qty: "일별 출고수량",
  daily_return_qty: "일별 반품수량",
  inventory_level: "재고 수준",
  channel_revenue: "채널 매출",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-50 border-red-200", text: "text-red-800", dot: "bg-red-500" },
  HIGH: { bg: "bg-orange-50 border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-800", dot: "bg-yellow-500" },
  LOW: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-400" },
};

const METRIC_TO_TAB: Record<string, { dashboard: "scm" | "pnl"; tab: string }> = {
  daily_shipment_qty: { dashboard: "scm", tab: "shipment-return" },
  daily_return_qty: { dashboard: "scm", tab: "shipment-return" },
  inventory_level: { dashboard: "scm", tab: "onhand" },
  channel_revenue: { dashboard: "pnl", tab: "revenue" },
};

function formatDeviation(deviation: number | null): string {
  if (deviation === null) return "";
  const sign = deviation > 0 ? "+" : "";
  return `${sign}${deviation.toFixed(1)}\u03c3`;
}

function formatValue(value: number | null): string {
  if (value === null) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

interface AnomalyBannerProps {
  currentDashboard?: "scm" | "pnl";
}

export default function AnomalyBanner({ currentDashboard }: AnomalyBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const period = useFilterStore((s) => s.period);
  const drillDown = useFilterStore((s) => s.drillDown);

  const { data, isLoading } = useAnomalySignals({ period });

  if (isLoading || dismissed) return null;

  const signals = data?.data ?? [];
  if (signals.length === 0) return null;

  // Sort: CRITICAL first, then HIGH, etc.
  const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const sorted = [...signals].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  const criticalCount = sorted.filter((s) => s.severity === "CRITICAL").length;
  const highCount = sorted.filter((s) => s.severity === "HIGH").length;
  const totalCount = sorted.length;

  const topSeverity = sorted[0]?.severity ?? "MEDIUM";
  const style = SEVERITY_STYLES[topSeverity] ?? SEVERITY_STYLES.MEDIUM;

  const preview = sorted.slice(0, 3);
  const hasMore = totalCount > 3;

  function handleSignalClick(signal: AnomalySignalRow) {
    const mapping = METRIC_TO_TAB[signal.metric_name];
    if (!mapping) return;

    if (mapping.dashboard === "scm") {
      drillDown({ scmTab: mapping.tab as any });
    } else {
      drillDown({ pnlTab: mapping.tab as any });
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${style.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <p className={`text-sm font-semibold ${style.text}`}>
            이상 신호 {totalCount}건 감지
            {criticalCount > 0 && ` (위험 ${criticalCount}건)`}
            {highCount > 0 && criticalCount === 0 && ` (주의 ${highCount}건)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs font-medium ${style.text} hover:underline`}
          >
            {expanded ? "접기" : "펼치기"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="ml-1 text-gray-400 hover:text-gray-600"
            title="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!expanded && (
        <div className="mt-2 flex flex-wrap gap-2">
          {preview.map((signal) => {
            const s = SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.MEDIUM;
            return (
              <button
                key={signal.signal_id}
                onClick={() => handleSignalClick(signal)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${s.bg} ${s.text} hover:shadow-sm`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {METRIC_LABELS[signal.metric_name] ?? signal.metric_name}
                <span className="font-mono">{formatDeviation(signal.deviation)}</span>
              </button>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className={`text-xs font-medium ${style.text} hover:underline`}
            >
              +{totalCount - 3}건 더보기
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {sorted.map((signal) => {
            const s = SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.MEDIUM;
            const isNavigable = !!METRIC_TO_TAB[signal.metric_name];
            const targetDashboard = METRIC_TO_TAB[signal.metric_name]?.dashboard;
            const isSameDashboard = !currentDashboard || targetDashboard === currentDashboard;

            return (
              <div
                key={signal.signal_id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${s.bg} ${isNavigable && isSameDashboard ? "cursor-pointer hover:shadow-sm" : ""}`}
                onClick={isNavigable && isSameDashboard ? () => handleSignalClick(signal) : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold uppercase ${s.text}`}>{signal.severity}</span>
                  <span className={`text-xs ${s.text}`}>
                    {METRIC_LABELS[signal.metric_name] ?? signal.metric_name}
                  </span>
                  <span className="text-xs text-gray-500">{signal.entity_id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">
                    {formatValue(signal.current_value)} / 기대 {formatValue(signal.expected_value)}
                  </span>
                  <span className={`font-mono font-semibold ${s.text}`}>
                    {formatDeviation(signal.deviation)}
                  </span>
                  {isNavigable && isSameDashboard && (
                    <span className={`${s.text}`}>&rarr;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
