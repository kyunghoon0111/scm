import type { TimeGrain } from "../store/filterStore";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function timeGrainLabel(timeGrain: TimeGrain) {
  switch (timeGrain) {
    case "day":
      return "일";
    case "week":
      return "주";
    case "month":
      return "월";
    case "year":
      return "년";
    default:
      return "월";
  }
}

export function bucketDate(dateText: string | null | undefined, timeGrain: TimeGrain): string {
  if (!dateText) return "-";
  const normalized = dateText.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;

  if (timeGrain === "day") return normalized;
  if (timeGrain === "month") return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  if (timeGrain === "year") return String(date.getFullYear());

  const firstDay = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.floor((diffDays + firstDay.getDay()) / 7) + 1;
  return `${date.getFullYear()}-W${pad(week)}`;
}

export function bucketPeriod(period: string | null | undefined, timeGrain: TimeGrain): string {
  if (!period) return "-";
  if (timeGrain === "year") return period.slice(0, 4);
  return period;
}
