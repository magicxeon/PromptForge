import { isTerminalJobStatus, normalizeJobStatus } from './jobLifecycle';

export const pollingPolicy = {
  generationJob(status?: string | null) {
    return isTerminalJobStatus(status) ? false : 1_500;
  },
  comparison(active: boolean) {
    return active ? 1_500 : false;
  },
  fashionRun(status?: string | null) {
    return isTerminalJobStatus(status) ? false : 1_500;
  },
  templatePreparation(status?: string | null) {
    return ['pending', 'processing'].includes(normalizeJobStatus(status)) ? 2_500 : false;
  }
} as const;
