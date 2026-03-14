import { timeGrainLabel } from "../../lib/timeGrain";
import { useFilterStore } from "../../store/filterStore";

function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();

  for (let index = 0; index < 24; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    options.push(`${year}-${month}`);
  }

  return options;
}

const PERIOD_OPTIONS = generatePeriodOptions();
const TIME_GRAINS = ["day", "week", "month", "year"] as const;

export default function GlobalFilter() {
  const {
    period,
    timeGrain,
    warehouseId,
    itemId,
    channelStoreId,
    setPeriod,
    setTimeGrain,
    setWarehouseId,
    setItemId,
    setChannelStoreId,
  } = useFilterStore();

  return (
    <div className="filter-shell mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[10rem] flex-1">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">기준월</label>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="filter-control w-full"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[8rem] sm:w-40">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">집계축</label>
        <select
          value={timeGrain}
          onChange={(event) => setTimeGrain(event.target.value as typeof timeGrain)}
          className="filter-control w-full"
        >
          {TIME_GRAINS.map((option) => (
            <option key={option} value={option}>
              {timeGrainLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[10rem] flex-1">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">창고</label>
        <input
          type="text"
          value={warehouseId ?? ""}
          onChange={(event) => setWarehouseId(event.target.value || null)}
          placeholder="전체"
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem] flex-1">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">상품</label>
        <input
          type="text"
          value={itemId ?? ""}
          onChange={(event) => setItemId(event.target.value || null)}
          placeholder="전체"
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem] flex-1">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">채널</label>
        <input
          type="text"
          value={channelStoreId ?? ""}
          onChange={(event) => setChannelStoreId(event.target.value || null)}
          placeholder="전체"
          className="filter-control w-full"
        />
      </div>
    </div>
  );
}
