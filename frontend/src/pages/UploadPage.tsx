import { ChangeEvent, useMemo, useState } from "react";
import {
  buildAliasMapFromMappings,
  downloadTemplate,
  getColumnLabel,
  parsePreviewFile,
  TABLE_LABELS,
  UPLOAD_DATASETS,
  useColumnMappings,
  useDirectUpload,
  type FileParseResult,
} from "../api/uploadApi";

function scoreLabel(score: number) {
  if (score >= 0.85) return "높음";
  if (score >= 0.6) return "보통";
  return "낮음";
}

export default function UploadPage() {
  const [fileResults, setFileResults] = useState<FileParseResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const { data: mappings = [] } = useColumnMappings();
  const uploadMutation = useDirectUpload();

  const aliasMap = useMemo(() => buildAliasMapFromMappings(mappings), [mappings]);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsParsing(true);
    try {
      const parsed = await Promise.all(files.map((file) => parsePreviewFile(file, aliasMap)));
      setFileResults(parsed);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleUpload() {
    if (fileResults.length === 0) return;
    await uploadMutation.mutateAsync({ fileResults });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">업로드</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            템플릿 다운로드부터 파일 검토, raw 적재까지 한 화면에서 진행합니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            파일을 올리면 컬럼을 자동 판별하고, 현재 계약 테이블 기준으로 raw 스키마에 적재합니다. 이후 core와 mart 연결은 운영 파이프라인에서 이어집니다.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">1. 템플릿 다운로드</h2>
            <p className="mt-1 text-sm text-gray-500">데이터셋별 표준 헤더를 내려받아 사내 원본 형식을 맞출 수 있습니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {UPLOAD_DATASETS.map((dataset) => (
              <button
                key={dataset.raw_table_name}
                onClick={() => downloadTemplate(dataset.raw_table_name)}
                className="rounded-2xl border border-black/10 bg-white/80 px-4 py-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
              >
                <p className="text-sm font-semibold text-gray-900">{dataset.label}</p>
                <p className="mt-1 text-xs text-gray-500">{dataset.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-orange-700">{dataset.raw_table_name}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">2. 파일 선택</h2>
            <p className="mt-1 text-sm text-gray-500">CSV 또는 엑셀 파일을 여러 개 한 번에 선택할 수 있습니다.</p>
          </div>
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-stone-50 px-6 py-8 text-center transition hover:border-orange-300 hover:bg-orange-50">
            <span className="text-sm font-semibold text-gray-800">파일 추가</span>
            <span className="mt-2 text-xs text-gray-500">CSV, XLSX, XLS 형식을 지원합니다.</span>
            <input type="file" accept=".csv,.xlsx,.xls" multiple className="hidden" onChange={handleFilesSelected} />
          </label>
          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
            {isParsing
              ? "파일 구조를 확인하는 중입니다..."
              : fileResults.length > 0
                ? `${fileResults.length}개 파일을 읽었습니다. 자동 판별 결과를 확인한 뒤 업로드를 진행하세요.`
                : "아직 선택된 파일이 없습니다."}
          </div>
          <button
            onClick={handleUpload}
            disabled={fileResults.length === 0 || uploadMutation.isPending}
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {uploadMutation.isPending ? "raw 적재 중..." : "3. raw 스키마로 업로드"}
          </button>
        </section>
      </div>

      {fileResults.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">파일 검토</h2>
            <p className="mt-1 text-sm text-gray-500">자동 판별 결과와 미리보기 기준으로 업로드 전에 구조를 확인할 수 있습니다.</p>
          </div>
          <div className="grid gap-4">
            {fileResults.map((result) => (
              <div key={result.file.name} className="panel-card space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{result.file.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      자동 판별: {result.detectedTable ? TABLE_LABELS[result.detectedTable] : "미판별"} / 신뢰도 {scoreLabel(result.detectedScore)} ({Math.round(result.detectedScore * 100)}%)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">매핑 {Object.keys(result.mappedColumns).length}개</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">미매핑 {result.unmappedColumns.length}개</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">미리보기 {result.previewRows.length}행</span>
                  </div>
                </div>

                {result.unmappedColumns.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    미매핑 컬럼: {result.unmappedColumns.join(", ")}
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 text-left text-gray-600">
                        {result.headers.map((header) => (
                          <th key={header} className="px-4 py-2 align-top">
                            <div className="font-medium text-gray-800">{header}</div>
                            <div className="mt-1 text-[11px] text-gray-500">
                              {result.mappedColumns[header] ? getColumnLabel(result.mappedColumns[header]) : "미매핑"}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.previewRows.map((row, index) => (
                        <tr key={`${result.file.name}-${index}`} className="border-t border-gray-100 hover:bg-gray-50">
                          {result.headers.map((header) => (
                            <td key={`${result.file.name}-${index}-${header}`} className="max-w-52 truncate px-4 py-2 text-gray-700">
                              {String(row[header] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {uploadMutation.data && (
        <section className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">적재 결과</h2>
            <p className="mt-1 text-sm text-gray-500">이번 실행에서 raw 스키마로 적재된 행 수와 오류를 보여줍니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">적재 행</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{uploadMutation.data.totalInserted.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">건너뜀</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{uploadMutation.data.totalSkipped.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">상태</p>
              <p className={`mt-2 text-xl font-semibold ${uploadMutation.data.hasErrors ? "text-amber-700" : "text-emerald-700"}`}>
                {uploadMutation.data.hasErrors ? "오류 포함" : "정상 완료"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {uploadMutation.data.results.map((result) => (
              <div key={`${result.fileName}-${result.tableName}`} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{result.fileName}</p>
                    <p className="mt-1 text-xs text-gray-500">{TABLE_LABELS[result.tableName] ?? result.tableName}</p>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>적재 {result.insertedCount.toLocaleString()}행</span>
                    <span>건너뜀 {result.skippedCount.toLocaleString()}행</span>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-amber-800">
                    {result.errors.map((error) => (
                      <li key={error}>- {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
