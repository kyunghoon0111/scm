-- =============================================================
-- 13_phase2_upload_contracts.sql
-- Phase 2 optional column expansion for raw upload contracts
-- Keeps Phase 1 required columns intact and adds richer context
-- =============================================================

-- ----- raw.upload_inventory_snapshot -----
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS inventory_status TEXT;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS channel_store_id TEXT;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS reserved_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS damaged_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS in_transit_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS safety_stock_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE raw.upload_inventory_snapshot ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_purchase_order -----
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS po_line_id TEXT;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS warehouse_id TEXT;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS expected_lead_time_days DOUBLE PRECISION;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS order_status TEXT;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS buyer_id TEXT;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS moq_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS pack_size DOUBLE PRECISION;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION;
ALTER TABLE raw.upload_purchase_order ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_receipt -----
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS receipt_line_id TEXT;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS po_line_id TEXT;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS putaway_completed_at TIMESTAMP;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS inspection_result TEXT;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS damaged_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS short_received_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS excess_received_qty DOUBLE PRECISION;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS carrier_id TEXT;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS dock_id TEXT;
ALTER TABLE raw.upload_receipt ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_shipment -----
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS shipment_line_id TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS order_line_id TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS carrier_id TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS tracking_no TEXT;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS shipping_fee DOUBLE PRECISION;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS promised_ship_date DATE;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE raw.upload_shipment ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_return -----
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS return_line_id TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS channel_store_id TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS order_line_id TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS refund_amount DOUBLE PRECISION;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS return_shipping_fee DOUBLE PRECISION;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS return_reason_code TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS return_quality_grade TEXT;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS resellable_flag BOOLEAN;
ALTER TABLE raw.upload_return ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_sales -----
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS order_line_id TEXT;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS ship_date DATE;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS quantity_sold DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS unit_selling_price DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS promo_cost DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS platform_fee DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS payment_fee DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS coupon_amount DOUBLE PRECISION;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS sales_channel_group TEXT;
ALTER TABLE raw.upload_sales ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;

-- ----- raw.upload_charge -----
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS charge_category TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS allocation_key TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS allocation_basis_value DOUBLE PRECISION;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS invoice_status TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS reference_period TEXT;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS accrual_flag BOOLEAN;
ALTER TABLE raw.upload_charge ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMP;
