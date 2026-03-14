import { create } from "zustand";

function getCurrentPeriod(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export type TimeGrain = "day" | "week" | "month" | "year";

interface FilterState {
  period: string;
  timeGrain: TimeGrain;
  warehouseId: string | null;
  itemId: string | null;
  channelStoreId: string | null;
  snapshotDate: string | null;
  setPeriod: (period: string) => void;
  setTimeGrain: (timeGrain: TimeGrain) => void;
  setWarehouseId: (id: string | null) => void;
  setItemId: (id: string | null) => void;
  setChannelStoreId: (id: string | null) => void;
  setSnapshotDate: (date: string | null) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  period: getCurrentPeriod(),
  timeGrain: "month",
  warehouseId: null,
  itemId: null,
  channelStoreId: null,
  snapshotDate: null,
  setPeriod: (period) => set({ period }),
  setTimeGrain: (timeGrain) => set({ timeGrain }),
  setWarehouseId: (warehouseId) => set({ warehouseId }),
  setItemId: (itemId) => set({ itemId }),
  setChannelStoreId: (channelStoreId) => set({ channelStoreId }),
  setSnapshotDate: (snapshotDate) => set({ snapshotDate }),
}));
