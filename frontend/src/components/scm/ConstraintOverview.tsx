import { useMemo } from "react";
import { useConstraintSignals } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { ConstraintSignalRow } from "../../types/scm";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

export default function ConstraintOverview() {
  const { fromDate, toDate, warehouseId, itemId, channelStoreId } = useFilterStore();
  const { data: resp, isLoading, error } = useConstraintSignals({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
    channel: channelStoreId,
  });

  const rows: ConstraintSignalRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const summary = useMemo(() => {
    const critical = rows.filter((row) => row.severity === "CRITICAL").length;
    const high = rows.filter((row) => row.severity === "HIGH").length;
    const warn = rows.filter((row) => row.severity === "WARN").length;
    const domains = new Set(rows.map((row) => row.domain)).size;
    return { critical, high, warn, domains };
  }, [rows]);

  if (isLoading) return <div className="p-8 text-center text-gray-400">병목 신호를 불러오는 중입니다...</div>;
  if (error) {
    return (
      <ErrorState
        title="병목 현황을 불러오지 못했습니다."
        message="constraint mart 권한과 기준월 필터를 확인해 주세요."
      />
    );
  }
  if (rows.length === 0) {
    return <EmptyState message="현재 기준월에는 감지된 병목 신호가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Critical" value={summary.critical} unit="건" />
        <KpiCard title="High" value={summary.high} unit="건" />
        <KpiCard title="Warn" value={summary.warn} unit="건" />
        <KpiCard title="도메인" value={summary.domains} unit="개" coverageFlag={meta?.coverage_flag ?? null} />
      </div>

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">병목 신호</h3>
            <p className="text-xs text-gray-500">도메인별 임계 초과 지표를 우선순위 순으로 확인합니다.</p>
          </div>
          {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">심각도</th>
                <th className="px-4 py-2">도메인</th>
                <th className="px-4 py-2">지표</th>
                <th className="px-4 py-2">대상</th>
                <th className="px-4 py-2 text-right">현재값</th>
                <th className="px-4 py-2 text-right">임계값</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.signal_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold">{row.severity}</td>
                  <td className="px-4 py-2">{row.domain}</td>
                  <td className="px-4 py-2">{row.metric_name}</td>
                  <td className="px-4 py-2">{row.entity_id ?? row.entity_type ?? "-"}</td>
                  <td className="px-4 py-2 text-right">{row.current_value.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.threshold_value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
