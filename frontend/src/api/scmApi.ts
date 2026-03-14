import { useQuery } from "@tanstack/react-query";
import { fromMart } from "../lib/supabase";
import { QUERY_CONFIG } from "./queryConfig";
import type { ApiResponse } from "../types/common";
import type {
  InventoryOnhandRow,
  TurnoverRow,
  StockoutRiskRow,
  OverstockRow,
  ExpiryRiskRow,
  FefoPickListRow,
  OpenPORow,
  LeadTimeRow,
  SupplierPerformanceRow,
  ServiceLevelRow,
  ShipmentDailyRow,
  ReturnAnalysisRow,
  RecoInventoryMovementRow,
  RecoOmsVsWmsRow,
  RecoErpVsWmsRow,
  RecoSettlementRow,
  RecoChargesRow,
  ConstraintSignalRow,
  CoveragePeriodRow,
  ForecastAccuracyRow,
  DemandPlanRow,
  ReplenishmentPlanRow,
  LeadTimePredictionRow,
} from "../types/scm";

// ── 공통 ──

interface ScmParams {
  period?: string;
  from_date?: string;
  to_date?: string;
  warehouse_id?: string | null;
  item_id?: string | null;
  supplier_id?: string | null;
  channel?: string | null;
}

function normalizeDateRange(params: Pick<ScmParams, "period" | "from_date" | "to_date">) {
  if (params.from_date && params.to_date) {
    return {
      start: params.from_date,
      endExclusive: addDays(params.to_date, 1),
      periods: listPeriodsInRange(params.from_date, params.to_date),
    };
  }

  if (!params.period) return null;

  const [yearText, monthText] = params.period.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    endExclusive: end.toISOString().slice(0, 10),
    periods: [params.period],
  };
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function listPeriodsInRange(fromDate: string, toDate: string): string[] {
  const start = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  const periods: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    periods.push(`${year}-${month}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return periods;
}

function wrap<T>(data: T[] | null, error: unknown): ApiResponse<T[]> {
  if (error) throw error;
  const rows = data ?? [];
  const coverageValues = rows
    .map((row) => (row as Record<string, unknown>).coverage_flag)
    .filter((flag): flag is string => typeof flag === "string");
  const coverageFlag =
    rows.length === 0
      ? "NO_DATA"
      : coverageValues.length === 0
        ? "ACTUAL"
        : coverageValues.every((flag) => flag === "ACTUAL")
          ? "ACTUAL"
          : "PARTIAL";
  return {
    success: true,
    data: rows,
    meta: {
      row_count: rows.length,
      queried_at: new Date().toISOString(),
      coverage_flag: coverageFlag,
    },
    errors: [],
  };
}

// period 컬럼이 있는 테이블만 period 필터 적용
const TABLES_WITH_PERIOD = new Set([
  "mart_open_po",
  "mart_return_analysis",
  "mart_shipment_performance",
  "mart_reco_oms_vs_wms",
  "mart_reco_erp_gr_vs_wms_receipt",
  "mart_reco_settlement_vs_estimated",
  "mart_reco_charges_invoice_vs_allocated",
  "mart_constraint_signals",
  "mart_constraint_root_cause",
  "mart_constraint_action_plan",
  "mart_constraint_effectiveness",
  "mart_coverage_period",
  "mart_forecast_accuracy",
  "mart_lead_time_analysis",
]);

const DATE_COLUMN_BY_TABLE: Partial<Record<string, string>> = {
  mart_inventory_onhand: "snapshot_date",
  mart_stockout_risk: "as_of_date",
  mart_shipment_daily: "ship_date",
  mart_demand_plan: "plan_date",
  mart_replenishment_plan: "plan_date",
};

function applyFilters(
  query: ReturnType<typeof fromMart>,
  params: ScmParams,
  tableName?: string,
) {
  let q = query.select("*");
  const range = normalizeDateRange(params);

  if (range && tableName && TABLES_WITH_PERIOD.has(tableName)) {
    q = range.periods.length === 1 ? q.eq("period", range.periods[0]) : q.in("period", range.periods);
  }

  const dateColumn = tableName ? DATE_COLUMN_BY_TABLE[tableName] : null;
  if (range && dateColumn) {
    q = q.gte(dateColumn, range.start).lt(dateColumn, range.endExclusive);
  }
  if (params.warehouse_id) q = q.eq("warehouse_id", params.warehouse_id);
  if (params.item_id) q = q.eq("item_id", params.item_id);
  if (params.supplier_id) q = q.eq("supplier_id", params.supplier_id);
  if (params.channel) q = q.eq("channel_store_id", params.channel);
  return q;
}

// ── 탭 1~4: 재고 ──

async function fetchInventoryOnhand(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_inventory_onhand"),
    params,
    "mart_inventory_onhand",
  )
    .order("snapshot_date", { ascending: false })
    .order("onhand_qty", { ascending: false });
  return wrap<InventoryOnhandRow>(data, error);
}

async function fetchTurnoverAnalysis(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_inventory_turnover"),
    params,
    "mart_inventory_turnover",
  );
  return wrap<TurnoverRow>(data, error);
}

async function fetchStockoutRisk(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_stockout_risk"),
    params,
    "mart_stockout_risk",
  )
    .order("days_of_cover", { ascending: true })
    .order("item_id", { ascending: true });
  return wrap<StockoutRiskRow>(data, error);
}

async function fetchOverstock(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_overstock"),
    params,
    "mart_overstock",
  );
  return wrap<OverstockRow>(data, error);
}

export function useInventoryOnhand(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "inventory-onhand", params],
    queryFn: () => fetchInventoryOnhand(params),
    ...QUERY_CONFIG.inventory,
  });
}

export function useTurnoverAnalysis(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "turnover", params],
    queryFn: () => fetchTurnoverAnalysis(params),
    ...QUERY_CONFIG.turnover,
  });
}

export function useStockoutRisk(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "stockout-risk", params],
    queryFn: () => fetchStockoutRisk(params),
    ...QUERY_CONFIG.inventory,
  });
}

export function useOverstock(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "overstock", params],
    queryFn: () => fetchOverstock(params),
    ...QUERY_CONFIG.inventory,
  });
}

// ── 탭 5: 유통기한위험 ──

async function fetchExpiryRisk(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_expiry_risk"),
    params,
    "mart_expiry_risk",
  );
  return wrap<ExpiryRiskRow>(data, error);
}

async function fetchFefoPickList(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_fefo_pick_list"),
    params,
    "mart_fefo_pick_list",
  );
  return wrap<FefoPickListRow>(data, error);
}

export function useExpiryRisk(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "expiry-risk", params],
    queryFn: () => fetchExpiryRisk(params),
    ...QUERY_CONFIG.inventory,
  });
}

export function useFefoPickList(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "fefo-pick-list", params],
    queryFn: () => fetchFefoPickList(params),
    ...QUERY_CONFIG.inventory,
  });
}

// ── 탭 6: 발주현황 ──

async function fetchOpenPO(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_open_po"),
    params,
    "mart_open_po",
  )
    .gt("qty_open", 0)
    .order("eta_date", { ascending: true, nullsFirst: false })
    .order("qty_open", { ascending: false });
  return wrap<OpenPORow>(data, error);
}

export function useOpenPO(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "open-po", params],
    queryFn: () => fetchOpenPO(params),
    ...QUERY_CONFIG.inventory,
  });
}

// ── 탭 7: 리드타임 분석 ──
// v_lead_time_analysis 뷰 사용 (migrations/10_views.sql)

async function fetchLeadTime(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("v_lead_time_analysis"),
    params,
    "v_lead_time_analysis",
  );
  return wrap<LeadTimeRow>(data, error);
}

async function fetchSupplierPerformance(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("v_lead_time_analysis"),
    params,
    "v_lead_time_analysis",
  );
  return wrap<SupplierPerformanceRow>(data, error);
}

export function useLeadTime(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "lead-time", params],
    queryFn: () => fetchLeadTime(params),
    ...QUERY_CONFIG.turnover,
  });
}

export function useSupplierPerformance(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "supplier-performance", params],
    queryFn: () => fetchSupplierPerformance(params),
    ...QUERY_CONFIG.turnover,
  });
}

// ── 탭 8: 납기성과 ──

async function fetchServiceLevel(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_service_level"),
    params,
    "mart_service_level",
  );
  return wrap<ServiceLevelRow>(data, error);
}

export function useServiceLevel(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "service-level", params],
    queryFn: () => fetchServiceLevel(params),
    ...QUERY_CONFIG.inventory,
  });
}

// ── 탭 9: 출고/반품 ──

async function fetchShipmentDaily(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_shipment_daily"),
    params,
    "mart_shipment_daily",
  );
  return wrap<ShipmentDailyRow>(data, error);
}

async function fetchReturnAnalysis(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_return_analysis"),
    params,
    "mart_return_analysis",
  );
  return wrap<ReturnAnalysisRow>(data, error);
}

export function useShipmentDaily(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "shipment-daily", params],
    queryFn: () => fetchShipmentDaily(params),
    ...QUERY_CONFIG.inventory,
  });
}

export function useReturnAnalysis(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "return-analysis", params],
    queryFn: () => fetchReturnAnalysis(params),
    ...QUERY_CONFIG.inventory,
  });
}

// ── 탭 10: 대사검증 센터 ──

async function fetchRecoInventoryMovement(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_reco_inventory_movement"),
    params,
    "mart_reco_inventory_movement",
  );
  return wrap<RecoInventoryMovementRow>(data, error);
}

async function fetchRecoOmsVsWms(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_reco_oms_vs_wms"),
    params,
    "mart_reco_oms_vs_wms",
  );
  return wrap<RecoOmsVsWmsRow>(data, error);
}

async function fetchRecoErpVsWms(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_reco_erp_gr_vs_wms_receipt"),
    params,
    "mart_reco_erp_gr_vs_wms_receipt",
  );
  return wrap<RecoErpVsWmsRow>(data, error);
}

async function fetchRecoSettlement(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_reco_settlement_vs_estimated"),
    params,
    "mart_reco_settlement_vs_estimated",
  );
  return wrap<RecoSettlementRow>(data, error);
}

async function fetchRecoCharges(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_reco_charges_invoice_vs_allocated"),
    params,
    "mart_reco_charges_invoice_vs_allocated",
  );
  return wrap<RecoChargesRow>(data, error);
}

export function useRecoInventoryMovement(params: ScmParams) {
  return useQuery({
    queryKey: ["reco", "inventory-movement", params],
    queryFn: () => fetchRecoInventoryMovement(params),
    ...QUERY_CONFIG.reco,
  });
}

export function useRecoOmsVsWms(params: ScmParams) {
  return useQuery({
    queryKey: ["reco", "oms-vs-wms", params],
    queryFn: () => fetchRecoOmsVsWms(params),
    ...QUERY_CONFIG.reco,
  });
}

export function useRecoErpVsWms(params: ScmParams) {
  return useQuery({
    queryKey: ["reco", "erp-vs-wms", params],
    queryFn: () => fetchRecoErpVsWms(params),
    ...QUERY_CONFIG.reco,
  });
}

export function useRecoSettlement(params: ScmParams) {
  return useQuery({
    queryKey: ["reco", "settlement-vs-estimated", params],
    queryFn: () => fetchRecoSettlement(params),
    ...QUERY_CONFIG.reco,
  });
}

export function useRecoCharges(params: ScmParams) {
  return useQuery({
    queryKey: ["reco", "charges", params],
    queryFn: () => fetchRecoCharges(params),
    ...QUERY_CONFIG.reco,
  });
}

// ── 탭 11: 병목지표 ──

async function fetchConstraintSignals(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_constraint_signals"),
    params,
    "mart_constraint_signals",
  );
  return wrap<ConstraintSignalRow>(data, error);
}

export function useConstraintSignals(params: ScmParams) {
  return useQuery({
    queryKey: ["constraint", "signals", params],
    queryFn: () => fetchConstraintSignals(params),
    ...QUERY_CONFIG.constraintSignals,
  });
}

// ── 탭 12: 데이터 커버리지 ──

async function fetchCoverage(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_coverage_period"),
    params,
    "mart_coverage_period",
  );
  return wrap<CoveragePeriodRow>(data, error);
}

export function useCoverage(params: ScmParams) {
  return useQuery({
    queryKey: ["coverage", params],
    queryFn: () => fetchCoverage(params),
    ...QUERY_CONFIG.coverage,
  });
}

async function fetchForecastAccuracy(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_forecast_accuracy"),
    params,
    "mart_forecast_accuracy",
  );
  return wrap<ForecastAccuracyRow>(data, error);
}

async function fetchDemandPlan(params: ScmParams) {
  let query = fromMart("mart_demand_plan").select("*");
  if (params.item_id) query = query.eq("item_id", params.item_id);
  if (params.warehouse_id) query = query.eq("warehouse_id", params.warehouse_id);
  const range = normalizeDateRange(params);
  if (range) query = query.gte("plan_date", range.start).lt("plan_date", range.endExclusive);

  const { data, error } = await query.order("plan_date", { ascending: true });
  return wrap<DemandPlanRow>(data, error);
}

async function fetchReplenishmentPlan(params: ScmParams) {
  let query = fromMart("mart_replenishment_plan").select("*");
  if (params.item_id) query = query.eq("item_id", params.item_id);
  if (params.warehouse_id) query = query.eq("warehouse_id", params.warehouse_id);
  const range = normalizeDateRange(params);
  if (range) query = query.gte("plan_date", range.start).lt("plan_date", range.endExclusive);

  const { data, error } = await query.order("plan_date", { ascending: true });
  return wrap<ReplenishmentPlanRow>(data, error);
}

async function fetchLeadTimePrediction(params: ScmParams) {
  const { data, error } = await applyFilters(
    fromMart("mart_lead_time_analysis"),
    params,
    "mart_lead_time_analysis",
  );
  return wrap<LeadTimePredictionRow>(data, error);
}

export function useForecastAccuracy(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "forecast-accuracy", params],
    queryFn: () => fetchForecastAccuracy(params),
    ...QUERY_CONFIG.turnover,
  });
}

export function useDemandPlan(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "demand-plan", params],
    queryFn: () => fetchDemandPlan(params),
    ...QUERY_CONFIG.turnover,
  });
}

export function useReplenishmentPlan(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "replenishment-plan", params],
    queryFn: () => fetchReplenishmentPlan(params),
    ...QUERY_CONFIG.turnover,
  });
}

export function useLeadTimePrediction(params: ScmParams) {
  return useQuery({
    queryKey: ["scm", "lead-time-prediction", params],
    queryFn: () => fetchLeadTimePrediction(params),
    ...QUERY_CONFIG.turnover,
  });
}
