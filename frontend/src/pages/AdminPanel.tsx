import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchJob, fetchRecentJobs, type BackendJobDetail, type BackendJobSummary } from "../api/backendApi";

function statusTone(status: string | undefined) {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-amber-50 text-amber-700";
    case "running":
      return "bg-blue-50 text-blue-700";
    case "queued":
      return "bg-stone-100 text-stone-700";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

function statusLabel(status: string | undefined) {
  switch (status) {
    case "success":
      return "완료";
    case "failed":
      return "실패";
    case "running":
      return "실행 중";
    case "queued":
      return "대기 중";
    default:
      return "-";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function getCurrentStep(job?: BackendJobDetail | null) {
  const detail = job?.detail;
  if (!detail || typeof detail !== "object") return "-";
  const currentStep = detail.current_step;
  return typeof currentStep === "string" && currentStep.length > 0 ? currentStep : "-";
}

function getSteps(job?: BackendJobDetail | null) {
  const detail = job?.detail;
  if (!detail || typeof detail !== "object") return [];
  const steps = detail.steps;
  return Array.isArray(steps) ? steps : [];
}

export default function AdminPanel() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => fetchRecentJobs(30),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!selectedJobId && jobsQuery.data?.items?.[0]?.job_id) {
      setSelectedJobId(jobsQuery.data.items[0].job_id);
    }
  }, [jobsQuery.data, selectedJobId]);

  const selectedJobSummary = jobsQuery.data?.items.find((job) => job.job_id === selectedJobId) ?? null;

  const jobDetailQuery = useQuery({
    queryKey: ["admin", "job", selectedJobId],
    queryFn: () => fetchJob(selectedJobId!),
    enabled: !!selectedJobId,
    refetchInterval: (query) => {
      const job = query.state.data as BackendJobDetail | undefined;
      return job?.status === "running" || job?.status === "queued" ? 2000 : 10000;
    },
  });

  const runningCount = (jobsQuery.data?.items ?? []).filter((job) => job.status === "running" || job.status === "queued").length;
  const failedCount = (jobsQuery.data?.items ?? []).filter((job) => job.status === "failed").length;
  const successCount = (jobsQuery.data?.items ?? []).filter((job) => job.status === "success").length;

  return (
    <div className="space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">운영 관리</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">업로드와 후처리 상태를 한 화면에서 관리합니다.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            최근 배치 이력, 현재 실행 단계, 실패 메시지를 확인하고 어느 단계에서 막혔는지 바로 추적할 수 있습니다.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">실행 중</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{runningCount}</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">최근 완료</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{successCount}</p>
        </div>
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">최근 실패</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{failedCount}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">최근 작업</h2>
              <p className="mt-1 text-sm text-gray-500">최근 업로드 후처리 작업과 상태를 확인합니다.</p>
            </div>
            <button
              onClick={() => void jobsQuery.refetch()}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
            >
              새로고침
            </button>
          </div>

          <div className="space-y-3">
            {(jobsQuery.data?.items ?? []).map((job: BackendJobSummary) => {
              const isActive = job.job_id === selectedJobId;
              return (
                <button
                  key={job.job_id}
                  onClick={() => setSelectedJobId(job.job_id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    isActive ? "border-orange-300 bg-orange-50" : "border-black/5 bg-white hover:border-black/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{job.job_type}</p>
                      <p className="mt-1 break-all text-xs text-gray-500">{job.job_id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(job.status)}`}>
                      {statusLabel(job.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                    <p>시작: {formatDate(job.started_at)}</p>
                    <p>종료: {formatDate(job.finished_at)}</p>
                  </div>
                  {job.error_msg ? <p className="mt-3 text-sm text-amber-700">{job.error_msg}</p> : null}
                </button>
              );
            })}

            {jobsQuery.isLoading && <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">작업 목록을 불러오는 중입니다.</div>}
            {!jobsQuery.isLoading && (jobsQuery.data?.items?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">표시할 작업 이력이 없습니다.</div>
            )}
          </div>
        </section>

        <section className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">작업 상세</h2>
            <p className="mt-1 text-sm text-gray-500">선택한 작업의 현재 단계와 step별 결과를 확인합니다.</p>
          </div>

          {selectedJobSummary && (
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4 text-sm text-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{selectedJobSummary.job_type}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">{selectedJobSummary.job_id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(jobDetailQuery.data?.status ?? selectedJobSummary.status)}`}>
                  {statusLabel(jobDetailQuery.data?.status ?? selectedJobSummary.status)}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p>시작: {formatDate(jobDetailQuery.data?.started_at ?? selectedJobSummary.started_at)}</p>
                <p>종료: {formatDate(jobDetailQuery.data?.finished_at ?? selectedJobSummary.finished_at)}</p>
                <p>현재 단계: {getCurrentStep(jobDetailQuery.data)}</p>
                <p>트리거: {jobDetailQuery.data?.trigger_source ?? selectedJobSummary.trigger_source ?? "-"}</p>
              </div>
              {(jobDetailQuery.data?.error_msg ?? selectedJobSummary.error_msg) ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                  오류: {jobDetailQuery.data?.error_msg ?? selectedJobSummary.error_msg}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-3">
            {getSteps(jobDetailQuery.data).map((step, index) => (
              <div key={`${String(step.name ?? "step")}-${index}`} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{String(step.name ?? `step-${index + 1}`)}</p>
                    <p className="mt-1 text-xs text-gray-500">{String(step.command ?? "-")}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      Number(step.returncode) === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {Number(step.returncode) === 0 ? "정상" : "오류"}
                  </span>
                </div>
                {step.stderr ? <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-50 px-3 py-3 text-xs text-amber-800">{String(step.stderr)}</pre> : null}
                {step.stdout ? <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-50 px-3 py-3 text-xs text-gray-600">{String(step.stdout)}</pre> : null}
              </div>
            ))}

            {jobDetailQuery.isLoading && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">작업 상세를 불러오는 중입니다.</div>
            )}
            {!jobDetailQuery.isLoading && selectedJobId && getSteps(jobDetailQuery.data).length === 0 && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">아직 기록된 상세 step이 없습니다.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
