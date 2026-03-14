export type CoverageFlag = "ACTUAL" | "PARTIAL" | "NO_DATA";

export type Role = "admin" | "scm" | "pnl" | "ops" | "readonly";

export interface ApiMeta {
  period?: string | null;
  row_count: number;
  coverage_flag?: CoverageFlag | null;
  queried_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta: ApiMeta;
  errors: string[];
}
