export interface BackendJobSummary {
  job_id: string;
  job_type: string;
  status: string;
  trigger_source?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error_msg?: string | null;
}

export interface BackendJobDetail extends BackendJobSummary {
  payload?: Record<string, unknown> | null;
  detail?: Record<string, unknown> | null;
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export async function startFinalizeJob() {
  const response = await fetch(`${API_URL}/api/jobs/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger_source: "frontend" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "후처리 작업을 시작하지 못했습니다.");
  }

  return response.json() as Promise<{ job_id: string; status: string }>;
}

export async function fetchJob(jobId: string) {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "작업 상태를 불러오지 못했습니다.");
  }
  return response.json() as Promise<BackendJobDetail>;
}
