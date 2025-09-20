import { api } from './api';

export type ActivityEvent = {
  id: string;
  timestamp: string;
  actor: { id: string | null; role: string; name?: string };
  verb: string;
  target: { type: string; id: string };
  context: Record<string, any>;
  source: string;
  hash: string;
};

export type ActivityListResponse = {
  results: ActivityEvent[];
  nextCursor: string | null;
  prevCursor: string | null;
  count: number;
};

export type ActivityFilters = Partial<{
  q: string;
  actor_id: string;
  actor_role: string;
  verb: string;
  target_type: string;
  target_id: string;
  source: string;
  severity: string;
  tags: string;
  since: string;
  until: string;
  tenant_id: string;
}>;

function toQuery(params: Record<string, string | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length > 0) usp.set(k, String(v));
  }
  return usp.toString();
}

export async function listActivityLogs(filters: ActivityFilters = {}, cursor?: string): Promise<ActivityListResponse> {
  const qs = toQuery({ ...filters, cursor });
  const path = qs ? `/api/activity-logs/?${qs}` : '/api/activity-logs/';
  return api.get<ActivityListResponse>(path);
}

export async function getActivityLog(id: string): Promise<ActivityEvent> {
  return api.get<ActivityEvent>(`/api/activity-logs/${id}`);
}

export async function getActivityTypes(): Promise<{ results: { key: string; description: string; role_scope: string[]; default_severity: string }[] }>{
  return api.get(`/api/activity-logs/types`);
}

export async function getActivityMetrics(): Promise<any> {
  return api.get(`/api/activity-logs/metrics`);
}

export async function startExport(format: 'CSV' | 'NDJSON', filters: ActivityFilters, fields?: string[]): Promise<{ jobId: number }>{
  return api.post(`/api/activity-logs/export`, { format, filters, fields });
}

export async function getExportStatus(id: number): Promise<{ id: number; format: string; status: string; file_path: string; started_at: string | null; finished_at: string | null; error: string; downloadUrl?: string }>{
  return api.get(`/api/activity-logs/exports/${id}`);
}
