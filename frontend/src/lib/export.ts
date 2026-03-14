import * as XLSX from "xlsx";

/**
 * 테이블 데이터를 엑셀 파일로 다운로드한다.
 * - 한글 시트명, 날짜/숫자 서식 적용
 * - 빈 데이터일 때 안내 메시지 시트 생성
 */
export function exportToExcel(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = "데이터",
) {
  const wb = XLSX.utils.book_new();

  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["데이터가 없습니다."]]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비 자동 조정
    const colWidths = Object.keys(rows[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((row) => {
          const val = row[key];
          if (val === null || val === undefined) return 1;
          return String(val).length;
        }),
      );
      return { wch: Math.min(maxLen + 2, 30) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * 현재 필터 조건을 파일명 접미사로 변환한다.
 * 예: "재고현황_2026-01_2026-03_WH01"
 */
export function buildExportFileName(
  prefix: string,
  filters: {
    fromDate?: string;
    toDate?: string;
    warehouseId?: string | null;
    itemId?: string | null;
    channelStoreId?: string | null;
  },
): string {
  const parts = [prefix];

  if (filters.fromDate) parts.push(filters.fromDate);
  if (filters.toDate) parts.push(filters.toDate);
  if (filters.warehouseId) parts.push(filters.warehouseId);
  if (filters.itemId) parts.push(filters.itemId);
  if (filters.channelStoreId) parts.push(filters.channelStoreId);

  return parts.join("_");
}
