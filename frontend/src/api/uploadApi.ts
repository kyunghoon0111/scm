import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fromOps } from "../lib/supabase";

export interface ColumnMapping {
  id?: number;
  source_name: string;
  canonical_name: string;
  table_name: string | null;
  created_by?: string;
  created_at?: string;
}

export interface UploadDatasetSchema {
  raw_table_name: string;
  core_table_name: string;
  label: string;
  description: string;
  primary_key: string[];
  required: string[];
  optional: string[];
}

export interface FileParseResult {
  file: File;
  headers: string[];
  previewRows: Record<string, string>[];
  detectedTable: string | null;
  detectedScore: number;
  mappedColumns: Record<string, string>;
  unmappedColumns: string[];
}

export interface DirectInsertResult {
  tableName: string;
  fileName: string;
  insertedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface UploadResult {
  results: DirectInsertResult[];
  totalInserted: number;
  totalSkipped: number;
  hasErrors: boolean;
}

export interface PreparedUploadPayload {
  tableName: string;
  fileName: string;
  rows: Record<string, unknown>[];
  skippedCount: number;
  errors: string[];
}

export const UPLOAD_DATASETS: UploadDatasetSchema[] = [
  {
    raw_table_name: "upload_inventory_snapshot",
    core_table_name: "fact_inventory_snapshot",
    label: "재고 스냅샷",
    description: "현재고, 판매가능재고, 재고 상태와 보유 주체 정보를 받습니다.",
    primary_key: ["snapshot_date", "warehouse_id", "item_id"],
    required: ["snapshot_date", "warehouse_id", "item_id", "onhand_qty"],
    optional: [
      "lot_id",
      "sellable_qty",
      "blocked_qty",
      "expiry_date",
      "mfg_date",
      "qc_status",
      "hold_flag",
      "owner_id",
      "inventory_status",
      "channel_store_id",
      "reserved_qty",
      "damaged_qty",
      "in_transit_qty",
      "safety_stock_qty",
      "unit_cost",
      "country",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_purchase_order",
    core_table_name: "fact_po",
    label: "발주",
    description: "발주 기본 정보와 예상 입고, 리드타임 보조 컬럼을 받습니다.",
    primary_key: ["po_id", "item_id"],
    required: ["po_id", "po_date", "supplier_id", "item_id", "qty_ordered"],
    optional: [
      "po_line_id",
      "warehouse_id",
      "eta_date",
      "unit_price",
      "currency",
      "incoterms",
      "country",
      "expected_lead_time_days",
      "order_status",
      "buyer_id",
      "moq_qty",
      "pack_size",
      "tax_amount",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_receipt",
    core_table_name: "fact_receipt",
    label: "입고",
    description: "실제 입고와 검사, 부족/초과 입고 정보를 받습니다.",
    primary_key: ["receipt_id", "item_id"],
    required: ["receipt_id", "receipt_date", "warehouse_id", "item_id", "qty_received"],
    optional: [
      "receipt_line_id",
      "po_id",
      "po_line_id",
      "lot_id",
      "expiry_date",
      "mfg_date",
      "qc_status",
      "putaway_completed_at",
      "inspection_result",
      "damaged_qty",
      "short_received_qty",
      "excess_received_qty",
      "carrier_id",
      "dock_id",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_shipment",
    core_table_name: "fact_shipment",
    label: "출고",
    description: "출고 이력과 주문 연결, 배송 품질 정보를 받습니다.",
    primary_key: ["shipment_id", "item_id"],
    required: ["shipment_id", "ship_date", "warehouse_id", "item_id", "qty_shipped"],
    optional: [
      "shipment_line_id",
      "lot_id",
      "weight",
      "volume_cbm",
      "channel_order_id",
      "channel_store_id",
      "order_id",
      "order_line_id",
      "country",
      "carrier_id",
      "tracking_no",
      "shipping_fee",
      "promised_ship_date",
      "delivered_at",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_return",
    core_table_name: "fact_return",
    label: "반품",
    description: "반품 수량, 사유, 환불과 재판매 가능 여부를 받습니다.",
    primary_key: ["return_id", "item_id"],
    required: ["return_id", "return_date", "warehouse_id", "item_id", "qty_returned"],
    optional: [
      "return_line_id",
      "lot_id",
      "channel_order_id",
      "channel_store_id",
      "order_id",
      "order_line_id",
      "reason",
      "disposition",
      "refund_amount",
      "return_shipping_fee",
      "return_reason_code",
      "return_quality_grade",
      "resellable_flag",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_sales",
    core_table_name: "fact_settlement",
    label: "매출 / 정산",
    description: "매출총액, 할인, 환불, 수수료와 주문 연결 정보를 받습니다.",
    primary_key: ["settlement_id", "line_no"],
    required: ["settlement_id", "line_no", "period", "channel_store_id", "currency", "gross_sales"],
    optional: [
      "item_id",
      "order_id",
      "order_line_id",
      "order_date",
      "ship_date",
      "country",
      "quantity_sold",
      "unit_selling_price",
      "discounts",
      "fees",
      "refunds",
      "net_payout",
      "tax_amount",
      "promo_cost",
      "platform_fee",
      "payment_fee",
      "coupon_amount",
      "sales_channel_group",
      "source_updated_at",
      "source_system",
    ],
  },
  {
    raw_table_name: "upload_charge",
    core_table_name: "fact_charge_actual",
    label: "비용",
    description: "운송비, 3PL, 플랫폼 청구 등 실제 비용 라인을 받습니다.",
    primary_key: ["invoice_no", "invoice_line_no", "charge_type"],
    required: ["invoice_no", "invoice_line_no", "charge_type", "amount", "currency", "period"],
    optional: [
      "invoice_date",
      "vendor_partner_id",
      "supplier_id",
      "charge_basis",
      "reference_type",
      "reference_id",
      "charge_category",
      "cost_center",
      "channel_store_id",
      "item_id",
      "warehouse_id",
      "country",
      "allocation_key",
      "allocation_basis_value",
      "tax_amount",
      "invoice_status",
      "reference_period",
      "accrual_flag",
      "source_updated_at",
      "source_system",
    ],
  },
];

export const TABLE_LABELS: Record<string, string> = Object.fromEntries(
  UPLOAD_DATASETS.flatMap((dataset) => [
    [dataset.raw_table_name, dataset.label],
    [dataset.core_table_name, dataset.label],
  ]),
);

export const COLUMN_LABELS: Record<string, string> = {
  snapshot_date: "기준일",
  warehouse_id: "창고",
  item_id: "상품코드",
  lot_id: "LOT",
  onhand_qty: "현재고",
  sellable_qty: "판매가능재고",
  blocked_qty: "보류재고",
  expiry_date: "유통기한",
  mfg_date: "제조일",
  qc_status: "검수상태",
  hold_flag: "홀드 여부",
  owner_id: "재고 소유주",
  inventory_status: "재고 상태",
  channel_store_id: "채널 / 스토어",
  reserved_qty: "예약재고",
  damaged_qty: "손상수량",
  in_transit_qty: "이동중 재고",
  safety_stock_qty: "안전재고",
  unit_cost: "단위원가",
  country: "국가",
  source_updated_at: "원천 수정시각",
  source_system: "원천 시스템",
  po_id: "발주번호",
  po_line_id: "발주 라인",
  po_date: "발주일",
  supplier_id: "공급처",
  qty_ordered: "발주수량",
  eta_date: "예정입고일",
  unit_price: "단가",
  currency: "통화",
  incoterms: "인코텀즈",
  expected_lead_time_days: "예상 리드타임(일)",
  order_status: "상태",
  buyer_id: "구매담당자",
  moq_qty: "최소발주수량",
  pack_size: "포장단위",
  tax_amount: "세금",
  receipt_id: "입고번호",
  receipt_line_id: "입고 라인",
  receipt_date: "입고일",
  qty_received: "입고수량",
  putaway_completed_at: "적치완료시각",
  inspection_result: "검사결과",
  short_received_qty: "부족입고수량",
  excess_received_qty: "초과입고수량",
  carrier_id: "운송사",
  dock_id: "도크",
  shipment_id: "출고번호",
  shipment_line_id: "출고 라인",
  ship_date: "출고일",
  qty_shipped: "출고수량",
  weight: "중량",
  volume_cbm: "CBM",
  channel_order_id: "채널 주문번호",
  order_id: "주문번호",
  order_line_id: "주문 라인",
  tracking_no: "송장번호",
  shipping_fee: "배송비",
  promised_ship_date: "약속출고일",
  delivered_at: "배송완료시각",
  return_id: "반품번호",
  return_line_id: "반품 라인",
  return_date: "반품일",
  qty_returned: "반품수량",
  reason: "사유",
  disposition: "처리구분",
  refund_amount: "환불금액",
  return_shipping_fee: "반품배송비",
  return_reason_code: "반품사유코드",
  return_quality_grade: "반품품질등급",
  resellable_flag: "재판매 가능",
  settlement_id: "정산번호",
  line_no: "라인번호",
  period: "기준월",
  gross_sales: "매출총액",
  discounts: "할인",
  fees: "수수료",
  refunds: "환불",
  net_payout: "실수령액",
  order_date: "주문일",
  quantity_sold: "판매수량",
  unit_selling_price: "판매단가",
  promo_cost: "판촉비",
  platform_fee: "플랫폼수수료",
  payment_fee: "결제수수료",
  coupon_amount: "쿠폰금액",
  sales_channel_group: "채널그룹",
  invoice_no: "청구번호",
  invoice_line_no: "청구 라인",
  charge_type: "비용유형",
  amount: "금액",
  invoice_date: "청구일",
  vendor_partner_id: "거래처",
  charge_basis: "배부기준",
  reference_type: "참조유형",
  reference_id: "참조ID",
  charge_category: "비용카테고리",
  cost_center: "코스트센터",
  allocation_key: "배부키",
  allocation_basis_value: "배부기준값",
  invoice_status: "청구상태",
  reference_period: "참조기준월",
  accrual_flag: "발생주의 여부",
};

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  snapshot_date: "YYYY-MM-DD 형식의 재고 기준일",
  period: "YYYY-MM 형식의 기준월",
  source_updated_at: "원천 시스템 수정 시각(ISO 8601 권장)",
  source_system: "업로드 원천 시스템명",
  item_id: "상품 식별 코드",
  warehouse_id: "창고 식별 코드",
  country: "국가 코드 또는 국가명",
  channel_store_id: "판매 채널 또는 스토어 코드",
  onhand_qty: "현재고 수량",
  reserved_qty: "예약으로 묶인 수량",
  damaged_qty: "손상 또는 폐기 예정 수량",
  in_transit_qty: "이동중 재고 수량",
  safety_stock_qty: "안전재고 기준 수량",
  unit_cost: "상품 단위 원가",
  qty_ordered: "발주 수량",
  qty_received: "실제 입고 수량",
  qty_shipped: "실제 출고 수량",
  qty_returned: "실제 반품 수량",
  gross_sales: "할인, 환불 차감 전 매출총액",
  quantity_sold: "판매 수량",
  unit_selling_price: "실판매 단가",
  amount: "비용 금액",
  tax_amount: "세금 금액",
  platform_fee: "플랫폼 수수료",
  payment_fee: "결제 수수료",
  shipping_fee: "배송비",
  refund_amount: "환불 금액",
  allocation_basis_value: "배부 비율 계산에 쓰는 값",
  hold_flag: "true/false 또는 Y/N",
  resellable_flag: "재판매 가능 여부",
  accrual_flag: "발생주의 비용 여부",
};

const BUILTIN_ALIASES: Record<string, string[]> = {
  snapshot_date: ["snapshot_date", "기준일", "재고일", "as_of_date"],
  warehouse_id: ["warehouse_id", "창고", "창고코드", "wh_id"],
  item_id: ["item_id", "sku", "상품코드", "item_code", "sku_id"],
  lot_id: ["lot_id", "lot", "lot_no", "로트"],
  onhand_qty: ["onhand_qty", "현재고", "재고수량", "stock_qty"],
  sellable_qty: ["sellable_qty", "판매가능재고", "가용재고"],
  blocked_qty: ["blocked_qty", "보류재고", "차단재고"],
  expiry_date: ["expiry_date", "유통기한", "만료일"],
  mfg_date: ["mfg_date", "제조일", "생산일"],
  qc_status: ["qc_status", "검수상태", "qc"],
  hold_flag: ["hold_flag", "홀드여부", "hold"],
  owner_id: ["owner_id", "재고소유주", "owner"],
  inventory_status: ["inventory_status", "재고상태", "stock_status"],
  channel_store_id: ["channel_store_id", "채널", "스토어", "store_id"],
  reserved_qty: ["reserved_qty", "예약재고", "allocated_qty"],
  damaged_qty: ["damaged_qty", "손상수량", "damage_qty"],
  in_transit_qty: ["in_transit_qty", "이동중재고", "transit_qty"],
  safety_stock_qty: ["safety_stock_qty", "안전재고", "safety_stock"],
  unit_cost: ["unit_cost", "단위원가", "cost_per_unit"],
  country: ["country", "국가", "country_code"],
  source_updated_at: ["source_updated_at", "원천수정시각", "updated_at"],
  source_system: ["source_system", "원천시스템", "system"],
  po_id: ["po_id", "발주번호", "po_no"],
  po_line_id: ["po_line_id", "발주라인", "po_line_no"],
  po_date: ["po_date", "발주일", "발주일자"],
  supplier_id: ["supplier_id", "공급처", "거래처", "vendor_id"],
  qty_ordered: ["qty_ordered", "발주수량", "order_qty"],
  eta_date: ["eta_date", "예정입고일", "eta"],
  unit_price: ["unit_price", "단가", "price"],
  currency: ["currency", "통화", "ccy"],
  incoterms: ["incoterms", "인코텀즈", "trade_terms"],
  expected_lead_time_days: ["expected_lead_time_days", "예상리드타임", "lead_time_days"],
  order_status: ["order_status", "상태", "status"],
  buyer_id: ["buyer_id", "구매담당자", "buyer"],
  moq_qty: ["moq_qty", "최소발주수량", "moq"],
  pack_size: ["pack_size", "포장단위", "case_pack"],
  tax_amount: ["tax_amount", "세금", "vat_amount"],
  receipt_id: ["receipt_id", "입고번호", "receipt_no"],
  receipt_line_id: ["receipt_line_id", "입고라인", "receipt_line_no"],
  receipt_date: ["receipt_date", "입고일", "입고일자"],
  qty_received: ["qty_received", "입고수량", "receive_qty"],
  putaway_completed_at: ["putaway_completed_at", "적치완료시각", "putaway_at"],
  inspection_result: ["inspection_result", "검사결과", "inspection_status"],
  short_received_qty: ["short_received_qty", "부족입고수량", "short_qty"],
  excess_received_qty: ["excess_received_qty", "초과입고수량", "excess_qty"],
  carrier_id: ["carrier_id", "운송사", "carrier"],
  dock_id: ["dock_id", "도크", "dock"],
  shipment_id: ["shipment_id", "출고번호", "shipment_no"],
  shipment_line_id: ["shipment_line_id", "출고라인", "shipment_line_no"],
  ship_date: ["ship_date", "출고일", "출고일자"],
  qty_shipped: ["qty_shipped", "출고수량", "ship_qty"],
  weight: ["weight", "중량", "weight_kg"],
  volume_cbm: ["volume_cbm", "cbm", "부피"],
  channel_order_id: ["channel_order_id", "채널주문번호", "channel_order_no"],
  order_id: ["order_id", "주문번호", "order_no"],
  order_line_id: ["order_line_id", "주문라인", "order_line_no"],
  tracking_no: ["tracking_no", "송장번호", "tracking_number"],
  shipping_fee: ["shipping_fee", "배송비", "freight_cost"],
  promised_ship_date: ["promised_ship_date", "약속출고일", "promised_date"],
  delivered_at: ["delivered_at", "배송완료시각", "delivery_completed_at"],
  return_id: ["return_id", "반품번호", "return_no"],
  return_line_id: ["return_line_id", "반품라인", "return_line_no"],
  return_date: ["return_date", "반품일", "반품일자"],
  qty_returned: ["qty_returned", "반품수량", "return_qty"],
  reason: ["reason", "사유", "반품사유"],
  disposition: ["disposition", "처리구분", "처리방법"],
  refund_amount: ["refund_amount", "환불금액", "refund_value"],
  return_shipping_fee: ["return_shipping_fee", "반품배송비", "return_fee"],
  return_reason_code: ["return_reason_code", "반품사유코드", "reason_code"],
  return_quality_grade: ["return_quality_grade", "반품품질등급", "quality_grade"],
  resellable_flag: ["resellable_flag", "재판매가능", "resellable"],
  settlement_id: ["settlement_id", "정산번호", "settlement_no"],
  line_no: ["line_no", "라인번호", "line_number"],
  period: ["period", "기준월", "정산월", "yyyymm", "year_month"],
  gross_sales: ["gross_sales", "매출총액", "gross_amount"],
  discounts: ["discounts", "할인", "discount"],
  fees: ["fees", "수수료", "fee"],
  refunds: ["refunds", "환불", "refund"],
  net_payout: ["net_payout", "실수령액", "정산금액"],
  order_date: ["order_date", "주문일", "주문일자"],
  quantity_sold: ["quantity_sold", "판매수량", "sold_qty"],
  unit_selling_price: ["unit_selling_price", "판매단가", "selling_price"],
  promo_cost: ["promo_cost", "판촉비", "promotion_cost"],
  platform_fee: ["platform_fee", "플랫폼수수료", "marketplace_fee"],
  payment_fee: ["payment_fee", "결제수수료", "pg_fee"],
  coupon_amount: ["coupon_amount", "쿠폰금액", "coupon_cost"],
  sales_channel_group: ["sales_channel_group", "채널그룹", "channel_group"],
  invoice_no: ["invoice_no", "청구번호", "bill_no"],
  invoice_line_no: ["invoice_line_no", "청구라인", "bill_line_no"],
  charge_type: ["charge_type", "비용유형", "charge"],
  amount: ["amount", "금액", "비용금액"],
  invoice_date: ["invoice_date", "청구일", "bill_date"],
  vendor_partner_id: ["vendor_partner_id", "거래처", "vendor_id"],
  charge_basis: ["charge_basis", "배부기준", "allocation_basis"],
  reference_type: ["reference_type", "참조유형", "ref_type"],
  reference_id: ["reference_id", "참조id", "ref_id"],
  charge_category: ["charge_category", "비용카테고리", "cost_category"],
  cost_center: ["cost_center", "코스트센터", "costcentre"],
  allocation_key: ["allocation_key", "배부키", "allocation_key"],
  allocation_basis_value: ["allocation_basis_value", "배부기준값", "basis_value"],
  invoice_status: ["invoice_status", "청구상태", "bill_status"],
  reference_period: ["reference_period", "참조기준월", "ref_period"],
  accrual_flag: ["accrual_flag", "발생주의여부", "accrual"],
};

function getDataset(tableName: string) {
  return UPLOAD_DATASETS.find(
    (dataset) => dataset.raw_table_name === tableName || dataset.core_table_name === tableName,
  );
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function getColumnLabel(column: string) {
  return COLUMN_LABELS[column] ? `${column} (${COLUMN_LABELS[column]})` : column;
}

export function downloadTemplate(tableName: string) {
  const dataset = getDataset(tableName);
  if (!dataset) return;

  const headers = [
    ...dataset.primary_key,
    ...dataset.required.filter((column) => !dataset.primary_key.includes(column)),
    ...dataset.optional,
  ];
  const headerRow = headers.map(escapeCsv).join(",");
  const labelRow = headers
    .map((header) => {
      const isPrimary = dataset.primary_key.includes(header);
      const isRequired = dataset.required.includes(header);
      const prefix = isPrimary ? "[PK/필수]" : isRequired ? "[필수]" : "[선택]";
      return escapeCsv(`${prefix} ${COLUMN_LABELS[header] ?? header}`);
    })
    .join(",");
  const descriptionRow = headers.map((header) => escapeCsv(COLUMN_DESCRIPTIONS[header] ?? "")).join(",");
  const csvContent = `\uFEFF${headerRow}\n${labelRow}\n${descriptionRow}\n`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${dataset.raw_table_name}_template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fetchColumnMappings(): Promise<ColumnMapping[]> {
  const { data, error } = await fromOps("column_mappings").select("*").order("source_name");
  if (error) {
    return [];
  }
  return data ?? [];
}

async function saveColumnMappings(mappings: ColumnMapping[]) {
  const { error } = await fromOps("column_mappings").upsert(
    mappings.map((mapping) => ({
      source_name: mapping.source_name,
      canonical_name: mapping.canonical_name,
      table_name: mapping.table_name,
    })),
    { onConflict: "source_name,table_name" },
  );
  if (error) throw error;
}

export function useColumnMappings() {
  return useQuery({
    queryKey: ["upload", "column-mappings"],
    queryFn: fetchColumnMappings,
    staleTime: 60_000,
  });
}

export function useSaveColumnMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveColumnMappings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upload", "column-mappings"] }),
  });
}

export function buildAliasMapFromMappings(dbMappings: ColumnMapping[]) {
  const aliasMap = new Map<string, string>();

  Object.entries(BUILTIN_ALIASES).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => aliasMap.set(alias.toLowerCase(), canonical));
  });

  dbMappings.forEach((mapping) => {
    aliasMap.set(mapping.source_name.toLowerCase(), mapping.canonical_name);
  });

  return aliasMap;
}

export async function parsePreviewFile(file: File, aliasMap: Map<string, string>): Promise<FileParseResult> {
  const allRows = await parseFullFile(file);
  const previewRows = allRows.slice(0, 5);
  const headers = Object.keys(previewRows[0] ?? {});
  const detection = detectTable(headers, aliasMap);

  return {
    file,
    headers,
    previewRows,
    detectedTable: detection.table,
    detectedScore: detection.score,
    mappedColumns: detection.mappedColumns,
    unmappedColumns: detection.unmappedColumns,
  };
}

export function detectTable(headers: string[], aliasMap: Map<string, string>) {
  const mappedColumns: Record<string, string> = {};
  const unmappedColumns: string[] = [];

  headers.forEach((header) => {
    const canonical = aliasMap.get(header.toLowerCase().trim()) ?? null;
    if (canonical) {
      mappedColumns[header] = canonical;
    } else {
      unmappedColumns.push(header);
    }
  });

  const canonicalSet = new Set(Object.values(mappedColumns));
  let bestTable: string | null = null;
  let bestScore = 0;

  UPLOAD_DATASETS.forEach((dataset) => {
    const requiredColumns = [...new Set([...dataset.primary_key, ...dataset.required])];
    const matchedCount = requiredColumns.filter((column) => canonicalSet.has(column)).length;
    const score = requiredColumns.length > 0 ? matchedCount / requiredColumns.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTable = dataset.raw_table_name;
    }
  });

