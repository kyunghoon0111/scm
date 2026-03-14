import { useEffect, useState } from "react";
import { COLUMN_LABELS, TABLE_LABELS, UPLOAD_DATASETS, useColumnMappings, useSaveColumnMappings, type ColumnMapping } from "../api/uploadApi";

type EditableMapping = {
  source_name: string;
  canonical_name: string;
  table_name: string;
};

function emptyMapping(): EditableMapping {
  return {
    source_name: "",
    canonical_name: "",
    table_name: "",
  };
}

export default function SettingsPage() {
  const { data: mappings = [], isLoading } = useColumnMappings();
  const saveMappings = useSaveColumnMappings();
  const [rows, setRows] = useState<EditableMapping[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRows(
      mappings.map((mapping) => ({
        source_name: mapping.source_name,
        canonical_name: mapping.canonical_name,
        table_name: mapping.table_name ?? "",
      })),
    );
  }, [mappings]);

  function updateRow(index: number, field: keyof EditableMapping, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => [...current, emptyMapping()]);
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
    setMessage("컬럼 매핑을 저장했습니다.");
  }

  return (
    <div className="space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">설정</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">업로드 컬럼 매핑과 계약 범위를 관리합니다.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            원본 파일 헤더가 템플릿과 다를 때 여기서 canonical 컬럼으로 맞출 수 있습니다. 저장 후 업로드 화면의 자동 판별에 바로 반영됩니다.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">업로드 계약</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{UPLOAD_DATASETS.length}</p>
          <p className="mt-1 text-sm text-gray-500">inventory, sales, charge 등 현재 지원되는 업로드 유형 수</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">등록 매핑</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{mappings.length}</p>
          <p className="mt-1 text-sm text-gray-500">자동 판별에 사용되는 사용자 매핑 수</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Canonical 컬럼</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{Object.keys(COLUMN_LABELS).length}</p>
          <p className="mt-1 text-sm text-gray-500">현재 템플릿과 업로드 파서가 이해하는 컬럼 수</p>
        </div>
      </section>

      <section className="panel-card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">컬럼 매핑 관리</h2>
            <p className="mt-1 text-sm text-gray-500">원본 헤더를 어떤 canonical 컬럼으로 해석할지 지정합니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
            >
              행 추가
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

        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

        <div className="overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-3">원본 헤더</th>
                <th className="px-4 py-3">Canonical 컬럼</th>
                <th className="px-4 py-3">대상 테이블</th>
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
                      placeholder="예: SKU, ITEM_CD, 판매단가"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.canonical_name}
                      onChange={(event) => updateRow(index, "canonical_name", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-300"
                      placeholder="예: item_id, unit_selling_price"
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
                          {TABLE_LABELS[dataset.raw_table_name]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    아직 저장된 컬럼 매핑이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">현재 업로드 계약</h2>
          <p className="mt-1 text-sm text-gray-500">지원되는 업로드 유형과 기본 설명을 확인합니다.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {UPLOAD_DATASETS.map((dataset) => (
            <div key={dataset.raw_table_name} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">{dataset.label}</p>
              <p className="mt-1 text-xs text-gray-500">{dataset.description}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-orange-700">{dataset.raw_table_name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
