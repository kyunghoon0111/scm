import { create } from "zustand";
import { recommendTimeGrain } from "../lib/timeGrain";

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export type TimeGrain = "day" | "week" | "month" | "year";

interface FilterState {
  fromDate: string;
  toDate: string;
  groupBy: TimeGrain;
  period: string;
  timeGrain: TimeGrain;
  warehouseId: string | null;
  itemId: string | null;
  channelStoreId: string | null;
  snapshotDate: string | null;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  setGroupBy: (value: TimeGrain) => void;
  setPeriod: (period: string) => void;
  setTimeGrain: (timeGrain: TimeGrain) => void;
  setWarehouseId: (id: string | null) => void;
  setItemId: (id: string | null) => void;
  setChannelStoreId: (id: string | null) => void;
  setSnapshotDate: (date: string | null) => void;
}

function syncPeriod(fromDate: string, toDate: string) {
  return {
    period: toDate.slice(0, 7),
    groupBy: recommendTimeGrain(fromDate, toDate),
    timeGrain: recommendTimeGrain(fromDate, toDate),
  };
}

const initialFromDate = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const initialToDate = formatDate(new Date());
const initialGrain = recommendTimeGrain(initialFromDate, initialToDate);

export const useFilterStore = create<FilterState>((set) => ({
  fromDate: initialFromDate,
  toDate: initialToDate,
  groupBy: initialGrain,
  period: getCurrentPeriod(),
  timeGrain: initialGrain,
  warehouseId: null,
  itemId: null,
  channelStoreId: null,
  snapshotDate: null,
  setFromDate: (fromDate) =>
    set((state) => ({
      fromDate,
      ...syncPeriod(fromDate, state.toDate),
    })),
  setToDate: (toDate) =>
    set((state) => ({
      toDate,
      ...syncPeriod(state.fromDate, toDate),
    })),
  setGroupBy: (groupBy) => set({ groupBy, timeGrain: groupBy }),
  setPeriod: (period) =>
    set(() => {
      const [yearText, monthText] = period.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      if (!year || !month) return { period };
      const start = `${yearText}-${monthText}-01`;
      const end = formatDate(new Date(year, month, 0));
      return {
        period,
        fromDate: start,
        toDate: end,
        groupBy: "month",
        timeGrain: "month",
      };
    }),
  setTimeGrain: (timeGrain) => set({ timeGrain, groupBy: timeGrain }),
  setWarehouseId: (warehouseId) => set({ warehouseId }),
  setItemId: (itemId) => set({ itemId }),
  setChannelStoreId: (channelStoreId) => set({ channelStoreId }),
  setSnapshotDate: (snapshotDate) => set({ snapshotDate }),
}));
