-- Phase 2 Session 1: Inventory Turnover mart table
CREATE TABLE IF NOT EXISTS mart.mart_inventory_turnover (
    period VARCHAR,
    item_id VARCHAR,
    warehouse_id VARCHAR,
    avg_inventory DOUBLE,
    cogs_or_shipment DOUBLE,
    turnover_ratio DOUBLE,
    days_on_hand DOUBLE
);

-- Grant read access for anonymous (demo mode)
GRANT SELECT ON mart.mart_inventory_turnover TO anon;
GRANT SELECT ON mart.mart_inventory_turnover TO authenticated;
