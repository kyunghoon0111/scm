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

export interface UploadHistoryItem {
  batch_id: number;
  file_name: string;
  file_hash: string;
  table_name: string | null;
  row_count: number;
  status: string;
  error_msg: string | null;
  processed_at: string | null;
  batch_started_at: string | null;
  batch_finished_at: string | null;
  batch_status: string | null;
  batch_file_count: number | null;
  batch_rows_ingested: number | null;
}

export interface UploadHistoryResponse {
  items: UploadHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UploadHistoryParams {
  limit?: number;
  offset?: number;
  status?: string;
  table_name?: string;
  date_from?: string;
  date_to?: string;
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

export async function fetchUploadHistory(params: UploadHistoryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  if (params.status) searchParams.set("status", params.status);
  if (params.table_name) searchParams.set("table_name", params.table_name);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  const qs = searchParams.toString();
  const response = await fetch(`${API_URL}/api/ops/upload-history${qs ? `?${qs}` : ""}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch upload history.");
  }
  return response.json() as Promise<UploadHistoryResponse>;
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
