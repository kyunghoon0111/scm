import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLeadTime } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { LeadTimeRow } from "../../types/scm";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)}일`;
}

function weightedAverage(rows: LeadTimeRow[], picker: (row: LeadTimeRow) => number | null): number | null {
  const validRows = rows.filter((row) => picker(row) !== null && row.total_count > 0);
  if (validRows.length === 0) return null;

  const totalWeight = validRows.reduce((sum, row) => sum + row.total_count, 0);
  if (totalWeight === 0) return null;

  const weightedSum = validRows.reduce(
    (sum, row) => sum + (picker(row) ?? 0) * row.total_count,
    0,
  );

  return weightedSum / totalWeight;
}

export default function LeadTime() {
  const { fromDate, toDate, itemId } = useFilterStore();
  const { data: resp, isLoading, error } = useLeadTime({
    from_date: fromDate,
    to_date: toDate,
    item_id: itemId,
  });

  const rows: LeadTimeRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const supplierCount = new Set(rows.map((row) => row.supplier_id).filter(Boolean)).size;
    const totalSamples = rows.reduce((sum, row) => sum + row.total_count, 0);
    const avgLeadDays = weightedAverage(rows, (row) => row.avg_lead_days);
    const medianLeadDays = weightedAverage(rows, (row) => row.median_lead_days);
    const avgDelayDays = weightedAverage(rows, (row) => row.avg_delay_days);
    const lateRatio = weightedAverage(rows, (row) => row.late_po_ratio);

    return {
      supplierCount,
      totalSamples,
      avgLeadDays,
      medianLeadDays,
      avgDelayDays,
      lateRatio,
    };
  }, [rows]);

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((left, right) => right.total_count - left.total_count)
        .slice(0, 8)
        .map((row) => ({
          supplier: row.supplier_id,
          avgLeadDays: Number((row.avg_lead_days ?? 0).toFixed(1)),
          avgDelayDays: Number((row.avg_delay_days ?? 0).toFixed(1)),
        })),
    [rows],
  );

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">리드타임 데이터를 불러오는 중입니다...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="리드타임 데이터를 불러오지 못했습니다."
        message="mart 뷰 권한과 기준월 필터를 먼저 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 리드타임 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="공급처 수" value={kpis.supplierCount} unit="곳" coverageFlag={meta?.coverage_flag ?? null} />
        <KpiCard title="표본 건수" value={kpis.totalSamples} unit="건" />
        <KpiCard title="평균 리드타임" value={kpis.avgLeadDays !== null ? kpis.avgLeadDays.toFixed(1) : null} unit="일" />
        <KpiCard title="중앙 리드타임" value={kpis.medianLeadDays !== null ? kpis.medianLeadDays.toFixed(1) : null} unit="일" />
        <KpiCard title="평균 지연일" value={kpis.avgDelayDays !== null ? kpis.avgDelayDays.toFixed(1) : null} unit="일" />
        <KpiCard title="지연 비중" value={kpis.lateRatio !== null ? `${(kpis.lateRatio * 100).toFixed(1)}%` : null} />
      </div>

      {chartData.length > 0 && (
        <div className="panel-card-strong">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800">주요 공급처 리드타임 비교</h3>
            <p className="mt-1 text-xs text-gray-500">표본이 많은 공급처부터 평균 리드타임과 평균 지연일을 비교합니다.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supplier" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="avgLeadDays" fill="#1d4ed8" name="평균 리드타임" radius={[6, 6, 0, 0]} />
              <Bar dataKey="avgDelayDays" fill="#f97316" name="평균 지연일" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">리드타임 상세</h3>
            <p className="text-xs text-gray-500">공급처와 상품 기준으로 리드타임 분포와 지연 비율을 보여줍니다.</p>
          </div>
          {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기준월</th>
                <th className="px-4 py-2">공급처</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2 text-right">표본</th>
                <th className="px-4 py-2 text-right">평균</th>
                <th className="px-4 py-2 text-right">중앙값</th>
                <th className="px-4 py-2 text-right">최소</th>
                <th className="px-4 py-2 text-right">최대</th>
                <th className="px-4 py-2 text-right">지연 비중</th>
                <th className="px-4 py-2 text-right">평균 지연</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.period}-${row.supplier_id}-${row.item_id}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{row.period}</td>
                  <td className="px-4 py-2">{row.supplier_id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                  <td className="px-4 py-2 text-right">{row.total_count.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{fmtDays(row.avg_lead_days)}</td>
                  <td className="px-4 py-2 text-right">{fmtDays(row.median_lead_days)}</td>
                  <td className="px-4 py-2 text-right">{fmtDays(row.min_lead_days)}</td>
                  <td className="px-4 py-2 text-right">{fmtDays(row.max_lead_days)}</td>
                  <td className="px-4 py-2 text-right">
                    {row.late_po_ratio !== null ? `${(row.late_po_ratio * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">{fmtDays(row.avg_delay_days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
