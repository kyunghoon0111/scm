import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useContribution } from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import type { ContributionRow } from "../../types/pnl";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

export default function Contribution() {
  const { period, itemId, channelStoreId } = useFilterStore();
  const { data: resp, isLoading, error } = useContribution({
    period,
    item_id: itemId,
    channel_store_id: channelStoreId,
  });

  const rows: ContributionRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const totalContribution = rows.reduce((sum, row) => sum + (row.contribution_krw ?? 0), 0);
    const totalVariableCost = rows.reduce((sum, row) => sum + (row.total_variable_cost_krw ?? 0), 0);
    const positiveCount = rows.filter((row) => (row.contribution_krw ?? 0) > 0).length;
    const negativeCount = rows.filter((row) => (row.contribution_krw ?? 0) < 0).length;
    const avgContributionPct =
      rows.filter((row) => row.contribution_pct !== null).length > 0
        ? rows.reduce((sum, row) => sum + (row.contribution_pct ?? 0), 0) /
          rows.filter((row) => row.contribution_pct !== null).length
        : null;
    const partialCount = rows.filter((row) => row.coverage_flag !== "ACTUAL").length;

    return {
      totalContribution,
      totalVariableCost,
      positiveCount,
      negativeCount,
      avgContributionPct,
      partialCount,
    };
  }, [rows]);

  const chartData = useMemo(
    () =>
      Object.values(
        rows.reduce<Record<string, { channel: string; contribution: number; variableCost: number }>>((acc, row) => {
          const channel = row.channel_store_id || "미분류";
          if (!acc[channel]) {
            acc[channel] = { channel, contribution: 0, variableCost: 0 };
          }
          acc[channel].contribution += row.contribution_krw ?? 0;
          acc[channel].variableCost += row.total_variable_cost_krw ?? 0;
          return acc;
        }, {}),
      ).sort((left, right) => right.contribution - left.contribution),
    [rows],
  );

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">공헌이익 데이터를 불러오는 중입니다...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="공헌이익 데이터를 불러오지 못했습니다."
        message="mart 뷰 권한과 기준월, 채널 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 공헌이익 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="공헌이익" value={kpis.totalContribution} unit="KRW" coverageFlag={meta?.coverage_flag ?? null} />
        <KpiCard title="변동비" value={kpis.totalVariableCost} unit="KRW" />
        <KpiCard title="흑자 행" value={kpis.positiveCount} unit="건" />
        <KpiCard title="적자 행" value={kpis.negativeCount} unit="건" />
        <KpiCard title="평균 공헌율" value={kpis.avgContributionPct !== null ? `${(kpis.avgContributionPct * 100).toFixed(1)}%` : null} />
        <KpiCard title="부분 데이터" value={kpis.partialCount} unit="건" />
      </div>

      {chartData.length > 0 && (
        <div className="panel-card-strong">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800">채널별 공헌이익 비교</h3>
            <p className="mt-1 text-xs text-gray-500">채널 기준 공헌이익과 변동비를 함께 비교합니다.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => fmtKrw(Number(value))} />
              <Bar dataKey="contribution" fill="#1d4ed8" name="공헌이익" radius={[6, 6, 0, 0]} />
              <Bar dataKey="variableCost" fill="#f97316" name="변동비" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">공헌이익 상세</h3>
            <p className="text-xs text-gray-500">상품과 채널별 수익 기여도를 바로 비교할 수 있습니다.</p>
          </div>
          {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기준월</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2">채널</th>
                <th className="px-4 py-2">국가</th>
                <th className="px-4 py-2 text-right">매출총이익</th>
                <th className="px-4 py-2 text-right">변동비</th>
                <th className="px-4 py-2 text-right">공헌이익</th>
                <th className="px-4 py-2 text-right">공헌율</th>
                <th className="px-4 py-2">커버리지</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.period}-${row.item_id}-${row.channel_store_id}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{row.period}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                  <td className="px-4 py-2">{row.channel_store_id}</td>
                  <td className="px-4 py-2">{row.country}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.gross_margin_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.total_variable_cost_krw)}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtKrw(row.contribution_krw)}</td>
                  <td className="px-4 py-2 text-right">
                    {row.contribution_pct !== null ? `${(row.contribution_pct * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <CoverageBadge flag={row.coverage_flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
