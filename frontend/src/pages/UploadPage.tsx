import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { fetchJob, startFinalizeJob, uploadRawBatches, type BackendJobDetail } from "../api/backendApi";
import {
  buildAliasMapFromMappings,
  downloadTemplate,
  getColumnLabel,
  parsePreviewFile,
  prepareUploadPayload,
  TABLE_LABELS,
  UPLOAD_DATASETS,
  useColumnMappings,
  type DirectInsertResult,
  type FileParseResult,
  type UploadResult,
} from "../api/uploadApi";

function scoreLabel(score: number) {
  if (score >= 0.85) return "높음";
  if (score >= 0.6) return "보통";
  return "낮음";
}

function jobStatusLabel(status: string | undefined) {
  switch (status) {
    case "queued":
      return "대기 중";
    case "running":
      return "실행 중";
    case "success":
      return "완료";
    case "failed":
      return "실패";
    default:
      return "-";
  }
}

export default function UploadPage() {
  const [fileResults, setFileResults] = useState<FileParseResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [job, setJob] = useState<BackendJobDetail | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const { data: mappings = [] } = useColumnMappings();
  const queryClient = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: async ({ fileResults }: { fileResults: FileParseResult[] }): Promise<UploadResult> => {
      const prepared = await Promise.all(fileResults.map((fileResult) => prepareUploadPayload(fileResult)));
      const uploadable = prepared.filter((item) => item.tableName !== "unknown" && item.rows.length > 0);

      const backendResponse = uploadable.length > 0
        ? await uploadRawBatches(
            uploadable.map((item) => ({
              table_name: item.tableName,
              file_name: item.fileName,
              rows: item.rows,
            })),
          )
        : { items: [] };

      const backendMap = new Map(backendResponse.items.map((item) => [`${item.file_name}|${item.table_name}`, item]));
      const results: DirectInsertResult[] = prepared.map((item) => {
        if (item.tableName === "unknown") {
          return {
            tableName: item.tableName,
            fileName: item.fileName,
            insertedCount: 0,
            skippedCount: item.skippedCount,
            errors: item.errors,
          };
        }

        const backendItem = backendMap.get(`${item.fileName}|${item.tableName}`);
        const insertedCount = backendItem?.inserted_count ?? 0;
        const errors = [...item.errors];
        if (backendItem?.error) {
          errors.push(backendItem.error);
        }

        return {
          tableName: item.tableName,
          fileName: item.fileName,
          insertedCount,
          skippedCount: item.skippedCount,
          errors: errors.slice(0, 20),
        };
      });

      return {
        totalInserted: results.reduce((sum, result) => sum + result.insertedCount, 0),
        totalSkipped: results.reduce((sum, result) => sum + result.skippedCount, 0),
        hasErrors: results.some((result) => result.errors.length > 0),
        results,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload"] });
      queryClient.invalidateQueries({ queryKey: ["scm"] });
      queryClient.invalidateQueries({ queryKey: ["pnl"] });
    },
  });

  const aliasMap = useMemo(() => buildAliasMapFromMappings(mappings), [mappings]);

  useEffect(() => {
    if (!job?.job_id) return;
    if (job.status === "success" || job.status === "failed") return;

    const timer = window.setInterval(async () => {
      try {
        const latest = await fetchJob(job.job_id);
        setJob(latest);
      } catch (error) {
        setJobError(error instanceof Error ? error.message : "작업 상태 조회 중 오류가 발생했습니다.");
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [job]);

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

  async function handleFinalize() {
    setIsStartingJob(true);
    setJobError(null);
    try {
      const created = await startFinalizeJob();
      const latest = await fetchJob(created.job_id);
      setJob(latest);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "후처리 작업 시작 중 오류가 발생했습니다.");
    } finally {
      setIsStartingJob(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">업로드</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            템플릿 다운로드부터 raw 적재, 후처리 실행까지 한 흐름으로 진행합니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            먼저 파일을 업로드해 raw 계약 테이블에 저장하고, 그 다음 버튼 한 번으로 Railway 백엔드가 `raw → core → mart` 후처리를 이어서 실행합니다.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">1. 템플릿 다운로드</h2>
            <p className="mt-1 text-sm text-gray-500">데이터셋별 표준 헤더를 내려받아 사내 원본 파일 형식을 맞춥니다.</p>
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
            <h2 className="text-base font-semibold text-gray-900">2. 파일 업로드</h2>
            <p className="mt-1 text-sm text-gray-500">CSV 또는 엑셀 파일을 선택하면 컬럼과 데이터셋 유형을 자동 판별합니다.</p>
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
                ? `${fileResults.length}개 파일을 읽었습니다. 자동 판별 결과를 확인한 뒤 raw 적재를 진행하세요.`
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
            <p className="mt-1 text-sm text-gray-500">자동 판별 결과와 미리보기를 기준으로 업로드 전에 구조를 확인합니다.</p>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">적재 결과</h2>
              <p className="mt-1 text-sm text-gray-500">raw 스키마 적재 결과와 후처리 실행 상태를 함께 확인합니다.</p>
            </div>
            <button
              onClick={handleFinalize}
              disabled={isStartingJob || (job?.status === "queued" || job?.status === "running")}
              className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {isStartingJob ? "후처리 요청 중..." : "4. core / mart 반영 실행"}
            </button>
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
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">후처리</p>
              <p className={`mt-2 text-xl font-semibold ${job?.status === "failed" ? "text-amber-700" : "text-emerald-700"}`}>
                {jobStatusLabel(job?.status)}
              </p>
            </div>
          </div>

          {jobError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {jobError}
            </div>
          )}

          {job && (
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4 text-sm text-gray-700">
              <p>작업 ID: {job.job_id}</p>
              <p className="mt-1">상태: {jobStatusLabel(job.status)}</p>
              {job.error_msg ? <p className="mt-1 text-amber-800">오류: {job.error_msg}</p> : null}
            </div>
          )}

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
