const TERMINAL_JOB_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
  'partially_completed'
]);

export const pollingPolicy = {
  generationJob(status?: string | null) {
    return TERMINAL_JOB_STATUSES.has(status || '') ? false : 1_500;
  },
  comparison(active: boolean) {
    return active ? 1_500 : false;
  },
  fashionRun(status?: string | null) {
    return TERMINAL_JOB_STATUSES.has(status || '') ? false : 1_500;
  },
  templatePreparation(status?: string | null) {
    return ['pending', 'processing'].includes(status || '') ? 2_500 : false;
  }
} as const;
