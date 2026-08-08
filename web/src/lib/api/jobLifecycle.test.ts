import { describe, expect, it } from 'vitest';
import {
  isActiveJobStatus,
  isFailedJobStatus,
  isTerminalJobStatus,
  normalizeJobStatus
} from './jobLifecycle';

describe('job lifecycle policy', () => {
  it('normalizes provider and transport status casing', () => {
    expect(normalizeJobStatus('  FAILED ')).toBe('failed');
  });

  it('treats failed and error jobs as terminal and inactive', () => {
    for (const status of ['failed', 'error', 'rejected', 'cancelled', 'expired']) {
      expect(isTerminalJobStatus(status)).toBe(true);
      expect(isFailedJobStatus(status)).toBe(true);
      expect(isActiveJobStatus(status)).toBe(false);
    }
  });

  it('keeps queued and processing jobs active', () => {
    for (const status of ['queued', 'processing', 'generating']) {
      expect(isActiveJobStatus(status)).toBe(true);
      expect(isTerminalJobStatus(status)).toBe(false);
    }
  });
});
