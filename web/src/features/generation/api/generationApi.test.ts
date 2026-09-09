import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  estimateAndSubmitGeneration,
  generationPayload,
  getJobStatus,
  pricingPayload,
  submitGeneration,
  type GenerationRequestDraft
} from './generationApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

function draft(overrides: Partial<GenerationRequestDraft> = {}): GenerationRequestDraft {
  return {
    provider: 'gemini',
    submodel: 'gemini-test',
    prompt: 'Editorial portrait',
    negativePrompt: 'watermark',
    aspectRatio: '6:8',
    imageResolution: '1K',
    outputCount: 1,
    generationMode: 'headshot',
    generationSurface: 'studio',
    references: {},
    authoringMode: 'manual',
    characterType: null,
    ...overrides
  };
}

describe('React generation contract', () => {
  it('preserves an explicit image request ID for uncertain Look Sheet submission replay', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ jobId: 'same-job', status: 'queued' }), { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await submitGeneration(draft(), 'locked-estimate', 'gen-replay');
    await submitGeneration(draft(), 'locked-estimate', 'gen-replay');
    for (const call of fetchMock.mock.calls) {
      expect(JSON.parse(call[1].body)).toMatchObject({ requestId: 'gen-replay', estimateId: 'locked-estimate' });
    }
  });
  it('carries the Cinematic capture profile without changing pricing parameters', () => {
    const request = draft({
      generationMode: 'scene',
      generationSurface: 'cinematic',
      cinematicCaptureProfileId: 'photorealistic-cinematic'
    });
    expect(generationPayload(request).cinematicCaptureProfileId).toBe('photorealistic-cinematic');
    expect(pricingPayload(request)).not.toHaveProperty('cinematicCaptureProfileId');
  });

  it('bypasses browser cache while polling mutable job status', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.cache).toBe('no-store');
      return new Response(JSON.stringify({
        id: 'job_failed',
        status: 'failed',
        error: { code: 'provider_error', message: 'Internal error encountered.' }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const status = await getJobStatus('job_failed');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(status.status).toBe('failed');
  });

  it('maps every explicit reference role to the canonical request fields', () => {
    const payload = generationPayload(draft({
      references: {
        face_reference: '/outputs/face.png',
        style_reference: '/outputs/style.png',
        pose_reference: '/outputs/pose.png',
        outfit_front: '/outputs/front.png',
        outfit_back: '/outputs/back.png'
      }
    }));

    expect(payload.imageReferences).toMatchObject({
      faceMatch: true,
      characterReference: false,
      styleMatch: true,
      poseMatch: true,
      outfitReference: true
    });
    expect(payload.faceReferenceImageA).toBe('/outputs/face.png');
    expect(payload.styleReferenceImageA).toBe('/outputs/style.png');
    expect(payload.styleReferenceImageB).toBe('/outputs/pose.png');
    expect(payload.outfitReferenceImageFront).toBe('/outputs/front.png');
    expect(payload.outfitReferenceImageBack).toBe('/outputs/back.png');
  });

  it('keeps estimate inputs aligned with the submitted provider and output settings', () => {
    const input = draft({
      aspectRatio: '1:1',
      imageResolution: '2K',
      outputCount: 2,
      references: { character_reference: '/outputs/character.png' }
    });
    const estimate = pricingPayload(input);
    const payload = generationPayload(input, { estimateId: 'est_1', requestId: 'req_1' });

    expect(estimate.requestedProviderId).toBe(payload.provider);
    expect(estimate.requestedModelId).toBe(payload.submodel);
    expect(estimate.resolution).toBe(payload.imageResolution);
    expect(estimate.aspectRatio).toBe(payload.aspectRatio);
    expect(estimate.outputCount).toBe(payload.outputCount);
    expect(estimate.referenceCount).toBe(1);
    expect(payload.estimateId).toBe('est_1');
  });

  it('locks a fresh estimate from the same draft snapshot submitted for generation', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        body: JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
      });
      const payload = url.endsWith('/api/credits/estimate')
        ? {
          estimate: {
            estimateId: 'est_fresh',
            estimatedCredits: 46,
            expiresAt: '2099-01-01T00:00:00.000Z'
          },
          account: { availableCredits: 98, canAfford: true }
        }
        : {
          jobId: 'job_fresh',
          status: 'queued',
          providerStreaming: false
        };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }));

    const latestDraft = draft({
      generationMode: 'scene',
      selections: {
        'Pose Intent': {
          id: 'pose.fashion.back-garment-view',
          value: 'back garment view',
          group: 'Pose'
        }
      },
      references: { character_reference: '/outputs/character-three-view.jpg' }
    });

    const response = await estimateAndSubmitGeneration(latestDraft);

    expect(response.jobId).toBe('job_fresh');
    expect(requests).toHaveLength(2);
    const estimateBody = requests[0]?.body;
    const submitBody = requests[1]?.body;
    expect(estimateBody?.generationRequest).toMatchObject({
      selections: latestDraft.selections,
      characterReferenceImageA: '/outputs/character-three-view.jpg'
    });
    expect(submitBody).toMatchObject({
      estimateId: 'est_fresh',
      selections: latestDraft.selections,
      characterReferenceImageA: '/outputs/character-three-view.jpg'
    });
  });

  it('preserves headshot and character-sheet generation modes', () => {
    const headshot = generationPayload(draft());
    expect(headshot.generationMode).toBe('headshot');
    expect(headshot.mode).toBe('headshot');
    const characterSheet = generationPayload(draft({
      generationMode: 'character-sheet',
      characterType: 'reusable_model'
    }));
    expect(characterSheet.mode).toBe('character-sheet');
    expect(characterSheet.characterType).toBe('reusable_model');
  });

  it('forwards custom hair and garment colors to the canonical compiler', () => {
    const payload = generationPayload(draft({
      customColors: {
        Color: {
          enabled: true,
          base: '#3a2418',
          highlightEnabled: true,
          highlight: '#c99662'
        },
        'Primary Color': { enabled: true, color: '#1f2937' },
        'Secondary Color': { enabled: true, color: '#f8fafc' }
      }
    }));

    expect(payload.customColors).toMatchObject({
      Color: { base: '#3a2418', highlight: '#c99662' },
      'Primary Color': { color: '#1f2937' },
      'Secondary Color': { color: '#f8fafc' }
    });
  });

  it('keeps Scene, Playground and Fashion on the normal prompt compiler', () => {
    for (const generationMode of ['scene', 'playground', 'fashion'] as const) {
      expect(generationPayload(draft({ generationMode })).mode).toBe('normal');
    }
  });

  it('keeps Additional Direction separate from the guided prompt snapshot', () => {
    const payload = generationPayload(draft({
      authoringMode: 'guided',
      additionalDirection: 'subtle natural asymmetry'
    }));

    expect(payload.additionalDirection).toBe('subtle natural asymmetry');
    expect(payload.sceneBuilder.manualPromptText).toBe('');
  });

  it('submits the explicit prompt refinement preference without changing pricing inputs', () => {
    const input = draft({ promptRefinementEnabled: true });
    expect(generationPayload(input).promptRefinement).toEqual({ enabled: true });
    expect(pricingPayload(input)).not.toHaveProperty('promptRefinement');
  });

  it('carries reusable and styled Character Reference outfit behavior', () => {
    expect(generationPayload(draft({
      generationMode: 'scene',
      references: { character_reference: '/outputs/reusable-character.png' },
      characterReferenceOutfitBehavior: 'replaceable'
    })).characterReferenceOutfitBehavior).toBe('replaceable');

    expect(generationPayload(draft({
      generationMode: 'scene',
      references: { character_reference: '/outputs/styled-character.png' }
    })).characterReferenceOutfitBehavior).toBe('preserve');
  });
});
