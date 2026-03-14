import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTurnoverAnalysis } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { TurnoverRow } from "../../types/scm";
import { exportToExcel, buildExportFileName } from "../../lib/export";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

export default function InventoryTurnover() {
  const { period, fromDate, toDate, warehouseId, itemId, drillDown } = useFilterStore();
  const { data: resp, isLoading, error } = useTurnoverAnalysis({
    period,
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
  });

  const rows: TurnoverRow[] = resp?.data ?? [];

  const kpis = useMemo(() => {
    if (rows.length === 0) return null;

    const withRatio = rows.filter((r) => r.turnover_ratio != null);
    const avgTurnover =
      withRatio.length > 0
        ? withRatio.reduce((s, r) => s + (r.turnover_ratio ?? 0), 0) / withRatio.length
        : null;

    const withDoh = rows.filter((r) => r.days_on_hand != null);
    const avgDoh =
      withDoh.length > 0
        ? withDoh.reduce((s, r) => s + (r.days_on_hand ?? 0), 0) / withDoh.length
        : null;

    const slowMovers = rows.filter((r) => r.days_on_hand != null && r.days_on_hand > 90).length;
    const totalItems = new Set(rows.map((r) => r.item_id)).size;

    return { avgTurnover, avgDoh, slowMovers, totalItems };
  }, [rows]);

  // 월별 평균 회전율 추이 차트
  const chartData = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      if (row.turnover_ratio == null) continue;
      const existing = grouped.get(row.period) ?? { sum: 0, count: 0 };
      existing.sum += row.turnover_ratio;
      existing.count += 1;
      grouped.set(row.period, existing);
    }
    return Array.from(grouped.entries())
      .map(([period, { sum, count }]) => ({
        period,
        turnover_ratio: Math.round((sum / count) * 100) / 100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [rows]);

  // 품목별 순위 (회전율 낮은 순 = 장기체류)
  const rankingRows = useMemo(() => {
    return [...rows]
      .filter((r) => r.turnover_ratio != null)
      .sort((a, b) => (a.turnover_ratio ?? 0) - (b.turnover_ratio ?? 0));
  }, [rows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="재고회전율 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 재고회전율 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            title="평균 회전율"
            value={kpis.avgTurnover != null ? kpis.avgTurnover.toFixed(2) : null}
            unit="회"
          />
          <KpiCard
            title="평균 DOH"
            value={kpis.avgDoh != null ? Math.round(kpis.avgDoh).toLocaleString() : null}
            unit="일"
          />
          <KpiCard title="장기체류 품목" value={kpis.slowMovers} unit="건" />
          <KpiCard title="집계 품목 수" value={kpis.totalItems} unit="건" />
        </div>
      )}

      {chartData.length > 1 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            월별 평균 회전율 추이
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="turnover_ratio" fill="#6366f1" name="회전율" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">품목별 재고회전율</h3>
            <p className="text-xs text-gray-500">
              회전율이 낮은 순서로 정렬됩니다. DOH 90일 초과는 장기체류 품목입니다.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() =>
              exportToExcel(
                rankingRows.map((row) => ({
                  기간: row.period,
                  상품: row.item_id,
                  창고: row.warehouse_id,
                  "평균 재고": row.avg_inventory,
                  출고수량: row.cogs_or_shipment,
                  회전율: row.turnover_ratio,
                  "재고일수(DOH)": row.days_on_hand,
                })),
                buildExportFileName("재고회전율", { fromDate, toDate, warehouseId, itemId }),
                "재고회전율",
              )
            }
          >
            다운로드
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기간</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2">창고</th>
                <th className="px-4 py-2 text-right">평균 재고</th>
                <th className="px-4 py-2 text-right">출고수량</th>
                <th className="px-4 py-2 text-right">회전율</th>
                <th className="px-4 py-2 text-right">DOH</th>
              </tr>
            </thead>
            <tbody>
              {rankingRows.map((row) => {
                const isSlowMover = row.days_on_hand != null && row.days_on_hand > 90;
                return (
                  <tr
                    key={`${row.period}-${row.warehouse_id}-${row.item_id}`}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${isSlowMover ? "bg-red-50/50" : ""}`}
                    onClick={() => drillDown({ itemId: row.item_id, warehouseId: row.warehouse_id, scmTab: "onhand" })}
                    title={`${row.item_id} 재고 현황 보기`}
                  >
                    <td className="px-4 py-2 text-xs">{row.period}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                    <td className="px-4 py-2">{row.warehouse_id}</td>
                    <td className="px-4 py-2 text-right">
                      {row.avg_inventory.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.cogs_or_shipment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {row.turnover_ratio != null ? row.turnover_ratio.toFixed(2) : "-"}
                    </td>
                    <td className={`px-4 py-2 text-right ${isSlowMover ? "font-semibold text-red-600" : ""}`}>
                      {row.days_on_hand != null ? Math.round(row.days_on_hand).toLocaleString() : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
