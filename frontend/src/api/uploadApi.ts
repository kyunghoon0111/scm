import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fromOps, fromRaw } from "../lib/supabase";

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

export const UPLOAD_DATASETS: UploadDatasetSchema[] = [
  {
    raw_table_name: "upload_inventory_snapshot",
    core_table_name: "fact_inventory_snapshot",
    label: "재고 스냅샷",
    description: "현재고, 판매가능재고, 유통기한 정보를 받습니다.",
    primary_key: ["snapshot_date", "warehouse_id", "item_id"],
    required: ["snapshot_date", "warehouse_id", "item_id", "onhand_qty"],
    optional: ["lot_id", "sellable_qty", "blocked_qty", "expiry_date", "mfg_date", "qc_status", "hold_flag", "source_system"],
  },
  {
    raw_table_name: "upload_purchase_order",
    core_table_name: "fact_po",
    label: "발주",
    description: "발주 기준 정보와 예정 입고일을 받습니다.",
    primary_key: ["po_id", "item_id"],
    required: ["po_id", "po_date", "supplier_id", "item_id", "qty_ordered"],
    optional: ["eta_date", "unit_price", "currency", "incoterms", "source_system"],
  },
  {
    raw_table_name: "upload_receipt",
    core_table_name: "fact_receipt",
    label: "입고",
    description: "실제 입고 건을 받아 발주 대비 적재를 계산합니다.",
    primary_key: ["receipt_id", "item_id"],
    required: ["receipt_id", "receipt_date", "warehouse_id", "item_id", "qty_received"],
    optional: ["po_id", "lot_id", "expiry_date", "mfg_date", "qc_status", "source_system"],
  },
  {
    raw_table_name: "upload_shipment",
    core_table_name: "fact_shipment",
    label: "출고",
    description: "일자별 출고량과 주문 연결용 데이터를 받습니다.",
    primary_key: ["shipment_id", "item_id"],
    required: ["shipment_id", "ship_date", "warehouse_id", "item_id", "qty_shipped"],
    optional: ["lot_id", "weight", "volume_cbm", "channel_order_id", "channel_store_id", "source_system"],
  },
  {
    raw_table_name: "upload_return",
    core_table_name: "fact_return",
    label: "반품",
    description: "반품 수량, 사유, 처리 구분을 받습니다.",
    primary_key: ["return_id", "item_id"],
    required: ["return_id", "return_date", "warehouse_id", "item_id", "qty_returned"],
    optional: ["lot_id", "channel_order_id", "reason", "disposition", "source_system"],
  },
  {
    raw_table_name: "upload_sales",
    core_table_name: "fact_settlement",
    label: "매출 / 정산",
    description: "매출과 차감 항목을 받아 손익 계산에 연결합니다.",
    primary_key: ["settlement_id", "line_no"],
    required: ["settlement_id", "line_no", "period", "channel_store_id", "currency", "gross_sales"],
    optional: ["item_id", "discounts", "fees", "refunds", "net_payout", "source_system"],
  },
  {
    raw_table_name: "upload_charge",
    core_table_name: "fact_charge_actual",
    label: "비용",
    description: "운송비, 3PL, 플랫폼 수수료 같은 비용 원본을 받습니다.",
    primary_key: ["invoice_no", "invoice_line_no", "charge_type"],
    required: ["invoice_no", "invoice_line_no", "charge_type", "amount", "currency", "period"],
    optional: ["invoice_date", "vendor_partner_id", "charge_basis", "reference_type", "reference_id", "channel_store_id", "warehouse_id", "country", "source_system"],
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
  onhand_qty: "현재고",
  sellable_qty: "판매가능재고",
  blocked_qty: "보류재고",
  lot_id: "로트",
  expiry_date: "유통기한",
  mfg_date: "제조일",
  qc_status: "검수상태",
  hold_flag: "보류여부",
  source_system: "원천시스템",
  po_id: "발주번호",
  po_date: "발주일",
  supplier_id: "공급처",
  qty_ordered: "발주수량",
  eta_date: "예정입고일",
  unit_price: "단가",
  currency: "통화",
  incoterms: "인코텀즈",
  receipt_id: "입고번호",
  receipt_date: "입고일",
  qty_received: "입고수량",
  shipment_id: "출고번호",
  ship_date: "출고일",
  qty_shipped: "출고수량",
  weight: "중량",
  volume_cbm: "부피",
  channel_order_id: "주문번호",
  channel_store_id: "채널",
  return_id: "반품번호",
  return_date: "반품일",
  qty_returned: "반품수량",
  reason: "사유",
  disposition: "처리구분",
  settlement_id: "정산번호",
  line_no: "라인번호",
  period: "기준월",
  gross_sales: "총매출",
  discounts: "할인",
  fees: "수수료",
  refunds: "환불",
  net_payout: "실수령액",
  invoice_no: "인보이스번호",
  invoice_line_no: "인보이스라인",
  charge_type: "비용유형",
  amount: "금액",
  invoice_date: "인보이스일",
  vendor_partner_id: "거래처",
  charge_basis: "배분기준",
  reference_type: "참조유형",
  reference_id: "참조ID",
  country: "국가",
};

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  snapshot_date: "YYYY-MM-DD 형식의 재고 기준일",
  period: "YYYY-MM 형식의 기준월",
  item_id: "상품 식별 코드",
  warehouse_id: "창고 식별 코드",
  channel_store_id: "판매 채널 또는 스토어 코드",
  supplier_id: "공급처 식별 코드",
  onhand_qty: "기준 시점 총 재고 수량",
  qty_ordered: "발주 기준 수량",
  qty_received: "실제 입고 수량",
  qty_shipped: "실제 출고 수량",
  qty_returned: "실제 반품 수량",
  gross_sales: "차감 전 총매출",
  amount: "원본 비용 금액",
};

