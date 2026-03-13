import { useMemo } from "react";
import { useCOGS } from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import type { COGSRow } from "../../types/pnl";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

export default function COGS() {
  const { period, itemId, channelStoreId } = useFilterStore();
  const { data: resp, isLoading, error } = useCOGS({
    period,
    item_id: itemId,
    channel_store_id: channelStoreId,
  });

  const rows: COGSRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const totalQtyNet = rows.reduce((sum, row) => sum + (row.qty_net ?? 0), 0);
    const rowsWithCost = rows.filter((row) => row.unit_cost_krw !== null);
    const avgUnitCost =
      rowsWithCost.length > 0
        ? rowsWithCost.reduce((sum, row) => sum + (row.unit_cost_krw ?? 0), 0) / rowsWithCost.length
        : null;
    const totalCogs = rows.some((row) => row.cogs_krw !== null)
      ? rows.reduce((sum, row) => sum + (row.cogs_krw ?? 0), 0)
      : null;
    const partialCount = rows.filter((row) => row.coverage_flag !== "ACTUAL").length;

    const shipped = rows.reduce((sum, row) => sum + (row.qty_shipped ?? 0), 0);
    const returned = rows.reduce((sum, row) => sum + (row.qty_returned ?? 0), 0);
    const returnRate = shipped > 0 ? (returned / shipped) * 100 : null;
    const countryCount = new Set(rows.map((row) => row.country ?? "UNKNOWN")).size;

    return { totalQtyNet, avgUnitCost, totalCogs, partialCount, returnRate, countryCount };
  }, [rows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="매출원가 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 매출원가 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <KpiCard title="순수량" value={kpis.totalQtyNet} unit="EA" />
        <KpiCard
          title="평균 단가"
          value={kpis.avgUnitCost}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="총 매출원가"
          value={kpis.totalCogs}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="부분 행 수"
          value={kpis.partialCount}
          unit="건"
          coverageFlag={kpis.partialCount > 0 ? "PARTIAL" : "ACTUAL"}
        />
        <KpiCard title="반품률" value={kpis.returnRate !== null ? `${kpis.returnRate.toFixed(1)}%` : null} />
        <KpiCard title="국가 수" value={kpis.countryCount} unit="개" />
      </div>

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">매출원가 상세</h3>
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
                <th className="px-4 py-2 text-right">출고</th>
                <th className="px-4 py-2 text-right">반품</th>
                <th className="px-4 py-2 text-right">순수량</th>
                <th className="px-4 py-2 text-right">단위원가</th>
                <th className="px-4 py-2 text-right">매출원가</th>
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
                  <td className="px-4 py-2 text-right">{(row.qty_shipped ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{(row.qty_returned ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{(row.qty_net ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.unit_cost_krw)}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtKrw(row.cogs_krw)}</td>
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
