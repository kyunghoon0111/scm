import { useMemo } from "react";
import {
  useCOGS,
  useContribution,
  useOperatingProfit,
  useProfitabilityRanking,
  useRevenue,
} from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import KpiCard from "../common/KpiCard";

export default function PnlOverview() {
  const { fromDate, toDate, itemId, channelStoreId } = useFilterStore();

  const revenue = useRevenue({ from_date: fromDate, to_date: toDate, item_id: itemId, channel_store_id: channelStoreId });
  const cogs = useCOGS({ from_date: fromDate, to_date: toDate, item_id: itemId, channel_store_id: channelStoreId });
  const contribution = useContribution({ from_date: fromDate, to_date: toDate, item_id: itemId, channel_store_id: channelStoreId });
  const operatingProfit = useOperatingProfit({ from_date: fromDate, to_date: toDate, item_id: itemId, channel_store_id: channelStoreId });
  const ranking = useProfitabilityRanking({ from_date: fromDate, to_date: toDate, item_id: itemId, channel_store_id: channelStoreId });

  const summary = useMemo(() => {
    const revenueRows = revenue.data?.data ?? [];
    const cogsRows = cogs.data?.data ?? [];
    const contributionRows = contribution.data?.data ?? [];
    const operatingRows = operatingProfit.data?.data ?? [];
    const rankingRows = ranking.data?.data ?? [];

    const netRevenue = revenueRows.reduce((sum, row) => sum + (row.net_revenue_krw ?? 0), 0);
    const discountAndRefund = revenueRows.reduce(
      (sum, row) => sum + (row.discounts_krw ?? 0) + (row.refunds_krw ?? 0),
      0,
    );
    const totalCogs = cogsRows.reduce((sum, row) => sum + (row.cogs_krw ?? 0), 0);
    const totalContribution = contributionRows.reduce((sum, row) => sum + (row.contribution_krw ?? 0), 0);
    const totalOperatingProfit = operatingRows.reduce((sum, row) => sum + (row.operating_profit_krw ?? 0), 0);
    const operatingMargin = netRevenue > 0 ? (totalOperatingProfit / netRevenue) * 100 : null;
    const lossRows = operatingRows.filter((row) => (row.operating_profit_krw ?? 0) < 0).length;
    const partialRows = operatingRows.filter((row) => row.coverage_flag !== "ACTUAL").length;
    const profitableRows = rankingRows.filter((row) => (row.contribution_krw ?? 0) > 0).length;
    const profitableShare = rankingRows.length > 0 ? (profitableRows / rankingRows.length) * 100 : null;
    const topSku = rankingRows[0]?.item_id ?? "-";

    return {
      netRevenue,
      discountAndRefund,
      totalCogs,
      totalContribution,
      totalOperatingProfit,
      operatingMargin,
      lossRows,
      partialRows,
      profitableShare,
      topSku,
    };
  }, [cogs.data?.data, contribution.data?.data, operatingProfit.data?.data, ranking.data?.data, revenue.data?.data]);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel-card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">핵심 손익지표</p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">매출부터 이익까지 바로 읽는 숫자</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <KpiCard title="순매출" value={summary.netRevenue} unit="KRW" coverageFlag={revenue.data?.meta.coverage_flag ?? null} />
          <KpiCard title="매출원가" value={summary.totalCogs} unit="KRW" coverageFlag={cogs.data?.meta.coverage_flag ?? null} />
          <KpiCard title="공헌이익" value={summary.totalContribution} unit="KRW" coverageFlag={contribution.data?.meta.coverage_flag ?? null} />
          <KpiCard title="영업이익" value={summary.totalOperatingProfit} unit="KRW" coverageFlag={operatingProfit.data?.meta.coverage_flag ?? null} />
          <KpiCard title="영업이익률" value={summary.operatingMargin !== null ? `${summary.operatingMargin.toFixed(1)}%` : null} />
        </div>
      </div>

      <div className="panel-card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">참고 지표</p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">원인 파악 보조</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard title="할인+환불" value={summary.discountAndRefund} unit="KRW" />
          <KpiCard title="적자 행" value={summary.lossRows} unit="건" />
          <KpiCard title="흑자 비중" value={summary.profitableShare !== null ? `${summary.profitableShare.toFixed(1)}%` : null} />
          <KpiCard title="1위 SKU" value={summary.topSku} />
        </div>
        <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
          부분 데이터 {summary.partialRows.toLocaleString()}건을 포함해 계산되므로, 운영 확인 시에는 커버리지 배지도 함께 보세요.
        </div>
      </div>
    </section>
  );
}
