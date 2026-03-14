export interface InventoryOnhandRow {
  snapshot_date: string | null;
  warehouse_id: string | null;
  item_id: string | null;
  lot_id: string | null;
  onhand_qty: number | null;
  sellable_qty: number | null;
  blocked_qty: number | null;
  expired_qty: number | null;
  final_expiry_date: string | null;
  expiry_bucket: string | null;
  fefo_rank: number | null;
  min_sellable_days: number | null;
}

export interface TurnoverRow {
  item_id: string;
  warehouse_id: string;
  total_shipped: number;
  avg_onhand: number;
  turnover_ratio: number | null;
}

export interface StockoutRiskRow {
  item_id: string | null;
  warehouse_id: string | null;
  sellable_qty: number | null;
  avg_daily_demand: number | null;
  days_of_cover: number | null;
  threshold_days: number | null;
  risk_flag: boolean | null;
  as_of_date: string | null;
}

export interface OverstockRow {
  item_id: string;
  warehouse_id: string;
  item_type: string | null;
  onhand_qty: number;
  avg_daily_demand: number | null;
  days_on_hand: number | null;
  doh_threshold: number | null;
  overstock_flag: boolean;
  overstock_qty: number;
  as_of_date: string | null;
}

export interface ExpiryRiskRow {
  item_id: string;
  warehouse_id: string;
  lot_id: string;
  onhand_qty: number;
  final_expiry_date: string | null;
  days_to_expiry: number | null;
  expiry_bucket: string;
  risk_value_krw: number | null;
  as_of_date: string | null;
}

export interface FefoPickListRow {
  warehouse_id: string;
  item_id: string;
  lot_id: string;
  onhand_qty: number;
  sellable_qty: number;
  final_expiry_date: string | null;
  fefo_rank: number;
  snapshot_date: string;
}

export interface OpenPORow {
  po_id: string | null;
  item_id: string | null;
  supplier_id: string | null;
  po_date: string | null;
  eta_date: string | null;
  first_receipt_date: string | null;
  qty_ordered: number | null;
  qty_received: number | null;
  qty_open: number | null;
  delay_days: number | null;
  po_lead_days: number | null;
  eta_vs_actual_days: number | null;
  period: string | null;
}

export interface LeadTimeRow {
  period: string;
  supplier_id: string;
  item_id: string;
  total_count: number;
  avg_lead_days: number | null;
  min_lead_days: number | null;
  max_lead_days: number | null;
  q1_lead_days: number | null;
  median_lead_days: number | null;
  q3_lead_days: number | null;
  avg_eta_vs_actual: number | null;
  late_po_ratio: number | null;
  avg_delay_days: number | null;
}

export interface SupplierPerformanceRow {
  supplier_id: string;
  total_count: number;
  late_po_ratio: number | null;
  avg_delay_days: number | null;
}

export interface ServiceLevelRow {
  week_start: string;
  channel_store_id: string;
  total_orders: number;
  shipped_on_time: number;
  service_level_pct: number;
}

export interface ShipmentDailyRow {
  ship_date: string;
  warehouse_id: string;
  shipment_count: number;
  qty_shipped: number;
  weight: number | null;
  volume_cbm: number | null;
  unique_orders: number | null;
  unique_items: number | null;
}

export interface ReturnAnalysisRow {
  period: string;
  item_id: string;
  warehouse_id: string;
  channel_store_id: string | null;
  reason: string | null;
  disposition: string | null;
  return_count: number;
  qty_returned: number;
  qty_shipped: number | null;
  return_rate: number | null;
}

export interface RecoInventoryMovementRow {
  snapshot_date: string;
  warehouse_id: string;
  item_id: string;
  prev_onhand: number;
  receipts: number;
  shipments: number;
  returns: number;
  adjustments: number;
  expected_onhand: number;
  actual_onhand: number;
  delta: number;
  delta_ratio: number | null;
  severity: string;
}

export interface RecoOmsVsWmsRow {
  period: string;
  item_id: string;
  channel_store_id: string;
  oms_qty_ordered: number;
  wms_qty_shipped: number;
  delta: number;
  fulfillment_rate: number | null;
}

export interface RecoErpVsWmsRow {
  period: string;
  item_id: string;
  po_id: string;
  erp_qty: number;
  wms_qty: number;
  delta: number;
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

export interface ConstraintSignalRow {
  signal_id: string;
  domain: string;
  metric_name: string;
  current_value: number;
  threshold_value: number;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  period: string;
  detected_at: string | null;
}

export interface CoveragePeriodRow {
  period: string;
  domain: string;
  coverage_rate: number;
  included_rows: number;
  missing_rows: number;
  severity: string;
  is_closed_period: boolean;
}

export interface ForecastAccuracyRow {
  period: string;
  item_id: string;
  warehouse_id: string | null;
  forecast_method: string;
  actual_qty: number | null;
  forecast_qty: number | null;
  error_qty: number | null;
  abs_error: number | null;
  mape: number | null;
  bias: number | null;
  accuracy_pct: number | null;
}

export interface DemandPlanRow {
  item_id: string;
  warehouse_id: string | null;
  plan_date: string;
  forecast_30d: number | null;
  forecast_60d: number | null;
  forecast_90d: number | null;
  safety_stock_qty: number | null;
  reorder_point: number | null;
  confidence_level: number | null;
  forecast_method: string | null;
}

export interface ReplenishmentPlanRow {
  item_id: string;
  warehouse_id: string | null;
  plan_date: string;
  current_stock: number | null;
  reorder_point: number | null;
  safety_stock: number | null;
  recommended_order_qty: number | null;
  urgency: string | null;
  forecast_method: string | null;
}

export interface LeadTimePredictionRow {
  period: string;
  supplier_id: string;
  item_id: string | null;
  actual_lead_days_avg: number | null;
  actual_lead_days_p50: number | null;
  actual_lead_days_p90: number | null;
  predicted_lead_days_avg: number | null;
  prediction_error_days: number | null;
  late_po_ratio: number | null;
  total_po_count: number | null;
}
