import type { ApiResponse } from "../types/common";

/** Supabase 쿼리 결과를 ApiResponse로 래핑하고 coverage_flag를 집계 */
export function wrap<T>(data: T[] | null, error: unknown): ApiResponse<T[]> {
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
      coverage_flag: coverageFlag as "ACTUAL" | "PARTIAL" | "NO_DATA",
      queried_at: new Date().toISOString(),
    },
    errors: [],
  };
}
