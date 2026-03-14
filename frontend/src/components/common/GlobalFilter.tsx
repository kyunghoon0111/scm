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
    clearDrillFilters,
  } = useFilterStore();

  const hasDrillFilter = !!(warehouseId || itemId || channelStoreId);

  return (
    <div className="space-y-3">
      <div className="filter-shell grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

      <div className="flex items-center gap-3 px-1">
        <p className="text-xs text-gray-500">
          집계 단위는 모든 화면에 고정하지 않고, 추이 차트 안에서만 일·주·월·년으로 바꿀 수 있게 두었습니다.
        </p>
        {hasDrillFilter && (
          <button
            type="button"
            onClick={clearDrillFilters}
            className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
