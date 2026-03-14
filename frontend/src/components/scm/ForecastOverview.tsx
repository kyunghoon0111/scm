import { useMemo } from "react";
import {
  useDemandPlan,
  useForecastAccuracy,
  useLeadTimePrediction,
  useReplenishmentPlan,
} from "../../api/scmApi";
import { useFilterStore } from "../../store/filterStore";
import type { DemandPlanRow, ForecastAccuracyRow, LeadTimePredictionRow, ReplenishmentPlanRow } from "../../types/scm";
import CoverageBadge from "../common/CoverageBadge";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import KpiCard from "../common/KpiCard";

export default function ForecastOverview() {
  const { period, warehouseId, itemId } = useFilterStore();
  const forecast = useForecastAccuracy({ period, warehouse_id: warehouseId, item_id: itemId });
  const demandPlan = useDemandPlan({ period, warehouse_id: warehouseId, item_id: itemId });
  const replenishment = useReplenishmentPlan({ period, warehouse_id: warehouseId, item_id: itemId });
  const leadTime = useLeadTimePrediction({ period, item_id: itemId });

  const forecastRows: ForecastAccuracyRow[] = forecast.data?.data ?? [];
  const demandRows: DemandPlanRow[] = demandPlan.data?.data ?? [];
  const replenishmentRows: ReplenishmentPlanRow[] = replenishment.data?.data ?? [];
  const leadTimeRows: LeadTimePredictionRow[] = leadTime.data?.data ?? [];

  const summary = useMemo(() => {
    const avgAccuracy =
      forecastRows.filter((row) => row.accuracy_pct !== null).length > 0
        ? forecastRows.reduce((sum, row) => sum + (row.accuracy_pct ?? 0), 0) /
          forecastRows.filter((row) => row.accuracy_pct !== null).length
        : null;
    const urgentOrders = replenishmentRows.filter((row) => row.urgency === "CRITICAL" || row.urgency === "HIGH").length;
    const totalRecommended = replenishmentRows.reduce((sum, row) => sum + (row.recommended_order_qty ?? 0), 0);
    const avgPredictionError =
      leadTimeRows.filter((row) => row.prediction_error_days !== null).length > 0
        ? leadTimeRows.reduce((sum, row) => sum + Math.abs(row.prediction_error_days ?? 0), 0) /
          leadTimeRows.filter((row) => row.prediction_error_days !== null).length
        : null;
    return { avgAccuracy, urgentOrders, totalRecommended, avgPredictionError };
  }, [forecastRows, replenishmentRows, leadTimeRows]);

  if (forecast.isLoading || demandPlan.isLoading || replenishment.isLoading || leadTime.isLoading) {
    return <div className="p-8 text-center text-gray-400">예측 지표를 불러오는 중입니다...</div>;
  }

  if (forecast.error || demandPlan.error || replenishment.error || leadTime.error) {
    return (
      <ErrorState
        title="예측 데이터를 불러오지 못했습니다."
        message="ML mart 권한과 기준월 필터를 확인해 주세요."
      />
    );
  }

  if (
    forecastRows.length === 0 &&
    demandRows.length === 0 &&
    replenishmentRows.length === 0 &&
    leadTimeRows.length === 0
  ) {
    return <EmptyState message="현재 기준월에는 예측/계획 데이터가 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="예측 정확도" value={summary.avgAccuracy !== null ? `${summary.avgAccuracy.toFixed(1)}%` : null} />
        <KpiCard title="긴급 발주" value={summary.urgentOrders} unit="건" />
        <KpiCard title="추천 발주량" value={summary.totalRecommended} unit="EA" />
        <KpiCard
          title="리드타임 오차"
          value={summary.avgPredictionError !== null ? `${summary.avgPredictionError.toFixed(1)}일` : null}
          coverageFlag={forecast.data?.meta.coverage_flag ?? null}
        />
      </div>

      {replenishmentRows.length > 0 && (
        <div className="panel-table">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">보충 발주 추천</h3>
              <p className="text-xs text-gray-500">현재 재고와 재주문점을 비교해 우선 발주 대상을 보여줍니다.</p>
            </div>
            {forecast.data?.meta.coverage_flag && <CoverageBadge flag={forecast.data.meta.coverage_flag} />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left text-gray-600">
                  <th className="px-4 py-2">계획일</th>
                  <th className="px-4 py-2">상품</th>
                  <th className="px-4 py-2">창고</th>
                  <th className="px-4 py-2 text-right">현재재고</th>
                  <th className="px-4 py-2 text-right">재주문점</th>
                  <th className="px-4 py-2 text-right">추천발주</th>
                  <th className="px-4 py-2">긴급도</th>
                </tr>
              </thead>
              <tbody>
                {replenishmentRows.map((row, index) => (
                  <tr key={`${row.plan_date}-${row.item_id}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{row.plan_date}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                    <td className="px-4 py-2">{row.warehouse_id ?? "-"}</td>
                    <td className="px-4 py-2 text-right">{(row.current_stock ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{(row.reorder_point ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">{(row.recommended_order_qty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2">{row.urgency ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {forecastRows.length > 0 && (
        <div className="panel-table">
          <div className="border-b border-black/5 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">예측 정확도</h3>
            <p className="text-xs text-gray-500">실적 대비 예측 오차와 정확도를 기준월 기준으로 점검합니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left text-gray-600">
                  <th className="px-4 py-2">기준월</th>
                  <th className="px-4 py-2">상품</th>
                  <th className="px-4 py-2">모델</th>
                  <th className="px-4 py-2 text-right">실적</th>
                  <th className="px-4 py-2 text-right">예측</th>
                  <th className="px-4 py-2 text-right">MAPE</th>
                  <th className="px-4 py-2 text-right">정확도</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map((row, index) => (
                  <tr key={`${row.period}-${row.item_id}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{row.period}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.item_id}</td>
                    <td className="px-4 py-2">{row.forecast_method}</td>
                    <td className="px-4 py-2 text-right">{(row.actual_qty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{(row.forecast_qty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.mape !== null ? `${row.mape.toFixed(1)}%` : "-"}</td>
                    <td className="px-4 py-2 text-right">{row.accuracy_pct !== null ? `${row.accuracy_pct.toFixed(1)}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
