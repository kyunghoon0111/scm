import { useMemo } from "react";
import {
  useCOGS,
  useContribution,
  useOperatingProfit,
  useProfitabilityRanking,
  useRevenue,
} from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import CoverageNotice, { type CoverageNoticeItem } from "../common/CoverageNotice";
import KpiCard from "../common/KpiCard";

export default function PnlOverview() {
  const { fromDate, toDate, itemId, channelStoreId } = useFilterStore();

  const params = {
    from_date: fromDate,
    to_date: toDate,
    item_id: itemId,
    channel_store_id: channelStoreId,
  };

  const revenue = useRevenue(params);
  const cogs = useCOGS(params);
  const contribution = useContribution(params);
  const operatingProfit = useOperatingProfit(params);
  const ranking = useProfitabilityRanking(params);

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
    const profitableRows = rankingRows.filter((row) => (row.contribution_krw ?? 0) > 0).length;
    const profitableShare = rankingRows.length > 0 ? (profitableRows / rankingRows.length) * 100 : null;
    const topSku = rankingRows[0]?.item_id ?? "-";

    return {
      revenueRows,
      cogsRows,
      contributionRows,
      operatingRows,
      netRevenue,
      discountAndRefund,
      totalCogs,
      totalContribution,
      totalOperatingProfit,
      operatingMargin,
      lossRows,
      profitableShare,
      topSku,
    };
  }, [cogs.data?.data, contribution.data?.data, operatingProfit.data?.data, ranking.data?.data, revenue.data?.data]);

  const guidanceItems = useMemo<CoverageNoticeItem[]>(() => {
    const items: CoverageNoticeItem[] = [];

    if (summary.revenueRows.length === 0) {
      items.push({
        key: "sales",
        label: "매출·정산 파일이 필요합니다",
        message: "순매출과 할인, 환불, 채널별 매출을 보려면 매출/정산 업로드가 먼저 있어야 합니다.",
        tone: "critical",
      });
    } else if (revenue.data?.meta.coverage_flag === "PARTIAL") {
      items.push({
        key: "sales-partial",
        label: "매출 데이터가 일부만 들어왔습니다",
        message: "채널이나 품목 일부만 들어오면 순매출과 순위가 실제보다 보수적으로 보일 수 있습니다.",
        tone: "warning",
      });
    }

    if (summary.cogsRows.length === 0) {
      items.push({
        key: "cogs",
        label: "원가 계산용 데이터가 부족합니다",
        message: "매출원가를 안정적으로 계산하려면 재고 스냅샷, 출고, 발주/입고, 단가 정보가 함께 맞아야 합니다.",
        tone: "critical",
      });
    } else if (cogs.data?.meta.coverage_flag === "PARTIAL") {
      items.push({
        key: "cogs-partial",
        label: "매출원가가 일부 누락되었습니다",
        message: "출고는 있는데 단가 연결이 비어 있으면 공헌이익과 영업이익이 일부만 계산됩니다.",
        tone: "warning",
      });
    }

    if (summary.contributionRows.length === 0 || summary.operatingRows.length === 0) {
      items.push({
        key: "charge",
        label: "비용 데이터가 부족합니다",
        message: "공헌이익과 영업이익을 보려면 비용 파일을 넣고, 필요하면 환율과 고정비 기준도 설정해야 합니다.",
        tone: "warning",
      });
    } else if (contribution.data?.meta.coverage_flag === "PARTIAL" || operatingProfit.data?.meta.coverage_flag === "PARTIAL") {
      items.push({
        key: "charge-partial",
        label: "비용 반영이 일부만 끝났습니다",
        message: "비용 파일 일부가 빠졌거나 배부 기준이 덜 맞으면 손익 숫자가 참고용으로만 보일 수 있습니다.",
        tone: "warning",
      });
    }

    return items;
  }, [
    cogs.data?.meta.coverage_flag,
    contribution.data?.meta.coverage_flag,
    operatingProfit.data?.meta.coverage_flag,
    revenue.data?.meta.coverage_flag,
    summary.cogsRows.length,
    summary.contributionRows.length,
    summary.operatingRows.length,
    summary.revenueRows.length,
  ]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">핵심 손익 지표</p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">매출부터 영업이익까지 바로 확인</h3>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">판단 보조 지표</p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">손익 해석에 함께 보는 숫자</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard title="할인+환불" value={summary.discountAndRefund} unit="KRW" />
            <KpiCard title="적자 SKU" value={summary.lossRows} unit="건" />
            <KpiCard title="흑자 비중" value={summary.profitableShare !== null ? `${summary.profitableShare.toFixed(1)}%` : null} />
            <KpiCard title="상위 SKU" value={summary.topSku} />
          </div>
          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
            P&amp;L은 매출, 원가, 비용이 모두 맞아야 신뢰도가 올라갑니다. 부족한 원천은 아래 안내에서 바로 확인하세요.
          </div>
        </div>
      </div>

      <CoverageNotice
        title="P&L 데이터 보완 안내"
        summary="이 영역은 실제 손익 계산에 영향을 주는 입력만 추려서 알려줍니다. 넣지 않아도 되는 선택 데이터까지 과하게 요구하지 않습니다."
        items={guidanceItems}
        successMessage="매출, 원가, 비용 기준으로 현재 조회 범위의 핵심 손익 원천은 들어와 있습니다."
      />
    </section>
  );
}
