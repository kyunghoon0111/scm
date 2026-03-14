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
      setMessage(result.message ?? "최근 배치를 롤백했습니다.");
      await jobsQuery.refetch();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "롤백 중 오류가 발생했습니다.");
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
        <p className="eyebrow relative z-10">관리</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            업로드와 후처리 상태를 한 화면에서 관리합니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            최근 작업, 실패 원인, 현재 실행 단계, 락 상태, 롤백까지 운영자가 바로 복구할 수 있게 구성했습니다.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
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
        <div className="panel-card">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">파이프라인 락</p>
          <p className={`mt-2 text-3xl font-semibold ${lockQuery.data?.locked ? "text-amber-700" : "text-emerald-700"}`}>
            {lockQuery.data?.locked ? "잠김" : "정상"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">즉시 실행</h2>
            <p className="mt-1 text-sm text-gray-500">새 후처리를 다시 돌리거나, 현재 상태를 새로고침할 수 있습니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void jobsQuery.refetch()}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
            >
              목록 새로고침
            </button>
            <button
              onClick={() => {
                setMessage(null);
                void rerunMutation.mutateAsync();
              }}
              disabled={rerunMutation.isPending}
              className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:bg-orange-300"
            >
              {rerunMutation.isPending ? "실행 중..." : "후처리 다시 실행"}
            </button>
          </div>

          {message ? (
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-sm text-gray-700">
              {message}
            </div>
          ) : null}
        </div>

        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">운영 복구</h2>
            <p className="mt-1 text-sm text-gray-500">터미널 없이도 락 해제와 최근 배치 롤백을 처리할 수 있게 묶었습니다.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">파이프라인 락</p>
              <p className="mt-1 text-xs text-gray-500">실패 후 락이 남아 새 작업이 안 돌 때 여기서 해제합니다.</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p>상태: {lockQuery.data?.locked ? "잠김" : "정상"}</p>
                <p>PID: {lockQuery.data?.pid ?? "-"}</p>
                <p>시작 시각: {formatDate(lockQuery.data?.started_at)}</p>
              </div>
              <button
                onClick={() => {
                  if (!window.confirm("파이프라인 락을 해제합니다.\n진행 중인 작업이 있다면 데이터 정합성에 문제가 생길 수 있습니다.\n\n정말 해제하시겠습니까?")) return;
                  setMessage(null);
                  void unlockMutation.mutateAsync();
                }}
                disabled={unlockMutation.isPending}
                className="mt-4 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-orange-300 hover:text-gray-900 disabled:bg-gray-100"
              >
                {unlockMutation.isPending ? "해제 중..." : "락 해제"}
              </button>
            </div>

            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">최근 배치 롤백</p>
              <p className="mt-1 text-xs text-gray-500">잘못 올린 데이터는 최근 배치를 기준으로 되돌린 뒤 다시 업로드합니다.</p>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  롤백 배치 수
                </span>
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
                  if (!window.confirm(`최근 ${rollbackBatchCount}개 배치를 롤백합니다.\n롤백된 데이터는 복구할 수 없습니다.\n\n정말 롤백하시겠습니까?`)) return;
                  setMessage(null);
                  void rollbackMutation.mutateAsync(rollbackBatchCount);
                }}
                disabled={rollbackMutation.isPending}
                className="mt-4 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:bg-gray-300"
              >
                {rollbackMutation.isPending ? "롤백 중..." : "최근 배치 롤백"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">최근 작업</h2>
            <p className="mt-1 text-sm text-gray-500">최근 업로드와 후처리 실행 내역을 넓게 보고, 행을 눌러 상세를 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "running", "failed", "success"] as JobFilter[]).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  filter === option ? "bg-gray-900 text-white" : "border border-black/10 bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900"
                }`}
              >
                {option === "all" ? "전체" : option === "running" ? "실행 중" : option === "failed" ? "실패" : "완료"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-gray-600">
                <th className="px-4 py-3">작업</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">시작</th>
                <th className="px-4 py-3">종료</th>
                <th className="px-4 py-3">소요 시간</th>
                <th className="px-4 py-3">트리거</th>
                <th className="px-4 py-3">오류</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job: BackendJobSummary) => {
                const isActive = job.job_id === selectedJobId;
                return (
                  <tr
                    key={job.job_id}
                    onClick={() => setSelectedJobId(job.job_id)}
                    className={`cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 ${isActive ? "bg-orange-50" : "bg-white"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{job.job_type}</div>
                      <div className="mt-1 max-w-[18rem] truncate font-mono text-xs text-gray-500" title={job.job_id}>
                        {job.job_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(job.status)}`}>
                        {statusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(job.started_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(job.finished_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDuration(job.started_at, job.finished_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{job.trigger_source ?? "-"}</td>
                    <td className="px-4 py-3 text-amber-700">
                      <span className="line-clamp-2">{job.error_msg ?? "-"}</span>
                    </td>
                  </tr>
                );
              })}

              {jobsQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    작업 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}
              {!jobsQuery.isLoading && filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    조건에 맞는 작업이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">선택된 작업 요약</h2>
            <p className="mt-1 text-sm text-gray-500">현재 단계와 실패 메시지를 먼저 보고, 필요한 경우 아래 로그를 확인합니다.</p>
          </div>

          {selectedJobSummary ? (
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-4 text-sm text-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{selectedJobSummary.job_type}</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">{selectedJobSummary.job_id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(jobDetailQuery.data?.status ?? selectedJobSummary.status)}`}>
                  {statusLabel(jobDetailQuery.data?.status ?? selectedJobSummary.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
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
          ) : (
            <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">
              아직 선택된 작업이 없습니다.
            </div>
          )}
        </div>

        <div className="panel-card space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">단계별 로그</h2>
            <p className="mt-1 text-sm text-gray-500">실패 시 어느 단계에서 멈췄는지 바로 찾을 수 있도록 stdout / stderr를 함께 보여줍니다.</p>
          </div>

          <div className="space-y-3">
            {getSteps(jobDetailQuery.data).map((step, index) => (
              <div key={`${String(step.name ?? "step")}-${index}`} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{String(step.name ?? `step-${index + 1}`)}</p>
                    <p className="mt-1 text-xs text-gray-500">{String(step.command ?? "-")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${Number(step.returncode) === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {Number(step.returncode) === 0 ? "정상" : "오류"}
                  </span>
                </div>
                {step.stderr ? <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-50 px-3 py-3 text-xs text-amber-800">{String(step.stderr)}</pre> : null}
                {step.stdout ? <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-50 px-3 py-3 text-xs text-gray-600">{String(step.stdout)}</pre> : null}
              </div>
            ))}

            {jobDetailQuery.isLoading && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">
                작업 상세를 불러오는 중입니다.
              </div>
            )}
            {!jobDetailQuery.isLoading && selectedJobId && getSteps(jobDetailQuery.data).length === 0 && (
              <div className="rounded-2xl border border-black/5 bg-stone-50 px-4 py-6 text-sm text-gray-500">
                아직 단계 로그가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
