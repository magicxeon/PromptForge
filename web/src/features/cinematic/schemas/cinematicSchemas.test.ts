import { afterEach, describe, expect, it, vi } from 'vitest';
import { quoteCinematicVideoAttempt } from '../api/cinematicApi';
import {
  cinematicLifecycleEventSchema,
  cinematicStoryPlanProposalSchema,
  cinematicStoryPlanVersionSchema,
  cinematicStoryPlanDraftSchema,
  cinematicSceneDirectionProposalSchema,
  cinematicFilmReadinessSchema,
  cinematicVideoCapabilitySchema,
  cinematicVideoQuoteSchema
} from './cinematicSchemas';

describe('dialogueReview metadata', () => {
  it('survives every additive proposal, draft and saved-version boundary', () => {
    const review = {
      contractVersion: 'cinematic-dialogue-timing-v1',
      assessmentKind: 'deterministic_estimate_and_model_self_review', advisory: true,
      proposal: { measured: false, findings: [{ code: 'film_dialogue_estimated_overload' }] },
      afterAllocation: { status: 'needs_review' },
      final: { measured: false, status: 'needs_review', shots: [{ estimates: [{ minimumMs: 3000 }] }] },
      rounds: [{ round: 1, status: 'no_progress', changes: [] }], additionalBillableCalls: 0
    };
    for (const schema of [cinematicStoryPlanProposalSchema.pick({ dialogueReview: true }),
      cinematicStoryPlanVersionSchema.pick({ dialogueReview: true }),
      cinematicStoryPlanDraftSchema.pick({ dialogueReview: true }),
      cinematicSceneDirectionProposalSchema.pick({ dialogueReview: true })]) {
      expect(schema.parse({ dialogueReview: review })).toEqual({ dialogueReview: review });
      expect(schema.parse({})).toEqual({});
    }
    expect(cinematicFilmReadinessSchema.parse({ status: 'ready', dimensions: {}, findings: [],
      dialogueAssessment: review.final }).dialogueAssessment).toEqual(review.final);
  });
});

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

describe('Cinematic composition quote contracts', () => {
  afterEach(() => vi.unstubAllGlobals());

  const quoteFixture = (purpose = 'storyboard_composition') => ({
    estimate: { estimateId: 'estimate-1', estimatedCredits: 24, expiresAt: '2026-09-14T00:00:00Z', breakdown: {} },
    account: { availableCredits: 100, canAfford: true },
    requestFingerprint: 'request-1', projectId: 'project-1', sceneId: 'scene-1', shotId: 'shot-1', shotVersion: 1,
    sourceFingerprint: 'source-1', videoPacketFingerprint: 'packet-1', approvedStoryboardAssetVersionId: 'asset-1',
    referenceMode: 'storyboard_and_looks', renderedPrompt: 'Use Image 1 for composition and Image 2 for identity.',
    referenceSummary: [
      { imageNumber: 1, assetId: 'asset-1', purpose, roleName: null, lookName: null, previewUrl: '/board.png' },
      { imageNumber: 2, assetId: 'look-1', purpose: 'generated_look', roleName: 'Lalin', lookName: 'Florist', previewUrl: '/look.png' }
    ]
  });

  it.each(['storyboard_opening', 'sketch_composition', 'storyboard_composition', 'character_look', 'generated_look'])('accepts the complete quote with %s without losing ordered references', purpose => {
    const input = quoteFixture(purpose);
    expect(cinematicVideoQuoteSchema.parse(input)).toEqual(input);
  });

  it('continues rejecting unknown reference purposes', () => {
    expect(cinematicVideoQuoteSchema.safeParse(quoteFixture('unknown_reference')).success).toBe(false);
  });

  it('reads composition through the real quote API response boundary', async () => {
    const quote = quoteFixture();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(quote), {
      status: 200, headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await quoteCinematicVideoAttempt('project-1', 'scene-1', 'shot-1', {
      expectedVersion: 1, expectedShotVersion: 1, sourceFingerprint: 'source-1', videoPacketFingerprint: 'packet-1',
      providerId: 'modelark', modelId: 'seedance-test', referenceMode: 'storyboard_and_looks',
      prompt: quote.renderedPrompt, aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'generated'
    });
    expect(result).toEqual(quote);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toContain('/shots/shot-1/video-quote');
  });
});
