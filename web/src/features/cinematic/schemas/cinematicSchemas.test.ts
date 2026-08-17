import { describe, expect, it } from 'vitest';
import {
  cinematicLifecycleEventSchema,
  cinematicVideoCapabilitySchema
} from './cinematicSchemas';

describe('Cinematic C1 contracts', () => {
  it('keeps provider candidates disabled until qualification', () => {
    expect(() => cinematicVideoCapabilitySchema.parse({
      providerId: 'veo',
      modelId: 'candidate',
      displayName: 'Candidate',
      resolutions: ['720p'],
      aspectRatios: ['9:16'],
      durationsSeconds: [8],
      audioModes: ['none'],
      paidRoutingEnabled: true
    })).toThrow();
  });

  it('requires a correlation chain before lifecycle events are accepted', () => {
    const event = cinematicLifecycleEventSchema.parse({
      eventId: 'evt_1',
      requestId: 'req_1',
      correlationId: 'corr_1',
      actorId: 'usr_alice',
      projectId: null,
      sceneId: null,
      shotId: null,
      attemptId: null,
      generationGroupId: null,
      jobId: null,
      providerOperationId: null,
      providerTaskId: null,
      quoteId: null,
      reservationId: null,
      settlementId: null,
      assetId: null,
      exportId: null,
      supportCaseId: null,
      supportCommandId: null,
      eventType: 'cinematic.draft.saved',
      occurredAt: '2026-08-17T00:00:00.000Z'
    });
    expect(event.correlationId).toBe('corr_1');
  });
});
