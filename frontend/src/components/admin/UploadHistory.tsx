import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchUploadHistory,
  type UploadHistoryItem,
  type UploadHistoryParams,
} from "../../api/backendApi";

type StatusFilter = "" | "success" | "duplicate" | "error" | "pending";

const TABLE_OPTIONS = [
  "",
  "upload_inventory_snapshot",
  "upload_purchase_order",
  "upload_receipt",
  "upload_shipment",
  "upload_return",
  "upload_sales",
  "upload_charge",
] as const;

const TABLE_LABELS: Record<string, string> = {
  upload_inventory_snapshot: "재고 스냅샷",
  upload_purchase_order: "발주",
  upload_receipt: "입고",
  upload_shipment: "출하",
  upload_return: "반품",
  upload_sales: "매출",
  upload_charge: "비용",
};

function statusTone(status: string) {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "duplicate":
      return "bg-blue-50 text-blue-700";
    case "error":
      return "bg-amber-50 text-amber-700";
    case "pending":
      return "bg-stone-100 text-stone-700";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "success":
      return "성공";
    case "duplicate":
      return "중복";
    case "error":
      return "오류";
    case "pending":
      return "대기";
    default:
      return status;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function shortHash(hash: string | null) {
  if (!hash) return "-";
  return hash.slice(0, 12) + "...";
}

const PAGE_SIZE = 30;

export default function UploadHistory() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [tableFilter, setTableFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  const params: UploadHistoryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter || undefined,
      table_name: tableFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [statusFilter, tableFilter, dateFrom, dateTo, page],
  );

  const query = useQuery({
    queryKey: ["admin", "upload-history", params],
    queryFn: () => fetchUploadHistory(params),
    refetchInterval: 10000,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group items by batch_id for detail view
  const batchItems = useMemo(() => {
    const map = new Map<number, UploadHistoryItem[]>();
    for (const item of items) {
      const list = map.get(item.batch_id) ?? [];
      list.push(item);
      map.set(item.batch_id, list);
    }
    return map;
  }, [items]);

  // Summary counts
  const summary = useMemo(() => {
    const s = { success: 0, duplicate: 0, error: 0, pending: 0 };
    for (const item of items) {
      if (item.status in s) s[item.status as keyof typeof s]++;
    }
    return s;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-4">
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">성공</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{summary.success}</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">중복 스킵</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{summary.duplicate}</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">오류</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{summary.error}</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">전체 (필터 기준)</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{total}</p>
        </div>
      </section>

      {/* Filters */}
      <section className="panel-card">
        <h2 className="text-base font-semibold text-gray-900">필터</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">상태</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
              className="filter-control w-full"
            >
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="duplicate">중복</option>
              <option value="error">오류</option>
              <option value="pending">대기</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">테이블</span>
            <select
              value={tableFilter}
              onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
              className="filter-control w-full"
            >
              <option value="">전체</option>
              {TABLE_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">시작일</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="filter-control w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">종료일</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="filter-control w-full"
            />
          </label>
        </div>
      </section>

      {/* Table */}
      <section className="panel-card space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">업로드 이력</h2>
            <p className="mt-1 text-sm text-gray-500">배치를 클릭하면 해당 배치의 파일별 상세를 볼 수 있습니다.</p>
          </div>
          <button
            onClick={() => void query.refetch()}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
          >
            새로고침
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-3">배치 ID</th>
                <th className="px-4 py-3">파일명</th>
                <th className="px-4 py-3">테이블</th>
                <th className="px-4 py-3">행 수</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">해시</th>
                <th className="px-4 py-3">처리 시각</th>
                <th className="px-4 py-3">오류</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const isExpanded = expandedBatch === item.batch_id;
                const batchGroup = batchItems.get(item.batch_id) ?? [];
                const isFirstInBatch = idx === 0 || items[idx - 1]?.batch_id !== item.batch_id;

                return (
                  <tr
                    key={`${item.batch_id}-${item.file_name}-${idx}`}
                    onClick={() => setExpandedBatch(isExpanded ? null : item.batch_id)}
                    className={`cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 ${isExpanded ? "bg-orange-50" : "bg-white"}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{item.batch_id}</span>
                      {isFirstInBatch && batchGroup.length > 1 && (
                        <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-gray-500">
                          {batchGroup.length}개 파일
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={item.file_name}>
                      {item.file_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {TABLE_LABELS[item.table_name ?? ""] ?? item.table_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.row_count?.toLocaleString() ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500" title={item.file_hash}>
                      {shortHash(item.file_hash)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(item.processed_at)}</td>
                    <td className="px-4 py-3 text-amber-700">
                      <span className="line-clamp-2">{item.error_msg ?? "-"}</span>
                    </td>
                  </tr>
                );
              })}

              {query.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    업로드 이력을 불러오는 중입니다.
                  </td>
                </tr>
              )}
              {!query.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    조건에 맞는 업로드 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500">
              총 {total.toLocaleString()}건 중 {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 disabled:opacity-40"
              >
                이전
              </button>
              <span className="flex items-center px-2 text-sm text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Batch detail panel */}
      {expandedBatch !== null && (
        <section className="panel-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">배치 상세</h2>
              <p className="mt-1 text-sm text-gray-500">
                배치 ID: <span className="font-mono">{expandedBatch}</span>
              </p>
            </div>
            <button
              onClick={() => setExpandedBatch(null)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300"
            >
              닫기
            </button>
          </div>

          {(() => {
            const batchGroup = batchItems.get(expandedBatch) ?? [];
            if (batchGroup.length === 0) return null;
            const first = batchGroup[0];
            return (
              <>
                {/* Batch summary */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">배치 시작</p>
                    <p className="mt-1 text-sm text-gray-700">{formatDate(first.batch_started_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">배치 종료</p>
                    <p className="mt-1 text-sm text-gray-700">{formatDate(first.batch_finished_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">배치 상태</p>
                    <p className="mt-1 text-sm text-gray-700">{first.batch_status ?? "-"}</p>
                  </div>
                </div>

                {/* Files in batch */}
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 text-left text-gray-600">
                        <th className="px-4 py-3">파일명</th>
                        <th className="px-4 py-3">테이블</th>
                        <th className="px-4 py-3">행 수</th>
                        <th className="px-4 py-3">상태</th>
                        <th className="px-4 py-3">해시</th>
                        <th className="px-4 py-3">오류</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchGroup.map((file, fi) => (
                        <tr key={`${file.file_name}-${fi}`} className="border-t border-gray-100 bg-white">
                          <td className="px-4 py-3 max-w-[240px] truncate" title={file.file_name}>{file.file_name}</td>
                          <td className="px-4 py-3 text-gray-600">{TABLE_LABELS[file.table_name ?? ""] ?? file.table_name ?? "-"}</td>
                          <td className="px-4 py-3 text-gray-600">{file.row_count?.toLocaleString() ?? "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(file.status)}`}>
                              {statusLabel(file.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500" title={file.file_hash}>
                            {shortHash(file.file_hash)}
                          </td>
                          <td className="px-4 py-3 text-amber-700">{file.error_msg ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
}
