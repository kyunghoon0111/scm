import { useMemo } from "react";
import { useOpenPO } from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { OpenPORow } from "../../types/scm";
import { exportToExcel, buildExportFileName } from "../../lib/export";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function getStatus(row: OpenPORow): string {
  if ((row.qty_open ?? 0) <= 0) return "종결";
  if ((row.delay_days ?? 0) > 0) return "지연";
  if (row.first_receipt_date) return "부분 입고";
  return "진행 중";
}

export default function OpenPO() {
  const { fromDate, toDate, warehouseId, itemId, drillDown } = useFilterStore();
  const { data: resp, isLoading, error } = useOpenPO({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
  });

  const rows: OpenPORow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const totalOpenPO = rows.length;
    const totalOpenQty = rows.reduce((sum, row) => sum + (row.qty_open ?? 0), 0);
    const delayedCount = rows.filter((row) => (row.delay_days ?? 0) > 0).length;
    const overdueQty = rows.reduce((sum, row) => sum + ((row.delay_days ?? 0) > 0 ? row.qty_open ?? 0 : 0), 0);
    const avgLeadDays =
      rows.filter((row) => row.po_lead_days !== null).length > 0
        ? rows.reduce((sum, row) => sum + (row.po_lead_days ?? 0), 0) /
          rows.filter((row) => row.po_lead_days !== null).length
        : null;
    const partialReceiptCount = rows.filter((row) => row.first_receipt_date).length;
    return { totalOpenPO, totalOpenQty, delayedCount, overdueQty, avgLeadDays, partialReceiptCount };
  }, [rows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="미입고 발주 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 미입고 발주 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="미입고 발주" value={kpis.totalOpenPO} unit="건" />
        <KpiCard title="미입고 수량" value={kpis.totalOpenQty} unit="EA" />
        <KpiCard title="지연 발주" value={kpis.delayedCount} unit="건" />
        <KpiCard title="지연 수량" value={kpis.overdueQty} unit="EA" />
        <KpiCard title="평균 리드타임" value={kpis.avgLeadDays !== null ? kpis.avgLeadDays.toFixed(1) : null} unit="일" />
        <KpiCard title="부분 입고" value={kpis.partialReceiptCount} unit="건" />
      </div>

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">미입고 발주 목록</h3>
            <p className="text-xs text-gray-500">예정 입고일과 미입고 수량 기준으로 정렬했습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() =>
                exportToExcel(
                  rows.map((row) => ({
                    기준월: row.period,
                    발주번호: row.po_id,
                    공급처: row.supplier_id,
                    상품: row.item_id,
                    "발주 수량": row.qty_ordered ?? 0,
                    "입고 수량": row.qty_received ?? 0,
                    미입고: row.qty_open ?? 0,
                    발주일: row.po_date,
                    예정일: row.eta_date,
                    지연일: row.delay_days ?? 0,
                    상태: getStatus(row),
                  })),
                  buildExportFileName("미입고발주", { fromDate, toDate, warehouseId, itemId }),
                  "미입고발주",
                )
              }
            >
              다운로드
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-2">기준월</th>
                <th className="px-4 py-2">발주번호</th>
                <th className="px-4 py-2">공급처</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2 text-right">발주 수량</th>
                <th className="px-4 py-2 text-right">입고 수량</th>
                <th className="px-4 py-2 text-right">미입고</th>
                <th className="px-4 py-2">발주일</th>
                <th className="px-4 py-2">예정일</th>
                <th className="px-4 py-2 text-right">지연일</th>
                <th className="px-4 py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.po_id}-${row.item_id}-${index}`}
                  className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${
                    (row.delay_days ?? 0) > 0 ? "bg-red-50" : ""
                  }`}
                  onClick={() => drillDown({ itemId: row.item_id, scmTab: "lead-time" })}
                  title={`${row.item_id} 리드타임 보기`}
                >
                  <td className="px-4 py-2">{row.period ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.po_id ?? "-"}</td>
                  <td className="px-4 py-2">{row.supplier_id ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id ?? "-"}</td>
                  <td className="px-4 py-2 text-right">{(row.qty_ordered ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{(row.qty_received ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">{(row.qty_open ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{row.po_date ?? "-"}</td>
                  <td className="px-4 py-2 text-xs">{row.eta_date ?? "-"}</td>
                  <td className="px-4 py-2 text-right">
                    {(row.delay_days ?? 0) > 0 ? (
                      <span className="font-bold text-red-600">+{row.delay_days}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{getStatus(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
