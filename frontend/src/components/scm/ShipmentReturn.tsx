import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReturnAnalysis, useShipmentDaily } from "../../api/scmApi";
import { bucketDate, timeGrainLabel } from "../../lib/timeGrain";
import { useFilterStore } from "../../store/filterStore";
import type { ReturnAnalysisRow, ShipmentDailyRow } from "../../types/scm";
import ChartGrainControl from "../common/ChartGrainControl";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

export default function ShipmentReturn() {
  const { fromDate, toDate, groupBy, setGroupBy, warehouseId, itemId, channelStoreId } = useFilterStore();
  const shipmentQuery = useShipmentDaily({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
  });
  const returnQuery = useReturnAnalysis({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
    channel: channelStoreId,
  });

  const shipments: ShipmentDailyRow[] = shipmentQuery.data?.data ?? [];
  const returns: ReturnAnalysisRow[] = returnQuery.data?.data ?? [];
  const metaFlag = shipmentQuery.data?.meta?.coverage_flag ?? returnQuery.data?.meta?.coverage_flag ?? null;

  const kpis = useMemo(() => {
    const totalShipmentQty = shipments.reduce((sum, row) => sum + row.qty_shipped, 0);
    const totalShipmentCount = shipments.reduce((sum, row) => sum + row.shipment_count, 0);
    const totalReturnedQty = returns.reduce((sum, row) => sum + row.qty_returned, 0);
    const totalReturnCount = returns.reduce((sum, row) => sum + row.return_count, 0);
    const shippedBasis = returns.reduce((sum, row) => sum + (row.qty_shipped ?? 0), 0);
    const overallReturnRate = shippedBasis > 0 ? totalReturnedQty / shippedBasis : null;
    const avgDailyShipment = shipments.length > 0 ? totalShipmentQty / shipments.length : null;
    return { totalShipmentQty, totalShipmentCount, totalReturnedQty, totalReturnCount, overallReturnRate, avgDailyShipment };
  }, [shipments, returns]);

  const chartData = useMemo(
    () =>
      Object.values(
        shipments.reduce<Record<string, { date: string; shippedQty: number }>>((acc, row) => {
          const bucket = bucketDate(row.ship_date, groupBy);
          if (!acc[bucket]) acc[bucket] = { date: bucket, shippedQty: 0 };
          acc[bucket].shippedQty += row.qty_shipped;
          return acc;
        }, {}),
      ).sort((left, right) => (left.date < right.date ? -1 : 1)),
    [shipments, groupBy],
  );

  const returnReasonRows = useMemo(
    () =>
      Object.values(
        returns.reduce<Record<string, { reason: string; qtyReturned: number; returnCount: number; qtyShipped: number }>>(
          (acc, row) => {
            const reason = row.reason ?? "미분류";
            if (!acc[reason]) {
              acc[reason] = { reason, qtyReturned: 0, returnCount: 0, qtyShipped: 0 };
            }
            acc[reason].qtyReturned += row.qty_returned;
            acc[reason].returnCount += row.return_count;
            acc[reason].qtyShipped += row.qty_shipped ?? 0;
            return acc;
          },
          {},
        ),
      )
        .map((row) => ({
          ...row,
          returnRate: row.qtyShipped > 0 ? row.qtyReturned / row.qtyShipped : null,
        }))
        .sort((left, right) => right.qtyReturned - left.qtyReturned),
    [returns],
  );

  if (shipmentQuery.isLoading || returnQuery.isLoading) {
    return <div className="p-8 text-center text-gray-400">출고와 반품 데이터를 불러오는 중입니다...</div>;
  }

  if (shipmentQuery.error || returnQuery.error) {
    return (
      <ErrorState
        title="출고/반품 데이터를 불러오지 못했습니다."
        message="출고/반품 업로드 상태와 조회 조건을 다시 확인해 주세요."
      />
    );
  }

  if (shipments.length === 0 && returns.length === 0) {
    return <EmptyState message="현재 조회기간에는 출고와 반품 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="출고 수량" value={kpis.totalShipmentQty} unit="EA" coverageFlag={metaFlag} />
        <KpiCard title="출고 건수" value={kpis.totalShipmentCount} unit="건" />
        <KpiCard title="반품 수량" value={kpis.totalReturnedQty} unit="EA" />
        <KpiCard title="반품 건수" value={kpis.totalReturnCount} unit="건" />
        <KpiCard title="반품률" value={kpis.overallReturnRate !== null ? `${(kpis.overallReturnRate * 100).toFixed(1)}%` : null} />
        <KpiCard title="일평균 출고" value={kpis.avgDailyShipment !== null ? kpis.avgDailyShipment.toFixed(1) : null} unit="EA" />
      </div>

      {chartData.length > 0 && (
        <div className="panel-card-strong">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{timeGrainLabel(groupBy)} 기준 출고 추이</h3>
              <p className="mt-1 text-xs text-gray-500">조회기간 출고량을 선택한 단위로 묶어 비교합니다.</p>
            </div>
            <ChartGrainControl value={groupBy} onChange={setGroupBy} />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="shippedQty" name="출고 수량" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-table">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">출고 일자별 상세</h3>
              <p className="text-xs text-gray-500">창고 기준 출고 흐름과 주문 수를 함께 봅니다.</p>
            </div>
            {metaFlag && <CoverageBadge flag={metaFlag} />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left text-gray-600">
                  <th className="px-4 py-2">출고일</th>
                  <th className="px-4 py-2">창고</th>
                  <th className="px-4 py-2 text-right">출고 건수</th>
                  <th className="px-4 py-2 text-right">출고 수량</th>
                  <th className="px-4 py-2 text-right">주문 수</th>
                  <th className="px-4 py-2 text-right">상품 수</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((row, index) => (
                  <tr key={`${row.ship_date}-${row.warehouse_id}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{row.ship_date}</td>
                    <td className="px-4 py-2">{row.warehouse_id}</td>
                    <td className="px-4 py-2 text-right">{row.shipment_count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">{row.qty_shipped.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{fmtQty(row.unique_orders)}</td>
                    <td className="px-4 py-2 text-right">{fmtQty(row.unique_items)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-table">
          <div className="border-b border-black/5 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">반품 사유 요약</h3>
            <p className="text-xs text-gray-500">반품 사유별 건수와 반품률을 함께 봅니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left text-gray-600">
                  <th className="px-4 py-2">사유</th>
                  <th className="px-4 py-2 text-right">반품 건수</th>
                  <th className="px-4 py-2 text-right">반품 수량</th>
                  <th className="px-4 py-2 text-right">반품률</th>
                </tr>
              </thead>
              <tbody>
                {returnReasonRows.map((row) => (
                  <tr key={row.reason} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{row.reason}</td>
                    <td className="px-4 py-2 text-right">{row.returnCount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">{row.qtyReturned.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.returnRate !== null ? `${(row.returnRate * 100).toFixed(1)}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
