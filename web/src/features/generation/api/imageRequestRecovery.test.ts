import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/apiClient';
import { getImageRequestStatus } from './generationApi';
import { imageRequestStatusSchema } from '../schemas/generationSchemas';

vi.mock('../../../lib/api/apiClient', () => ({ apiRequest: vi.fn() }));

describe('Image request recovery contract', () => {
  it('uses canonical credentialed transport with encoded identity, cancellation and no-store', () => {
    const signal = new AbortController().signal;
    getImageRequestStatus('request:1', signal);
    expect(apiRequest).toHaveBeenCalledWith('/api/generation/requests/request%3A1', {
      schema: imageRequestStatusSchema, signal, cache: 'no-store'
    });
  });

  it('validates found, unknown and reconciliation responses without accepting malformed IDs or unbounded groups', () => {
    for (const state of ['unknown', 'reconciliation_required']) {
      expect(imageRequestStatusSchema.parse({ state, requestId: 'request_1' }).state).toBe(state);
    }
    expect(imageRequestStatusSchema.parse({ state: 'found', requestId: 'request_1',
      jobId: 'job_1', groupId: null }).state).toBe('found');
    for (const response of [
      { state: 'queued', requestId: 'request_1' },
      { state: 'unknown', requestId: '../private' },
      { state: 'unknown', requestId: 'x'.repeat(161) },
      { state: 'found', requestId: 'request_1', jobId: 'job_1' },
      { state: 'found', requestId: 'request_1', jobId: 'job_1', groupId: 'group_1', childJobIds: Array(5).fill('job_1') }
    ]) expect(imageRequestStatusSchema.safeParse(response).success).toBe(false);
  });
});
