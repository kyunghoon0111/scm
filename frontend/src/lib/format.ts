/** 원화 금액 포맷 (1,234,567) */
export function fmtKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

/** 비율 포맷 (0.123 → "12.3%") */
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}
