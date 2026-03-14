import { useFilterStore } from "../../store/filterStore";

export default function GlobalFilter() {
  const {
    fromDate,
    toDate,
    warehouseId,
    itemId,
    channelStoreId,
    setFromDate,
    setToDate,
    setWarehouseId,
    setItemId,
    setChannelStoreId,
  } = useFilterStore();

  return (
    <div className="filter-shell mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className="min-w-[10rem]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          조회 시작일
        </label>
        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          조회 종료일
        </label>
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          창고
        </label>
        <input
          type="text"
          value={warehouseId ?? ""}
          onChange={(event) => setWarehouseId(event.target.value || null)}
          placeholder="전체"
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          상품
        </label>
        <input
          type="text"
          value={itemId ?? ""}
          onChange={(event) => setItemId(event.target.value || null)}
          placeholder="전체"
          className="filter-control w-full"
        />
      </div>

      <div className="min-w-[10rem]">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          채널
        </label>
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
