import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOperatingProfit } from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import type { OperatingProfitRow } from "../../types/pnl";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export default function OperatingProfit() {
  const { period, itemId, channelStoreId } = useFilterStore();
  const { data: resp, isLoading, error } = useOperatingProfit({
    period,
    item_id: itemId,
    channel_store_id: channelStoreId,
  });

  const rows: OperatingProfitRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const totalProfit = rows.reduce((sum, row) => sum + (row.operating_profit_krw ?? 0), 0);
    const partialCount = rows.filter((row) => row.coverage_flag !== "ACTUAL").length;
    const partialRatio =
      rows.length > 0 ? `${partialCount}/${rows.length} (${((partialCount / rows.length) * 100).toFixed(0)}%)` : "0";
    const profitableCount = rows.filter((row) => (row.operating_profit_krw ?? 0) > 0).length;
    const lossCount = rows.filter((row) => (row.operating_profit_krw ?? 0) < 0).length;
    const avgMargin =
      rows.filter((row) => row.operating_profit_pct !== null).length > 0
        ? rows.reduce((sum, row) => sum + (row.operating_profit_pct ?? 0), 0) /
          rows.filter((row) => row.operating_profit_pct !== null).length
        : null;

    return {
      totalProfit,
      partialRatio,
      profitableCount,
      lossCount,
      avgMargin,
    };
  }, [rows]);

  const trendData = useMemo(() => {
    const byPeriod = new Map<string, number>();

    for (const row of rows) {
      const periodKey = row.period ?? "-";
      byPeriod.set(periodKey, (byPeriod.get(periodKey) ?? 0) + (row.operating_profit_krw ?? 0));
    }

    return Array.from(byPeriod.entries())
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([currentPeriod, operatingProfit]) => ({
        period: currentPeriod,
        operating_profit: operatingProfit,
      }));
  }, [rows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="영업이익 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 영업이익 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="영업이익"
          value={kpis.totalProfit}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="부분 데이터 비중"
          value={kpis.partialRatio}
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard title="흑자 행 수" value={kpis.profitableCount} unit="건" />
        <KpiCard title="적자 행 수" value={kpis.lossCount} unit="건" />
        <KpiCard title="평균 이익률" value={kpis.avgMargin !== null ? `${(kpis.avgMargin * 100).toFixed(1)}%` : null} />
      </div>

      {trendData.length > 0 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">영업이익 추이</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => fmtKrw(Number(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label="0" />
              <Line
                type="monotone"
                dataKey="operating_profit"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="영업이익"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">영업이익 상세</h3>
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
                <th className="px-4 py-2 text-right">공헌이익</th>
                <th className="px-4 py-2 text-right">고정비</th>
                <th className="px-4 py-2 text-right">영업이익</th>
                <th className="px-4 py-2 text-right">이익률</th>
                <th className="px-4 py-2">커버리지</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.period}-${row.item_id}-${row.channel_store_id}-${index}`}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${
                    row.coverage_flag !== "ACTUAL" ? "bg-orange-50" : ""
                  }`}
                >
                  <td className="px-4 py-2">{row.period ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id ?? "-"}</td>
                  <td className="px-4 py-2">{row.channel_store_id ?? "-"}</td>
                  <td className="px-4 py-2">{row.country ?? "-"}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.contribution_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.fixed_cost_krw)}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtKrw(row.operating_profit_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(row.operating_profit_pct)}</td>
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
