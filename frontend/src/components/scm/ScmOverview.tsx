import { useMemo } from "react";
import {
  useCoverage,
  useInventoryOnhand,
  useOpenPO,
  useReturnAnalysis,
  useShipmentDaily,
  useStockoutRisk,
} from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import CoverageNotice from "../common/CoverageNotice";
import KpiCard from "../common/KpiCard";

export default function ScmOverview() {
  const { fromDate, toDate, warehouseId, itemId, channelStoreId } = useFilterStore();

  const inventory = useInventoryOnhand({ from_date: fromDate, to_date: toDate, warehouse_id: warehouseId, item_id: itemId });
  const stockout = useStockoutRisk({ from_date: fromDate, to_date: toDate, warehouse_id: warehouseId, item_id: itemId });
  const openPo = useOpenPO({ from_date: fromDate, to_date: toDate, warehouse_id: warehouseId, item_id: itemId });
  const shipments = useShipmentDaily({ from_date: fromDate, to_date: toDate, warehouse_id: warehouseId, item_id: itemId });
  const returns = useReturnAnalysis({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
    channel: channelStoreId,
  });
  const coverage = useCoverage({
    from_date: fromDate,
    to_date: toDate,
    warehouse_id: warehouseId,
    item_id: itemId,
    channel: channelStoreId,
  });

  const summary = useMemo(() => {
    const inventoryRows = inventory.data?.data ?? [];
    const stockoutRows = stockout.data?.data ?? [];
    const openPoRows = openPo.data?.data ?? [];
    const shipmentRows = shipments.data?.data ?? [];
    const returnRows = returns.data?.data ?? [];
    const coverageRows = coverage.data?.data ?? [];

    const totalSellable = inventoryRows.reduce((sum, row) => sum + (row.sellable_qty ?? 0), 0);
    const totalBlocked = inventoryRows.reduce((sum, row) => sum + (row.blocked_qty ?? 0), 0);
    const riskySkuCount = stockoutRows.filter((row) => (row.sellable_qty ?? 0) <= 0 || row.risk_flag === true).length;
    const belowThresholdCount = stockoutRows.filter((row) => {
      if (row.days_of_cover === null || row.threshold_days === null) return false;
      return row.days_of_cover <= row.threshold_days;
    }).length;
    const openPoQty = openPoRows.reduce((sum, row) => sum + (row.qty_open ?? 0), 0);
    const delayedPoCount = openPoRows.filter((row) => (row.delay_days ?? 0) > 0).length;
    const shippedQty = shipmentRows.reduce((sum, row) => sum + (row.qty_shipped ?? 0), 0);
    const shipmentCount = shipmentRows.reduce((sum, row) => sum + (row.shipment_count ?? 0), 0);
    const returnedQty = returnRows.reduce((sum, row) => sum + (row.qty_returned ?? 0), 0);
    const returnRate = shippedQty > 0 ? (returnedQty / shippedQty) * 100 : null;
    const avgDailyShipment = shipmentRows.length > 0 ? shippedQty / shipmentRows.length : null;
    const coverageRate =
      coverageRows.length > 0
        ? coverageRows.reduce((sum, row) => sum + (row.coverage_rate ?? 0), 0) / coverageRows.length
        : null;

    return {
      totalSellable,
      totalBlocked,
      riskySkuCount,
      belowThresholdCount,
      openPoQty,
      delayedPoCount,
      shippedQty,
      shipmentCount,
      returnRate,
      avgDailyShipment,
      coverageRate,
    };
  }, [coverage.data?.data, inventory.data?.data, openPo.data?.data, returns.data?.data, shipments.data?.data, stockout.data?.data]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">핵심 운영 지표</p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">지금 바로 봐야 하는 공급망 숫자</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard title="판매 가능 재고" value={summary.totalSellable} unit="EA" coverageFlag={inventory.data?.meta.coverage_flag ?? null} />
            <KpiCard title="품절·주의 SKU" value={summary.riskySkuCount} unit="건" coverageFlag={stockout.data?.meta.coverage_flag ?? null} />
            <KpiCard title="미입고 수량" value={summary.openPoQty} unit="EA" />
            <KpiCard title="반품률" value={summary.returnRate !== null ? `${summary.returnRate.toFixed(1)}%` : null} />
          </div>
        </div>

        <div className="panel-card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">참고 지표</p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">운영 판단 보조</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard title="보류 재고" value={summary.totalBlocked} unit="EA" />
            <KpiCard title="지연 발주" value={summary.delayedPoCount} unit="건" />
            <KpiCard title="일평균 출고" value={summary.avgDailyShipment !== null ? summary.avgDailyShipment.toFixed(1) : null} unit="EA" />
            <KpiCard title="데이터 충족도" value={summary.coverageRate !== null ? `${(summary.coverageRate * 100).toFixed(1)}%` : null} />
          </div>
          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
            조회기간 동안 출고 {summary.shipmentCount.toLocaleString()}건 기준으로 임계치 이하 품목 {summary.belowThresholdCount.toLocaleString()}건을 잡아냈습니다.
          </div>
        </div>
      </div>

      <CoverageNotice rows={coverage.data?.data ?? []} title="SCM 데이터 보완 안내" />
    </section>
  );
}
