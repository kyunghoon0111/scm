import { useEffect, useMemo, useState } from "react";
import {
  UPLOAD_DATASETS,
  useColumnMappings,
  useSaveColumnMappings,
  type ColumnMapping,
} from "../api/uploadApi";

type EditableMapping = {
  source_name: string;
  canonical_name: string;
  table_name: string;
};

const DATASET_LABELS: Record<string, { label: string; description: string }> = {
  upload_inventory_snapshot: { label: "재고 스냅샷", description: "현재고, 판매가능재고, 보류재고를 받습니다." },
  upload_purchase_order: { label: "발주", description: "발주 번호, 공급처, 예상 입고일을 받습니다." },
  upload_receipt: { label: "입고", description: "실제 입고 수량과 검수 결과를 받습니다." },
  upload_shipment: { label: "출고", description: "출고 이력과 주문 연결, 배송 정보를 받습니다." },
  upload_return: { label: "반품", description: "반품 수량, 사유, 처리 구분을 받습니다." },
  upload_sales: { label: "매출/정산", description: "총매출, 할인, 환불, 수수료를 받습니다." },
  upload_charge: { label: "비용", description: "운송비, 3PL, 플랫폼 비용 전표를 받습니다." },
};

function emptyMapping(): EditableMapping {
  return { source_name: "", canonical_name: "", table_name: "" };
}

function prettyCanonicalName(value: string) {
  return value.replace(/_/g, " ");
}

export default function SettingsPage() {
  const { data: mappings = [], isLoading } = useColumnMappings();
  const saveMappings = useSaveColumnMappings();
  const [rows, setRows] = useState<EditableMapping[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRows(
      mappings.map((mapping) => ({
        source_name: mapping.source_name,
        canonical_name: mapping.canonical_name,
        table_name: mapping.table_name ?? "",
      })),
    );
  }, [mappings]);

  const canonicalColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const dataset of UPLOAD_DATASETS) {
      [...dataset.primary_key, ...dataset.required, ...dataset.optional].forEach((key) => keys.add(key));
    }
    return Array.from(keys).sort();
  }, []);

  const filteredCanonicalColumns = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return canonicalColumns;
    return canonicalColumns.filter((key) => key.toLowerCase().includes(keyword));
  }, [canonicalColumns, search]);

  function updateRow(index: number, field: keyof EditableMapping, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => [...current, emptyMapping()]);
    setMessage(null);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setMessage(null);
  }

  async function handleSave() {
    const validRows = rows.filter((row) => row.source_name.trim() && row.canonical_name.trim());
    if (validRows.length === 0) {
      setMessage("저장할 매핑이 없습니다.");
      return;
    }

    const payload: ColumnMapping[] = validRows.map((row) => ({
      source_name: row.source_name.trim(),
      canonical_name: row.canonical_name.trim(),
      table_name: row.table_name.trim() || null,
    }));

    await saveMappings.mutateAsync(payload);
    setMessage("매핑을 저장했습니다.");
  }

  return (
    <div className="space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">설정</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            업로드 헤더를 표준 컬럼에 연결합니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            실제 파일 헤더가 조금씩 달라도 한 번만 매핑해 두면 다음부터는 업로드 화면에서 자동으로 인식합니다.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">지원 업로드 유형</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{UPLOAD_DATASETS.length}</p>
          <p className="mt-1 text-sm text-gray-500">재고, 발주, 입고, 출고, 반품, 매출, 비용</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">저장된 매핑</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{mappings.length}</p>
          <p className="mt-1 text-sm text-gray-500">자주 들어오는 파일 헤더를 미리 연결해 둔 개수</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">표준 컬럼</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{canonicalColumns.length}</p>
          <p className="mt-1 text-sm text-gray-500">업로드 엔진이 이해하는 공식 컬럼 수</p>
        </div>
      </section>

      <section className="panel-card space-y-4">
        <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">운영자가 주로 하는 일</p>
          <ul className="mt-2 space-y-1">
            <li>1. 파일 헤더가 다르면 여기서 한 번 매핑하고 다시 업로드합니다.</li>
            <li>2. 공통으로 쓰는 헤더는 `공통`으로 두고, 특정 파일만 쓰면 적용 대상을 지정합니다.</li>
            <li>3. 저장 후에는 업로드 화면에서 자동 판별 정확도가 올라갑니다.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">컬럼 매핑 관리</h2>
            <p className="mt-1 text-sm text-gray-500">파일 헤더와 표준 컬럼을 연결합니다. 저장 즉시 다음 업로드부터 반영됩니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
            >
              매핑 추가
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saveMappings.isPending}
              className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:bg-gray-300"
            >
              {saveMappings.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-3">파일 헤더</th>
                <th className="px-4 py-3">표준 컬럼</th>
                <th className="px-4 py-3">적용 대상</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.source_name}-${index}`} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <input
                      value={row.source_name}
                      onChange={(event) => updateRow(index, "source_name", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300"
                      placeholder="예: SKU, ITEM_CD, net_sales"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.canonical_name}
                      onChange={(event) => updateRow(index, "canonical_name", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300"
                      placeholder="예: item_id, gross_sales"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.table_name}
                      onChange={(event) => updateRow(index, "table_name", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300"
                    >
                      <option value="">공통</option>
                      {UPLOAD_DATASETS.map((dataset) => (
                        <option key={dataset.raw_table_name} value={dataset.raw_table_name}>
                          {DATASET_LABELS[dataset.raw_table_name]?.label ?? dataset.raw_table_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeRow(index)}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    아직 저장된 매핑이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="panel-card space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">표준 컬럼 찾기</h2>
              <p className="mt-1 text-sm text-gray-500">헤더 이름이 헷갈릴 때 먼저 표준 컬럼을 찾고, 그다음 위 표에 매핑하면 됩니다.</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300 md:max-w-xs"
              placeholder="컬럼 검색"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredCanonicalColumns.map((key) => (
              <div key={key} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">{key}</p>
                <p className="mt-1 text-xs text-gray-500">{prettyCanonicalName(key)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">지원 파일 유형</h2>
            <p className="mt-1 text-sm text-gray-500">어떤 파일이 어떤 업무를 담당하는지 바로 알 수 있게 정리했습니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {UPLOAD_DATASETS.map((dataset) => (
              <div key={dataset.raw_table_name} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">{DATASET_LABELS[dataset.raw_table_name]?.label ?? dataset.raw_table_name}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {DATASET_LABELS[dataset.raw_table_name]?.description ?? dataset.raw_table_name}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-orange-700">{dataset.raw_table_name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
