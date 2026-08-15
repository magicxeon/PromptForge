export const ACTIVE_JOB_STATUSES = new Set([
  'submitting',
  'pending',
  'queued',
  'processing',
  'streaming',
  'generating',
  'running'
]);

export const COMPLETE_JOB_STATUSES = new Set([
  'completed',
  'succeeded',
  'partial',
  'partially_completed'
]);

export const FAILED_JOB_STATUSES = new Set([
  'failed',
  'cancelled',
  'expired',
  'error',
  'rejected'
]);

export function normalizeJobStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}

export function isActiveJobStatus(status?: string | null) {
  return ACTIVE_JOB_STATUSES.has(normalizeJobStatus(status));
}

export function isCompletedJobStatus(status?: string | null) {
  return COMPLETE_JOB_STATUSES.has(normalizeJobStatus(status));
}

export function isFailedJobStatus(status?: string | null) {
  return FAILED_JOB_STATUSES.has(normalizeJobStatus(status));
}

export function isTerminalJobStatus(status?: string | null) {
  return isCompletedJobStatus(status) || isFailedJobStatus(status);
}
