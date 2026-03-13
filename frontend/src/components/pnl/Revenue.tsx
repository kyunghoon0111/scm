import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRevenue } from "../../api/pnlApi";
import { useFilterStore } from "../../store/filterStore";
import type { RevenueRow } from "../../types/pnl";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

function fmtKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

export default function Revenue() {
  const { period, itemId, channelStoreId } = useFilterStore();
  const { data: resp, isLoading, error } = useRevenue({
    period,
    item_id: itemId,
    channel_store_id: channelStoreId,
  });

  const rows: RevenueRow[] = resp?.data ?? [];
  const meta = resp?.meta;

  const kpis = useMemo(() => {
    const grossSales = rows.some((row) => row.gross_sales_krw !== null)
      ? rows.reduce((sum, row) => sum + (row.gross_sales_krw ?? 0), 0)
      : null;
    const discounts = rows.some((row) => row.discounts_krw !== null)
      ? rows.reduce((sum, row) => sum + (row.discounts_krw ?? 0), 0)
      : null;
    const refunds = rows.some((row) => row.refunds_krw !== null)
      ? rows.reduce((sum, row) => sum + (row.refunds_krw ?? 0), 0)
      : null;
    const netRevenue = rows.some((row) => row.net_revenue_krw !== null)
      ? rows.reduce((sum, row) => sum + (row.net_revenue_krw ?? 0), 0)
      : null;

    const netMargin = grossSales && grossSales > 0 && netRevenue !== null ? (netRevenue / grossSales) * 100 : null;
    const channelCount = new Set(rows.map((row) => row.channel_store_id ?? "UNKNOWN")).size;
    const countryCount = new Set(rows.map((row) => row.country ?? "UNKNOWN")).size;

    return { grossSales, discounts, refunds, netRevenue, netMargin, channelCount, countryCount };
  }, [rows]);

  const trendData = useMemo(() => {
    const byPeriodChannel = new Map<string, Map<string, number>>();
    const channels = new Set<string>();

    for (const row of rows) {
      if (row.net_revenue_krw === null) continue;
      const channelId = row.channel_store_id ?? "UNKNOWN";
      channels.add(channelId);

      const periodKey = row.period ?? "-";
      const channelMap = byPeriodChannel.get(periodKey) ?? new Map<string, number>();
      channelMap.set(
        channelId,
        (channelMap.get(channelId) ?? 0) + row.net_revenue_krw,
      );
      byPeriodChannel.set(periodKey, channelMap);
    }

    const periods = Array.from(byPeriodChannel.keys()).sort();
    return {
      channels: Array.from(channels),
      data: periods.map((currentPeriod) => {
        const entry: Record<string, number | string> = { period: currentPeriod };
        const channelMap = byPeriodChannel.get(currentPeriod) ?? new Map<string, number>();

        for (const channel of channels) {
          entry[channel] = channelMap.get(channel) ?? 0;
        }

        return entry;
      }),
    };
  }, [rows]);

  const byCountry = useMemo(() => {
    const grouped = new Map<string, { total: number; partial: boolean }>();

    for (const row of rows) {
      const country = row.country ?? "UNKNOWN";
      const existing = grouped.get(country) ?? { total: 0, partial: false };
      existing.total += row.net_revenue_krw ?? 0;
      if (row.coverage_flag !== "ACTUAL") existing.partial = true;
      grouped.set(country, existing);
    }

    return Array.from(grouped.entries())
      .map(([country, values]) => ({
        country,
        net_revenue_krw: values.total,
        partial: values.partial,
      }))
      .sort((a, b) => b.net_revenue_krw - a.net_revenue_krw);
  }, [rows]);

  const lineColors = ["#2563eb", "#ef4444", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2"];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="매출 데이터를 불러오지 못했습니다."
        message="mart 접근 권한이나 현재 조회 필터를 확인해 주세요."
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState message="현재 필터에 맞는 매출 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          title="총매출"
          value={kpis.grossSales}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="할인"
          value={kpis.discounts}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="환불"
          value={kpis.refunds}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard
          title="순매출"
          value={kpis.netRevenue}
          unit="KRW"
          coverageFlag={meta?.coverage_flag ?? null}
        />
        <KpiCard title="순매출률" value={kpis.netMargin !== null ? `${kpis.netMargin.toFixed(1)}%` : null} />
        <KpiCard title="채널 수" value={kpis.channelCount} unit="개" />
        <KpiCard title="국가 수" value={kpis.countryCount} unit="개" />
      </div>

      {trendData.data.length > 0 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">채널별 매출</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => fmtKrw(Number(value))} />
              <Legend />
              {trendData.channels.map((channel, index) => (
                <Line
                  key={channel}
                  type="monotone"
                  dataKey={channel}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={channel}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {byCountry.length > 0 && (
        <div className="panel-card-strong">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">국가별 매출</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCountry}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, _name, props) => [
                  fmtKrw(Number(value)),
                  (props as { payload?: { partial?: boolean } })?.payload?.partial
                    ? "부분 데이터 포함"
                    : "순매출",
                ]}
              />
              <Bar dataKey="net_revenue_krw" name="순매출" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-gray-400">
            부분 데이터가 섞여 있으면 총액이 실제보다 작게 보일 수 있습니다.
          </p>
        </div>
      )}

      <div className="panel-table">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">매출 상세</h3>
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
                <th className="px-4 py-2">출처</th>
                <th className="px-4 py-2 text-right">총매출</th>
                <th className="px-4 py-2 text-right">할인</th>
                <th className="px-4 py-2 text-right">환불</th>
                <th className="px-4 py-2 text-right">순매출</th>
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
                  <td className="px-4 py-2">{row.source ?? "-"}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.gross_sales_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.discounts_krw)}</td>
                  <td className="px-4 py-2 text-right">{fmtKrw(row.refunds_krw)}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtKrw(row.net_revenue_krw)}</td>
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