  return {
    table: bestScore >= 0.4 ? bestTable : null,
    score: bestScore,
    mappedColumns,
    unmappedColumns,
  };
}

export async function parseFullFile(file: File): Promise<Record<string, string>[]> {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (extension === ".csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    return parsed.data;
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
}

const NUMERIC_COLUMNS = new Set([
  "onhand_qty",
  "sellable_qty",
  "blocked_qty",
  "reserved_qty",
  "damaged_qty",
  "in_transit_qty",
  "safety_stock_qty",
  "unit_cost",
  "qty_ordered",
  "unit_price",
  "expected_lead_time_days",
  "moq_qty",
  "pack_size",
  "tax_amount",
  "qty_received",
  "short_received_qty",
  "excess_received_qty",
  "qty_shipped",
  "weight",
  "volume_cbm",
  "shipping_fee",
  "qty_returned",
  "refund_amount",
  "return_shipping_fee",
  "line_no",
  "gross_sales",
  "quantity_sold",
  "unit_selling_price",
  "discounts",
  "fees",
  "refunds",
  "net_payout",
  "promo_cost",
  "platform_fee",
  "payment_fee",
  "coupon_amount",
  "invoice_line_no",
  "amount",
  "allocation_basis_value",
]);

const BOOLEAN_COLUMNS = new Set(["hold_flag", "resellable_flag", "accrual_flag"]);

function parseValue(column: string, rawValue: string): unknown {
  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  if (NUMERIC_COLUMNS.has(column)) {
    const normalized = Number(value.replace(/,/g, ""));
    return Number.isNaN(normalized) ? null : normalized;
  }

  if (BOOLEAN_COLUMNS.has(column)) {
    return ["true", "1", "y", "yes"].includes(value.toLowerCase());
  }

  return value;
}

function normalizePeriod(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.replace(/\//g, "-").trim();
  if (/^\d{6}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}`;
  }
  return normalized;
}

function createUploadRow(
  rawRow: Record<string, string>,
  columnMapping: Record<string, string>,
  rowNumber: number,
  fileName: string,
  batchId: number,
  dataset: UploadDatasetSchema,
) {
  const allowedColumns = new Set([...dataset.primary_key, ...dataset.required, ...dataset.optional]);

  const row: Record<string, unknown> = {
    batch_id: batchId,
    source_file_name: fileName,
    source_row_no: rowNumber,
  };

  Object.entries(rawRow).forEach(([sourceColumn, value]) => {
    const canonical = columnMapping[sourceColumn] ?? sourceColumn;
    if (allowedColumns.has(canonical)) {
      row[canonical] = parseValue(canonical, value);
    }
  });

  row.source_system = row.source_system ?? "upload_ui";
  if ("period" in row) {
    row.period = normalizePeriod(row.period);
  }

  const missing = [...new Set([...dataset.primary_key, ...dataset.required])].filter(
    (column) => row[column] === null || row[column] === undefined || row[column] === "",
  );

  return { row, missing };
}

export async function prepareUploadPayload(fileResult: FileParseResult): Promise<PreparedUploadPayload> {
  if (!fileResult.detectedTable) {
    return {
      tableName: "unknown",
      fileName: fileResult.file.name,
      rows: [],
      skippedCount: 0,
      errors: ["업로드 대상 테이블을 판별하지 못했습니다. 헤더 매핑을 다시 확인해 주세요."],
    };
  }

  const dataset = getDataset(fileResult.detectedTable);
  if (!dataset) {
    throw new Error(`Unsupported upload table: ${fileResult.detectedTable}`);
  }

  const batchId = Date.now();
  const allRows = await parseFullFile(fileResult.file);
  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  allRows.forEach((rawRow, index) => {
    const { row, missing } = createUploadRow(
      rawRow,
      fileResult.mappedColumns,
      index + 2,
      fileResult.file.name,
      batchId,
      dataset,
    );
    if (missing.length > 0) {
      errors.push(`${index + 2}행: 필수 컬럼 누락 (${missing.join(", ")})`);
      return;
    }
    rows.push(row);
  });

  return {
    tableName: dataset.raw_table_name,
    fileName: fileResult.file.name,
    rows,
    skippedCount: allRows.length - rows.length,
    errors: errors.slice(0, 20),
  };
}
