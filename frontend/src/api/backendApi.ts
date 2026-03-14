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

export interface PipelineLockStatus {
  lock_id: number;
  locked: boolean;
  pid: number | null;
  started_at: string | null;
}

export interface RawUploadBatchItem {
  table_name: string;
  file_name: string;
  rows: Record<string, unknown>[];
}

export interface RawUploadBatchResult {
  table_name: string;
  file_name: string;
  inserted_count: number;
  skipped_count: number;
  duplicate: boolean;
  error: string | null;
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
    throw new Error(text || "Failed to start finalize job.");
  }

  return response.json() as Promise<{ job_id: string; status: string }>;
}

export async function fetchJob(jobId: string) {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch job status.");
  }
  return response.json() as Promise<BackendJobDetail>;
}

export async function fetchRecentJobs(limit = 20) {
  const response = await fetch(`${API_URL}/api/jobs?limit=${limit}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch recent jobs.");
  }
  return response.json() as Promise<{ items: BackendJobSummary[] }>;
}

export async function uploadRawBatches(items: RawUploadBatchItem[], force = false) {
  const response = await fetch(`${API_URL}/api/uploads/raw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, force }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to upload raw rows.");
  }

  return response.json() as Promise<{ items: RawUploadBatchResult[] }>;
}

export async function fetchPipelineLock() {
  const response = await fetch(`${API_URL}/api/ops/pipeline-lock`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch pipeline lock.");
  }
  return response.json() as Promise<PipelineLockStatus>;
}

export async function unlockPipeline() {
  const response = await fetch(`${API_URL}/api/ops/pipeline-lock/unlock`, {
    method: "POST",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to unlock pipeline.");
  }
  return response.json() as Promise<{ success: boolean; lock: PipelineLockStatus }>;
}

export async function rollbackBatches(batchCount: number) {
  const response = await fetch(`${API_URL}/api/ops/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_count: batchCount }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to rollback batches.");
  }
  return response.json() as Promise<{ success?: boolean; message?: string }>;
}