const BUILTIN_ALIASES: Record<string, string[]> = {
  snapshot_date: ["snapshot_date", "기준일", "재고일", "as_of_date"],
  warehouse_id: ["warehouse_id", "창고", "창고코드", "wh_id"],
  item_id: ["item_id", "sku", "상품코드", "item_code", "sku_id"],
  onhand_qty: ["onhand_qty", "현재고", "재고수량", "stock_qty"],
  sellable_qty: ["sellable_qty", "판매가능재고", "가용재고"],
  blocked_qty: ["blocked_qty", "보류재고", "차단재고"],
  lot_id: ["lot_id", "lot", "로트", "배치번호"],
  expiry_date: ["expiry_date", "유통기한", "만료일"],
  mfg_date: ["mfg_date", "제조일", "생산일"],
  qc_status: ["qc_status", "검수상태", "qc"],
  hold_flag: ["hold_flag", "보류여부", "hold"],
  source_system: ["source_system", "원천시스템", "system"],
  po_id: ["po_id", "발주번호", "po_no"],
  po_date: ["po_date", "발주일", "발주일자"],
  supplier_id: ["supplier_id", "공급처", "거래처", "vendor_id"],
  qty_ordered: ["qty_ordered", "발주수량", "order_qty"],
  eta_date: ["eta_date", "예정입고일", "eta"],
  unit_price: ["unit_price", "단가", "price"],
  currency: ["currency", "통화", "ccy"],
  incoterms: ["incoterms", "인코텀즈", "trade_terms"],
  receipt_id: ["receipt_id", "입고번호", "receipt_no"],
  receipt_date: ["receipt_date", "입고일", "입고일자"],
  qty_received: ["qty_received", "입고수량", "receive_qty"],
  shipment_id: ["shipment_id", "출고번호", "shipment_no"],
  ship_date: ["ship_date", "출고일", "출고일자"],
  qty_shipped: ["qty_shipped", "출고수량", "ship_qty"],
  weight: ["weight", "중량", "weight_kg"],
  volume_cbm: ["volume_cbm", "cbm", "부피"],
  channel_order_id: ["channel_order_id", "주문번호", "order_id"],
  channel_store_id: ["channel_store_id", "채널", "스토어", "store_id"],
  return_id: ["return_id", "반품번호", "return_no"],
  return_date: ["return_date", "반품일", "반품일자"],
  qty_returned: ["qty_returned", "반품수량", "return_qty"],
  reason: ["reason", "사유", "반품사유"],
  disposition: ["disposition", "처리구분", "처리방법"],
  settlement_id: ["settlement_id", "정산번호", "settlement_no"],
  line_no: ["line_no", "라인번호", "line_number"],
  period: ["period", "기준월", "정산월", "yyyymm", "year_month"],
  gross_sales: ["gross_sales", "총매출", "gross_amount"],
  discounts: ["discounts", "할인", "discount"],
  fees: ["fees", "수수료", "fee"],
  refunds: ["refunds", "환불", "refund"],
  net_payout: ["net_payout", "실수령액", "정산금액"],
  invoice_no: ["invoice_no", "인보이스번호", "bill_no"],
  invoice_line_no: ["invoice_line_no", "인보이스라인", "bill_line_no"],
  charge_type: ["charge_type", "비용유형", "charge"],
  amount: ["amount", "금액", "비용금액"],
  invoice_date: ["invoice_date", "인보이스일", "청구일"],
  vendor_partner_id: ["vendor_partner_id", "거래처", "vendor_id"],
  charge_basis: ["charge_basis", "배분기준", "allocation_basis"],
  reference_type: ["reference_type", "참조유형", "ref_type"],
  reference_id: ["reference_id", "참조id", "ref_id"],
  country: ["country", "국가", "country_code"],
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

  const headers = [...dataset.primary_key, ...dataset.required.filter((column) => !dataset.primary_key.includes(column)), ...dataset.optional];
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
  "qty_ordered",
  "qty_received",
  "qty_shipped",
  "qty_returned",
  "unit_price",
  "weight",
  "volume_cbm",
  "line_no",
  "gross_sales",
  "discounts",
  "fees",
  "refunds",
  "net_payout",
  "invoice_line_no",
  "amount",
]);

