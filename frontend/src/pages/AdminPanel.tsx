import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  fetchJob,
  fetchPipelineLock,
  fetchRecentJobs,
  rollbackBatches,
  startFinalizeJob,
  unlockPipeline,
  type BackendJobDetail,
  type BackendJobSummary,
} from "../api/backendApi";

type JobFilter = "all" | "running" | "failed" | "success";

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

function formatDuration(startedAt?: string | null, finishedAt?: string | null) {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "-";

  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}초`;

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}분 ${remainSeconds}초`;

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}시간 ${remainMinutes}분`;
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
  const [filter, setFilter] = useState<JobFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [rollbackBatchCount, setRollbackBatchCount] = useState(1);

  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => fetchRecentJobs(30),
    refetchInterval: 5000,
  });

  const lockQuery = useQuery({
    queryKey: ["admin", "pipeline-lock"],
    queryFn: fetchPipelineLock,
    refetchInterval: 5000,
  });

  const rerunMutation = useMutation({
    mutationFn: startFinalizeJob,
    onSuccess: async (created) => {
      setMessage("후처리 작업을 다시 시작했습니다.");
      setSelectedJobId(created.job_id);
      await jobsQuery.refetch();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "후처리 재실행 중 오류가 발생했습니다.");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: unlockPipeline,
    onSuccess: async () => {
      setMessage("파이프라인 락을 해제했습니다.");
      await lockQuery.refetch();
      await jobsQuery.refetch();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "락 해제 중 오류가 발생했습니다.");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: rollbackBatches,
    onSuccess: async (result) => {
      setMessage(result.message ?? "최근 배치 롤백을 실행했습니다.");
      await jobsQuery.refetch();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "배치 롤백 중 오류가 발생했습니다.");
    },
  });

  const filteredJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    switch (filter) {
      case "running":
        return items.filter((job) => job.status === "running" || job.status === "queued");
      case "failed":
        return items.filter((job) => job.status === "failed");
      case "success":
        return items.filter((job) => job.status === "success");
      default:
        return items;
    }
  }, [filter, jobsQuery.data?.items]);

  useEffect(() => {
    if (!selectedJobId && filteredJobs[0]?.job_id) {
      setSelectedJobId(filteredJobs[0].job_id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJobSummary = (jobsQuery.data?.items ?? []).find((job) => job.job_id === selectedJobId) ?? null;

  const jobDetailQuery = useQuery({
    queryKey: ["admin", "job", selectedJobId],
    queryFn: () => fetchJob(selectedJobId!),
    enabled: !!selectedJobId,
    refetchInterval: (query) => {
      const job = query.state.data as BackendJobDetail | undefined;
      return job?.status === "running" || job?.status === "queued" ? 2000 : 10000;
    },
  });

  const allJobs = jobsQuery.data?.items ?? [];
  const runningCount = allJobs.filter((job) => job.status === "running" || job.status === "queued").length;
  const failedCount = allJobs.filter((job) => job.status === "failed").length;
  const successCount = allJobs.filter((job) => job.status === "success").length;

  return (
    <div className="space-y-6">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">운영 관리</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">업로드와 후처리 상태를 한 화면에서 관리합니다.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            최근 배치 이력, 현재 실행 단계, 실패 메시지를 확인하고 필요하면 즉시 후처리를 다시 실행할 수 있습니다.
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

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">운영 복구</h2>
            <p className="mt-1 text-sm text-gray-500">터미널 없이 락 해제와 상태 복구를 실행합니다.</p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4 text-sm text-gray-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">파이프라인 락</p>
                <p className="mt-1 text-xs text-gray-500">후처리 파이프라인의 현재 잠금 상태입니다.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${lockQuery.data?.locked ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {lockQuery.data?.locked ? "잠김" : "열림"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
              <p>PID: {lockQuery.data?.pid ?? "-"}</p>
              <p>시작: {formatDate(lockQuery.data?.started_at)}</p>
            </div>
            <button
              onClick={() => {
                setMessage(null);
                void unlockMutation.mutateAsync();
              }}
              disabled={unlockMutation.isPending}
              className="mt-4 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-orange-300 hover:text-gray-900 disabled:bg-gray-100"
            >
              {unlockMutation.isPending ? "해제 중.." : "락 해제"}
            </button>
          </div>
        </div>

        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">최근 배치 롤백</h2>
            <p className="mt-1 text-sm text-gray-500">잘못 적재된 최근 배치를 되돌린 뒤 다시 적재할 수 있습니다.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">롤백 배치 수</span>
              <input
                type="number"
                min={1}
                max={10}
                value={rollbackBatchCount}
                onChange={(event) => setRollbackBatchCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                className="filter-control w-full"
              />
            </label>
            <button
              onClick={() => {
                setMessage(null);
                void rollbackMutation.mutateAsync(rollbackBatchCount);
              }}
              disabled={rollbackMutation.isPending}
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:bg-gray-300"
            >
              {rollbackMutation.isPending ? "롤백 중.." : "최근 배치 롤백"}
            </button>
          </div>
          <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-600">
            업로드 실수 시 롤백 후 필요한 파일만 다시 업로드하고, 후처리 재실행 버튼을 누르면 됩니다.
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-card space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">최근 작업</h2>
              <p className="mt-1 text-sm text-gray-500">최근 업로드 후처리 작업과 상태를 확인합니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-xl px-3 py-2 text-sm transition ${filter === "all" ? "bg-gray-900 text-white" : "border border-black/10 bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900"}`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter("running")}
                className={`rounded-xl px-3 py-2 text-sm transition ${filter === "running" ? "bg-gray-900 text-white" : "border border-black/10 bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900"}`}
              >
                실행 중
              </button>
              <button
                onClick={() => setFilter("failed")}
                className={`rounded-xl px-3 py-2 text-sm transition ${filter === "failed" ? "bg-gray-900 text-white" : "border border-black/10 bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900"}`}
              >
                실패
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void jobsQuery.refetch()}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
            >
              새로고침
            </button>
            <button
              onClick={() => {
                setMessage(null);
                void rerunMutation.mutateAsync();
              }}
              disabled={rerunMutation.isPending}
              className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:bg-orange-300"
            >
              {rerunMutation.isPending ? "재실행 중..." : "후처리 다시 실행"}
            </button>
          </div>

          {message ? <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-700">{message}</div> : null}

          <div className="space-y-3">
            {filteredJobs.map((job: BackendJobSummary) => {
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
                    <p>소요: {formatDuration(job.started_at, job.finished_at)}</p>
                    <p>트리거: {job.trigger_source ?? "-"}</p>
                  </div>
                  {job.error_msg ? <p className="mt-3 text-sm text-amber-700">{job.error_msg}</p> : null}
                </button>
              );
            })}

            {jobsQuery.isLoading && <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">작업 목록을 불러오는 중입니다.</div>}
            {!jobsQuery.isLoading && filteredJobs.length === 0 && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">조건에 맞는 작업 이력이 없습니다.</div>
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
                <p>소요 시간: {formatDuration(jobDetailQuery.data?.started_at ?? selectedJobSummary.started_at, jobDetailQuery.data?.finished_at ?? selectedJobSummary.finished_at)}</p>
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
