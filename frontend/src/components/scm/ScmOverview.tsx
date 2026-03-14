import { useMemo } from "react";
import {
  useInventoryOnhand,
  useOpenPO,
  useReturnAnalysis,
  useShipmentDaily,
  useStockoutRisk,
} from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import CoverageNotice, { type CoverageNoticeItem } from "../common/CoverageNotice";
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

  const summary = useMemo(() => {
    const inventoryRows = inventory.data?.data ?? [];
    const stockoutRows = stockout.data?.data ?? [];
    const openPoRows = openPo.data?.data ?? [];
    const shipmentRows = shipments.data?.data ?? [];
    const returnRows = returns.data?.data ?? [];

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

    return {
      inventoryRows,
      stockoutRows,
      openPoRows,
      shipmentRows,
      returnRows,
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
    };
  }, [inventory.data?.data, openPo.data?.data, returns.data?.data, shipments.data?.data, stockout.data?.data]);

  const guidanceItems = useMemo<CoverageNoticeItem[]>(() => {
    const items: CoverageNoticeItem[] = [];

    if (summary.inventoryRows.length === 0) {
      items.push({
        key: "inventory",
        label: "재고 스냅샷이 필요합니다",
        message: "재고 현황과 품절 위험을 보려면 재고 스냅샷 파일을 먼저 올려야 합니다.",
        tone: "critical",
      });
    } else if (inventory.data?.meta.coverage_flag === "PARTIAL") {
      items.push({
        key: "inventory-partial",
        label: "재고 데이터가 일부만 들어왔습니다",
        message: "창고나 상품이 빠진 채 업로드된 경우 재고 합계와 품절 경보가 실제보다 낮게 보일 수 있습니다.",
        tone: "warning",
      });
    }

    if (summary.openPoRows.length === 0) {
      items.push({
        key: "po",
        label: "발주 또는 입고 이력이 없습니다",
        message: "미입고 발주와 ETA를 보려면 발주 파일과 입고 파일을 함께 넣는 편이 가장 안정적입니다.",
        tone: "info",
      });
    }

    if (summary.shipmentRows.length === 0) {
      items.push({
        key: "shipment",
        label: "출고 이력이 없습니다",
        message: "출고 추이, 평균 출고, 품절 신호를 안정적으로 보려면 출고 파일이 필요합니다.",
        tone: "warning",
      });
    }

    if (summary.returnRows.length === 0) {
      items.push({
        key: "return",
        label: "반품 데이터가 없습니다",
        message: "반품률과 반품 사유는 반품 파일이 들어와야 계산됩니다. 운영상 반품이 없다면 무시해도 됩니다.",
        tone: "info",
      });
    }

    return items;
  }, [
    inventory.data?.meta.coverage_flag,
    summary.inventoryRows.length,
    summary.openPoRows.length,
    summary.returnRows.length,
    summary.shipmentRows.length,
  ]);

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">판단 보조 지표</p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">실무자가 함께 보는 참고 수치</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard title="보류 재고" value={summary.totalBlocked} unit="EA" />
            <KpiCard title="지연 발주" value={summary.delayedPoCount} unit="건" />
            <KpiCard title="일평균 출고" value={summary.avgDailyShipment !== null ? summary.avgDailyShipment.toFixed(1) : null} unit="EA" />
            <KpiCard title="임계치 이하" value={summary.belowThresholdCount} unit="건" />
          </div>
          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
            조회기간 동안 출고 {summary.shipmentCount.toLocaleString()}건 기준으로 커버리지 임계치 이하 품목
            {` ${summary.belowThresholdCount.toLocaleString()}건`}을 집계했습니다.
          </div>
        </div>
      </div>

      <CoverageNotice
        title="SCM 데이터 보완 안내"
        summary="이 영역은 실제 화면에 영향을 주는 입력만 알려줍니다. 안 써도 되는 선택 데이터까지 억지로 요구하지 않습니다."
        items={guidanceItems}
        successMessage="재고, 출고, 반품, 발주 기준으로 당장 운영 판단에 필요한 핵심 데이터는 들어와 있습니다."
      />
    </section>
  );
}
