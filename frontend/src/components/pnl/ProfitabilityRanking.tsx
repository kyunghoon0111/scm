import { useMemo } from "react";
import { useProfitabilityRanking } from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import type { ProfitabilityRow } from "../../types/pnl";
import { exportToExcel, buildExportFileName } from "../../lib/export";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";
import { fmtKrw } from "../../lib/format";

export default function ProfitabilityRanking() {
  const { fromDate, toDate, itemId, channelStoreId, drillDown } = useFilterStore();
  const { data: resp, isLoading, error } = useProfitabilityRanking({
    from_date: fromDate,
    to_date: toDate,
    item_id: itemId,
    channel_store_id: channelStoreId,
  });

  const rows: ProfitabilityRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => left.rank_by_contribution - right.rank_by_contribution),
    [rows],
  );

  const kpis = useMemo(() => {
    const topRow = sortedRows[0] ?? null;
    const avgContributionPct =
      rows.filter((row) => row.contribution_pct !== null).length > 0
        ? rows.reduce((sum, row) => sum + (row.contribution_pct ?? 0), 0) /
          rows.filter((row) => row.contribution_pct !== null).length
        : null;
    const avgGrossMarginPct =
      rows.filter((row) => row.gross_margin_pct !== null).length > 0
        ? rows.reduce((sum, row) => sum + (row.gross_margin_pct ?? 0), 0) /
          rows.filter((row) => row.gross_margin_pct !== null).length
        : null;
    const topTenContribution = sortedRows.slice(0, 10).reduce((sum, row) => sum + (row.contribution_krw ?? 0), 0);
    const profitableCount = rows.filter((row) => (row.contribution_krw ?? 0) > 0).length;

    return {
      topRow,
      avgContributionPct,
      avgGrossMarginPct,
      topTenContribution,
      profitableCount,
      totalRows: rows.length,
    };
  }, [rows, sortedRows]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">수익성 순위 데이터를 불러오는 중입니다...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="수익성 순위 데이터를 불러오지 못했습니다."
        message="v_profitability_ranking 뷰 권한과 기준월, 채널 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 수익성 순위 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="1위 상품" value={kpis.topRow?.item_id ?? "-"} coverageFlag={meta?.coverage_flag ?? null} />
        <KpiCard title="1위 공헌이익" value={kpis.topRow?.contribution_krw ?? null} unit="KRW" />
        <KpiCard title="평균 공헌율" value={kpis.avgContributionPct !== null ? `${(kpis.avgContributionPct * 100).toFixed(1)}%` : null} />
        <KpiCard title="평균 매출총이익률" value={kpis.avgGrossMarginPct !== null ? `${(kpis.avgGrossMarginPct * 100).toFixed(1)}%` : null} />
        <KpiCard title="상위 10개 공헌이익" value={kpis.topTenContribution} unit="KRW" />
        <KpiCard title="흑자 비중" value={kpis.totalRows > 0 ? `${((kpis.profitableCount / kpis.totalRows) * 100).toFixed(1)}%` : null} />
      </div>

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">수익성 순위</h3>
            <p className="text-xs text-gray-500">공헌이익 기준으로 상위 상품과 채널 조합을 정렬합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            {meta?.coverage_flag && <CoverageBadge flag={meta.coverage_flag} />}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() =>
                exportToExcel(
                  sortedRows.map((row) => ({
                    순위: row.rank_by_contribution,
                    기준월: row.period,
                    상품: row.item_id,
                    채널: row.channel_store_id,
                    국가: row.country,
                    순매출: row.net_revenue_krw,
                    매출총이익: row.gross_margin_krw,
                    매출총이익률: row.gross_margin_pct,
                    공헌이익: row.contribution_krw,
                    공헌율: row.contribution_pct,
                    커버리지: row.coverage_flag,
                  })),
                  buildExportFileName("수익성순위", { fromDate, toDate, itemId, channelStoreId }),
                  "수익성순위",
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
                <th className="px-4 py-2 text-right">순위</th>
                <th className="px-4 py-2">기준월</th>
                <th className="px-4 py-2">상품</th>
                <th className="px-4 py-2">채널</th>
                <th className="px-4 py-2">국가</th>
                <th className="px-4 py-2 text-right">순매출</th>
                <th className="px-4 py-2 text-right">매출총이익</th>
                <th className="px-4 py-2 text-right">매출총이익률</th>
                <th className="px-4 py-2 text-right">공헌이익</th>
                <th className="px-4 py-2 text-right">공헌율</th>
                <th className="px-4 py-2">커버리지</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={`${row.period}-${row.item_id}-${row.channel_store_id}-${index}`}
                  className="border-t border-gray-100 cursor-pointer hover:bg-blue-50"
                  onClick={() => drillDown({ itemId: row.item_id, channelStoreId: row.channel_store_id, pnlTab: "revenue" })}
                  title={`${row.item_id} 매출 상세 보기`}
                >
                  <td className="px-4 py-2 text-right font-semibold text-orange-700">{row.rank_by_contribution}</td>
                  <td className="px-4 py-2">{row.period}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                  <td className="px-4 py-2">{row.channel_store_id}</td>
                  <td className="px-4 py-2">{row.country}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.net_revenue_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.gross_margin_krw)}</td>
                  <td className="px-4 py-2 text-right">
                    {row.gross_margin_pct !== null ? `${(row.gross_margin_pct * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmtKrw(row.contribution_krw)}</td>
                  <td className="px-4 py-2 text-right">
                    {row.contribution_pct !== null ? `${(row.contribution_pct * 100).toFixed(1)}%` : "-"}
                  </td>
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
