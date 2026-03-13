import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockoutRisk } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { StockoutRiskRow } from "../../types/scm";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function isStockout(row: StockoutRiskRow): boolean {
  return (row.sellable_qty ?? 0) <= 0;
}

function rowBgClass(row: StockoutRiskRow): string {
  if (isStockout(row)) return "bg-red-50";
  if (row.risk_flag === true) return "bg-orange-50";
  return "";
}

export default function StockoutRisk() {
  const { period, warehouseId, itemId } = useFilterStore();
  const { data: resp, isLoading, error } = useStockoutRisk({
    period,
    warehouse_id: warehouseId,
    item_id: itemId,
  });

  const rows: StockoutRiskRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const stockoutCount = rows.filter(isStockout).length;
    const riskCount = rows.filter((row) => row.risk_flag && !isStockout(row)).length;
    const demandRows = rows.filter((row) => (row.avg_daily_demand ?? 0) > 0);
    const avgDaysOfCover =
      demandRows.length > 0
        ? demandRows.reduce((sum, row) => sum + (row.days_of_cover ?? 0), 0) / demandRows.length
        : null;
    const belowThresholdCount = rows.filter((row) => {
      if (row.days_of_cover === null || row.threshold_days === null) return false;
      return row.days_of_cover <= row.threshold_days;
    }).length;
    const avgGapToThreshold = rows.length > 0
      ? rows
          .filter((row) => row.days_of_cover !== null && row.threshold_days !== null)
          .reduce((sum, row) => sum + ((row.days_of_cover ?? 0) - (row.threshold_days ?? 0)), 0) /
        Math.max(
          1,
          rows.filter((row) => row.days_of_cover !== null && row.threshold_days !== null).length,
        )
      : null;

    return {
      stockoutCount,
      riskCount,
      avgDaysOfCover,
      belowThresholdCount,
      avgGapToThreshold,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    return rows
      .filter((row) => row.days_of_cover !== null)
      .slice(0, 20)
      .map((row) => ({
        item_id: row.item_id ?? "-",
        days_of_cover: row.days_of_cover ?? 0,
        threshold_days: row.threshold_days ?? 0,
      }));
  }, [rows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="품절 위험 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 품절 위험 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="품절 품목" value={kpis.stockoutCount} unit="건" />
        <KpiCard title="주의 품목" value={kpis.riskCount} unit="건" />
        <KpiCard
          title="평균 커버 일수"
          value={kpis.avgDaysOfCover}
          unit="일"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard title="기준 이하 품목" value={kpis.belowThresholdCount} unit="건" />
        <KpiCard
          title="기준 대비 여유"
          value={kpis.avgGapToThreshold !== null ? kpis.avgGapToThreshold.toFixed(1) : null}
          unit="일"
        />
      </div>

      {chartData.length > 0 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">커버 일수 하위 품목</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="item_id" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <ReferenceLine x={7} stroke="#f59e0b" strokeDasharray="4 4" />
              <Bar dataKey="days_of_cover" fill="#3b82f6" name="커버 일수" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">위험 품목 목록</h3>
          {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기준일</th>
                <th className="px-4 py-2">창고</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2 text-right">판매 가능</th>
                <th className="px-4 py-2 text-right">일평균 수요</th>
                <th className="px-4 py-2 text-right">커버 일수</th>
                <th className="px-4 py-2 text-right">기준 일수</th>
                <th className="px-4 py-2 text-center">품절</th>
                <th className="px-4 py-2 text-center">위험</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.item_id}-${row.warehouse_id}-${row.as_of_date}-${index}`}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${rowBgClass(row)}`}
                >
                  <td className="px-4 py-2 text-xs">{row.as_of_date}</td>
                  <td className="px-4 py-2">{row.warehouse_id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                  <td className="px-4 py-2 text-right">{(row.sellable_qty ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {(row.avg_daily_demand ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.days_of_cover !== null ? row.days_of_cover.toFixed(1) : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.threshold_days !== null ? row.threshold_days.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isStockout(row) ? (
                      <span className="font-medium text-red-600">예</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {row.risk_flag === true ? (
                      <span className="font-medium text-orange-600">예</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