const BOOLEAN_COLUMNS = new Set(["hold_flag"]);

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
  const allowedColumns = new Set([
    ...dataset.primary_key,
    ...dataset.required,
    ...dataset.optional,
  ]);

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

  const missing = [...new Set([...dataset.primary_key, ...dataset.required])]
    .filter((column) => row[column] === null || row[column] === undefined || row[column] === "");

  return { row, missing };
}

async function insertDataDirectly(
  allRows: Record<string, string>[],
  columnMapping: Record<string, string>,
  tableName: string,
  fileName: string,
): Promise<DirectInsertResult> {
  const dataset = getDataset(tableName);
  if (!dataset) {
    throw new Error(`알 수 없는 업로드 대상입니다: ${tableName}`);
  }

  const batchId = Date.now();
  const validRows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  allRows.forEach((rawRow, index) => {
    const { row, missing } = createUploadRow(rawRow, columnMapping, index + 2, fileName, batchId, dataset);
    if (missing.length > 0) {
      errors.push(`${index + 2}행: 필수 컬럼 누락 (${missing.join(", ")})`);
      return;
    }
    validRows.push(row);
  });

  if (validRows.length === 0) {
    return {
      tableName: dataset.raw_table_name,
      fileName,
      insertedCount: 0,
      skippedCount: allRows.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : ["적재 가능한 행이 없습니다."],
    };
  }

  const BATCH_SIZE = 500;
  let insertedCount = 0;

  for (let index = 0; index < validRows.length; index += BATCH_SIZE) {
    const batch = validRows.slice(index, index + BATCH_SIZE);
    const { error } = await fromRaw(dataset.raw_table_name).insert(batch);
    if (error) {
      errors.push(`DB 적재 오류 (${index + 1}~${index + batch.length}행): ${error.message}`);
    } else {
      insertedCount += batch.length;
    }
  }

  return {
    tableName: dataset.raw_table_name,
    fileName,
    insertedCount,
    skippedCount: allRows.length - validRows.length,
    errors: errors.slice(0, 20),
  };
}

export function useDirectUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileResults }: { fileResults: FileParseResult[] }): Promise<UploadResult> => {
      const results: DirectInsertResult[] = [];

      for (const fileResult of fileResults) {
        if (!fileResult.detectedTable) {
          results.push({
            tableName: "unknown",
            fileName: fileResult.file.name,
            insertedCount: 0,
            skippedCount: 0,
            errors: ["데이터셋 유형을 자동으로 판별하지 못했습니다."],
          });
          continue;
        }

        const rows = await parseFullFile(fileResult.file);
        const result = await insertDataDirectly(
          rows,
          fileResult.mappedColumns,
          fileResult.detectedTable,
          fileResult.file.name,
        );
        results.push(result);
      }

      return {
        totalInserted: results.reduce((sum, result) => sum + result.insertedCount, 0),
        totalSkipped: results.reduce((sum, result) => sum + result.skippedCount, 0),
        hasErrors: results.some((result) => result.errors.length > 0),
        results,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload"] });
      queryClient.invalidateQueries({ queryKey: ["scm"] });
      queryClient.invalidateQueries({ queryKey: ["pnl"] });
    },
  });
}
