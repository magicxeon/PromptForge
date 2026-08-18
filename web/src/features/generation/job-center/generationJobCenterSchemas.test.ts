import { describe, expect, it } from 'vitest';
import { generationJobCenterSchema } from './generationJobCenterSchemas';

describe('generationJobCenterSchema', () => {
  it('accepts the sanitized projection contract', () => {
    const parsed = generationJobCenterSchema.parse({
      items: [{
        id: 'job_1', kind: 'image_job', mediaType: 'image', status: 'queued', terminal: false,
        createdAt: null, updatedAt: null, completedAt: null, providerId: null, modelId: null,
        resultUrl: null, thumbnailUrl: null, detailHref: null, resumeHref: '/create/playground',
        billingStatus: null, estimatedCredits: 10, progress: null, error: null
      }],
      activeCount: 1,
      terminalCount: 0,
      polledAt: '2026-08-18T10:00:00.000Z'
    });
    expect(parsed.items[0]?.id).toBe('job_1');
  });

  it('rejects unknown item kinds', () => {
    expect(() => generationJobCenterSchema.parse({
      items: [{ id: 'x', kind: 'secret_provider_task' }],
      activeCount: 0,
      terminalCount: 0,
      polledAt: 'now'
    })).toThrow();
  });
});
