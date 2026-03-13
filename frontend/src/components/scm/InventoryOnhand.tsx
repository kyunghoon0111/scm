import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInventoryOnhand } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { InventoryOnhandRow } from "../../types/scm";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

type SummaryRow = {
  snapshot_date: string;
  warehouse_id: string;
  item_id: string;
  onhand_qty: number;
  sellable_qty: number;
  blocked_qty: number;
  expired_qty: number;
  lot_count: number;
};

function buildSummary(rows: InventoryOnhandRow[]): SummaryRow[] {
  const grouped = new Map<string, SummaryRow>();

  for (const row of rows) {
    const snapshotDate = row.snapshot_date ?? "-";
    const warehouseId = row.warehouse_id ?? "-";
    const itemId = row.item_id ?? "-";
    const key = [snapshotDate, warehouseId, itemId].join("|");
    const existing = grouped.get(key) ?? {
      snapshot_date: snapshotDate,
      warehouse_id: warehouseId,
      item_id: itemId,
      onhand_qty: 0,
      sellable_qty: 0,
      blocked_qty: 0,
      expired_qty: 0,
      lot_count: 0,
    };

    existing.onhand_qty += row.onhand_qty ?? 0;
    existing.sellable_qty += row.sellable_qty ?? 0;
    existing.blocked_qty += row.blocked_qty ?? 0;
    existing.expired_qty += row.expired_qty ?? 0;
    existing.lot_count += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.snapshot_date !== b.snapshot_date) return a.snapshot_date < b.snapshot_date ? 1 : -1;
    return b.onhand_qty - a.onhand_qty;
  });
}

export default function InventoryOnhand() {
  const { period, warehouseId, itemId } = useFilterStore();
  const { data: resp, isLoading, error } = useInventoryOnhand({
    period,
    warehouse_id: warehouseId,
    item_id: itemId,
  });

  const rows: InventoryOnhandRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const summaryRows = useMemo(() => buildSummary(rows), [rows]);

  const kpis = useMemo(() => {
    const totalOnhand = summaryRows.reduce((sum, row) => sum + row.onhand_qty, 0);
    const totalSellable = summaryRows.reduce((sum, row) => sum + row.sellable_qty, 0);
    const totalBlocked = summaryRows.reduce((sum, row) => sum + row.blocked_qty, 0);
    const totalExpired = summaryRows.reduce((sum, row) => sum + row.expired_qty, 0);
    const sellableRate = totalOnhand > 0 ? (totalSellable / totalOnhand) * 100 : null;
    const uniqueItems = new Set(summaryRows.map((row) => `${row.warehouse_id}|${row.item_id}`)).size;
    const avgLotsPerItem = summaryRows.length > 0
      ? summaryRows.reduce((sum, row) => sum + row.lot_count, 0) / summaryRows.length
      : null;

    return { totalOnhand, totalSellable, totalBlocked, totalExpired, sellableRate, uniqueItems, avgLotsPerItem };
  }, [summaryRows]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { sellable: number; blocked: number; expired: number }>();

    for (const row of summaryRows) {
      const existing = grouped.get(row.warehouse_id) ?? { sellable: 0, blocked: 0, expired: 0 };
      existing.sellable += row.sellable_qty;
      existing.blocked += row.blocked_qty;
      existing.expired += row.expired_qty;
      grouped.set(row.warehouse_id, existing);
    }

    return Array.from(grouped.entries()).map(([warehouse_id, values]) => ({
      warehouse_id,
      ...values,
    }));
  }, [summaryRows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="재고 현황 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (summaryRows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 재고 현황 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard title="총 재고" value={kpis.totalOnhand} unit="EA" />
        <KpiCard title="판매 가능" value={kpis.totalSellable} unit="EA" />
        <KpiCard title="보류 재고" value={kpis.totalBlocked} unit="EA" />
        <KpiCard title="기한 경과" value={kpis.totalExpired} unit="EA" />
        <KpiCard title="판매 가능률" value={kpis.sellableRate !== null ? `${kpis.sellableRate.toFixed(1)}%` : null} />
        <KpiCard title="집계 품목 수" value={kpis.uniqueItems} unit="건" />
        <KpiCard title="평균 로트 수" value={kpis.avgLotsPerItem !== null ? kpis.avgLotsPerItem.toFixed(1) : null} unit="lot" />
      </div>

      {chartData.length > 0 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">창고별 구성</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="warehouse_id" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sellable" stackId="inventory" fill="#22c55e" name="판매 가능" />
              <Bar dataKey="blocked" stackId="inventory" fill="#f59e0b" name="보류" />
              <Bar dataKey="expired" stackId="inventory" fill="#ef4444" name="기한 경과" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">상품 요약</h3>
            <p className="text-xs text-gray-500">lot 단위 데이터를 상품 기준으로 합산한 결과입니다.</p>
          </div>
          {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기준일</th>
                <th className="px-4 py-2">창고</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2 text-right">로트 수</th>
                <th className="px-4 py-2 text-right">총 재고</th>
                <th className="px-4 py-2 text-right">판매 가능</th>
                <th className="px-4 py-2 text-right">보류</th>
                <th className="px-4 py-2 text-right">기한 경과</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr
                  key={`${row.snapshot_date}-${row.warehouse_id}-${row.item_id}`}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 text-xs">{row.snapshot_date}</td>
                  <td className="px-4 py-2">{row.warehouse_id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                  <td className="px-4 py-2 text-right">{row.lot_count.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.onhand_qty.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.sellable_qty.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.blocked_qty.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.expired_qty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
