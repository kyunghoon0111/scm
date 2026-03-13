import type { CoverageFlag } from "./common";

export interface RevenueRow {
  period: string | null;
  item_id: string | null;
  channel_store_id: string | null;
  country: string | null;
  gross_sales_krw: number | null;
  discounts_krw: number | null;
  refunds_krw: number | null;
  net_revenue_krw: number | null;
  source: string | null;
  coverage_flag: CoverageFlag | null;
}

export interface COGSRow {
  period: string | null;
  item_id: string | null;
  channel_store_id: string | null;
  country: string | null;
  qty_shipped: number | null;
  qty_returned: number | null;
  qty_net: number | null;
  unit_cost_krw: number | null;
  cogs_krw: number | null;
  coverage_flag: CoverageFlag | null;
}

export interface GrossMarginRow {
  period: string;
  item_id: string;
  channel_store_id: string;
  country: string;
  net_revenue_krw: number | null;
  cogs_krw: number | null;
  gross_margin_krw: number | null;
  gross_margin_pct: number | null;
  coverage_flag: CoverageFlag | null;
}

export interface VariableCostRow {
  period: string;
  item_id: string;
  channel_store_id: string;
  country: string;
  charge_domain: string;
  charge_type: string;
  allocated_amount_krw: number;
  coverage_flag: CoverageFlag | null;
}

export interface ContributionRow {
  period: string;
  item_id: string;
  channel_store_id: string;
  country: string;
  gross_margin_krw: number | null;
  total_variable_cost_krw: number | null;
  contribution_krw: number | null;
  contribution_pct: number | null;
  coverage_flag: CoverageFlag | null;
}

export interface OperatingProfitRow {
  period: string | null;
  item_id: string | null;
  channel_store_id: string | null;
  country: string | null;
  contribution_krw: number | null;
  fixed_cost_krw: number | null;
  operating_profit_krw: number | null;
  operating_profit_pct: number | null;
  coverage_flag: CoverageFlag | null;
}

export interface WaterfallStep {
  period: string;
  metric_name: string;
  metric_order: number;
  amount_krw: number | null;
}

export interface ProfitabilityRow {
  period: string;
  item_id: string;
  channel_store_id: string;
  country: string;
  net_revenue_krw: number | null;
  gross_margin_krw: number | null;
  gross_margin_pct: number | null;
  contribution_krw: number | null;
  contribution_pct: number | null;
  rank_by_contribution: number;
  coverage_flag: CoverageFlag | null;
}

export interface RecoSettlementRow {
  period: string;
  channel_store_id: string;
  item_id: string;
  settlement_revenue_krw: number;
  estimated_revenue_krw: number;
  delta_krw: number;
  variance_pct: number | null;
}

export interface RecoChargesRow {
  period: string;
  charge_type: string;
  invoice_total: number;
  allocated_total: number;
  delta: number;
  tied: boolean;
}

export interface ChargeAllocationRow {
  period: string;
  charge_type: string;
  charge_domain: string;
  cost_stage: string;
  invoice_no: string;
  invoice_line_no: number;
  item_id: string;
  warehouse_id: string;
  channel_store_id: string;
  lot_id: string | null;
  allocation_basis: string;
  basis_value: number;
  allocated_amount: number;
  allocated_amount_krw: number;
  currency: string;
  capitalizable_flag: boolean;
}

export interface PnlCoverageDomain {
  period: string;
  domain: string;
  coverage_rate: number;
  included_rows: number | null;
  missing_rows: number | null;
  severity: string;
  is_closed_period: boolean;
}

export interface PnlCoverageRowLevel {
  period: string;
  mart: string;
  actual_count: number;
  partial_count: number;
  total_count: number;
  actual_ratio: number;
}

export interface PnlCoverageData {
  domains: PnlCoverageDomain[];
  row_level: PnlCoverageRowLevel[];
}
