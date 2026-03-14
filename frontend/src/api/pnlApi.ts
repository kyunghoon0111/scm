import { useQuery } from "@tanstack/react-query";
import { fromMart } from "../lib/supabase";
import { QUERY_CONFIG } from "./queryConfig";
import type { ApiResponse } from "../types/common";
import type {
  RevenueRow,
  COGSRow,
  GrossMarginRow,
  VariableCostRow,
  ContributionRow,
  OperatingProfitRow,
  WaterfallStep,
  ProfitabilityRow,
  RecoSettlementRow,
  RecoChargesRow,
  ChargeAllocationRow,
  PnlCoverageData,
  PnlCoverageDomain,
  PnlCoverageRowLevel,
} from "../types/pnl";

interface PnlParams {
  period?: string;
  from_date?: string;
  to_date?: string;
  item_id?: string | null;
  channel_store_id?: string | null;
  country?: string | null;
  charge_domain?: string | null;
  charge_type?: string | null;
  partner_id?: string | null;
  direction?: string;
}

function wrap<T>(data: T[] | null, error: unknown): ApiResponse<T[]> {
  if (error) throw error;
  const rows = data ?? [];
  const coverageValues = rows
    .map((row) => (row as Record<string, unknown>).coverage_flag)
    .filter((flag): flag is string => typeof flag === "string");
  const coverageFlag =
    coverageValues.length > 0 && coverageValues.every((flag) => flag === "ACTUAL")
      ? "ACTUAL"
      : coverageValues.length > 0
        ? "PARTIAL"
        : "NO_DATA";

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

function resolvePeriods(params: Pick<PnlParams, "period" | "from_date" | "to_date">): string[] {
  if (params.from_date && params.to_date) {
    return listPeriodsInRange(params.from_date, params.to_date);
  }

  return params.period ? [params.period] : [];
}

function applyPnlFilters(query: ReturnType<typeof fromMart>, params: PnlParams) {
  let q = query.select("*");
  const periods = resolvePeriods(params);

  if (periods.length === 1) q = q.eq("period", periods[0]);
  else if (periods.length > 1) q = q.in("period", periods);

  if (params.item_id) q = q.eq("item_id", params.item_id);
  if (params.channel_store_id) q = q.eq("channel_store_id", params.channel_store_id);
  if (params.country) q = q.eq("country", params.country);
  if (params.charge_domain) q = q.eq("charge_domain", params.charge_domain);
  if (params.charge_type) q = q.eq("charge_type", params.charge_type);
  if (params.partner_id) q = q.eq("partner_id", params.partner_id);
  return q;
}

async function fetchRevenue(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_revenue"), params)
    .order("net_revenue_krw", { ascending: false })
    .order("item_id", { ascending: true });
  return wrap<RevenueRow>(data, error);
}

export function useRevenue(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "revenue", params],
    queryFn: () => fetchRevenue(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchCOGS(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_cogs"), params)
    .order("cogs_krw", { ascending: false, nullsFirst: false })
    .order("item_id", { ascending: true });
  return wrap<COGSRow>(data, error);
}

export function useCOGS(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "cogs", params],
    queryFn: () => fetchCOGS(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchGrossMargin(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_gross_margin"), params);
  return wrap<GrossMarginRow>(data, error);
}

export function useGrossMargin(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "gross-margin", params],
    queryFn: () => fetchGrossMargin(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchVariableCost(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_variable_cost"), params);
  return wrap<VariableCostRow>(data, error);
}

export function useVariableCost(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "variable-cost", params],
    queryFn: () => fetchVariableCost(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchContribution(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_contribution"), params);
  return wrap<ContributionRow>(data, error);
}

export function useContribution(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "contribution", params],
    queryFn: () => fetchContribution(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchOperatingProfit(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_operating_profit"), params)
    .order("operating_profit_krw", { ascending: false, nullsFirst: false })
    .order("item_id", { ascending: true });
  return wrap<OperatingProfitRow>(data, error);
}

export function useOperatingProfit(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "operating-profit", params],
    queryFn: () => fetchOperatingProfit(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchWaterfall(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_pnl_waterfall_summary"), params);
  return wrap<WaterfallStep>(data, error);
}

export function useWaterfall(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "waterfall", params],
    queryFn: () => fetchWaterfall(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchProfitabilityRanking(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("v_profitability_ranking"), params);
  return wrap<ProfitabilityRow>(data, error);
}

export function useProfitabilityRanking(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "profitability-ranking", params],
    queryFn: () => fetchProfitabilityRanking(params),
    ...QUERY_CONFIG.pnl,
  });
}

async function fetchPnlRecoSettlement(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_reco_settlement_vs_estimated"), params);
  return wrap<RecoSettlementRow>(data, error);
}

export function usePnlRecoSettlement(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "reco-settlement", params],
    queryFn: () => fetchPnlRecoSettlement(params),
    ...QUERY_CONFIG.reco,
  });
}

async function fetchPnlRecoCharges(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_reco_charges_invoice_vs_allocated"), params);
  return wrap<RecoChargesRow>(data, error);
}

export function usePnlRecoCharges(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "reco-charges", params],
    queryFn: () => fetchPnlRecoCharges(params),
    ...QUERY_CONFIG.reco,
  });
}

async function fetchChargeAllocation(params: PnlParams) {
  const { data, error } = await applyPnlFilters(fromMart("mart_charge_allocated"), params);
  return wrap<ChargeAllocationRow>(data, error);
}

export function useChargeAllocation(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "charge-allocation", params],
    queryFn: () => fetchChargeAllocation(params),
    ...QUERY_CONFIG.chargeAllocation,
  });
}

async function fetchPnlCoverage(params: PnlParams): Promise<ApiResponse<PnlCoverageData>> {
  const periods = resolvePeriods(params);

  const { data: domains, error: e1 } = await applyPnlFilters(fromMart("mart_coverage_period"), params);
  if (e1) throw e1;

  let rowLevelQuery = fromMart("v_pnl_coverage_row_level").select("*");
  if (periods.length === 1) rowLevelQuery = rowLevelQuery.eq("period", periods[0]);
  else if (periods.length > 1) rowLevelQuery = rowLevelQuery.in("period", periods);

  const { data: rowLevel, error: e2 } = await rowLevelQuery;
  if (e2) throw e2;

  const result: PnlCoverageData = {
    domains: (domains as PnlCoverageDomain[]) ?? [],
    row_level: (rowLevel as PnlCoverageRowLevel[]) ?? [],
  };

  return {
    success: true,
    data: result,
    meta: {
      row_count: (domains?.length ?? 0) + (rowLevel?.length ?? 0),
      queried_at: new Date().toISOString(),
    },
    errors: [],
  };
}

export function usePnlCoverage(params: PnlParams) {
  return useQuery({
    queryKey: ["pnl", "coverage", params],
    queryFn: () => fetchPnlCoverage(params),
    ...QUERY_CONFIG.coverage,
  });
}
