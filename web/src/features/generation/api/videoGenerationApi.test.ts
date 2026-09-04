import { afterEach, describe, expect, it, vi } from 'vitest';
import { getVideoTask, listRecentVideoTasks, quoteVideoGeneration, submitVideoGeneration } from './videoGenerationApi';

afterEach(() => vi.unstubAllGlobals());

describe('videoGenerationApi', () => {
  it('keeps quote and submit parameters identical and sends the locked estimate', async () => {
    const payloads: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}'));
      payloads.push({ url, body });
      return new Response(JSON.stringify(url.endsWith('/quote') ? {
        estimate: { estimateId: 'vest_1', estimatedCredits: 80, expiresAt: new Date().toISOString(), breakdown: {} },
        account: { availableCredits: 100, canAfford: true }
      } : { id: 'videotask_1', status: 'provider_queued' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const request = { providerId: 'gemini', modelId: 'veo-lite', operation: 'text_to_video' as const, prompt: 'walk', aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'generated' as const };
    await quoteVideoGeneration(request);
    await submitVideoGeneration({ ...request, estimateId: 'vest_1', idempotencyKey: 'video-key-1' });
    expect(payloads[0]?.body.durationSeconds).toBe(payloads[1]?.body.durationSeconds);
    expect(payloads[1]?.body.estimateId).toBe('vest_1');
  });

  it('polls an actor-scoped task through the canonical video endpoint', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ id: 'videotask_1', status: 'completed', outputAsset: { publicUrl: '/outputs/video.mp4' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const task = await getVideoTask('videotask_1');
    expect(task.outputAsset?.publicUrl).toBe('/outputs/video.mp4');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/generation/video/tasks/videotask_1');
  });

  it('parses a legacy failed task whose persisted duration reconciliation omits catalog-only fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 'videotask_portrait',
      status: 'failed',
      billingStatus: 'refunded',
      providerId: 'modelark',
      modelId: 'dreamina-seedance-2-0-mini-260615',
      providerError: { code: 'InputImageSensitiveContentDetected.PrivacyInformation' },
      submittedRequest: {
        durationReconciliation: {
          plannedDurationSeconds: 6,
          renderDurationSeconds: 6,
          trimDurationSeconds: 0,
          durationControlMode: 'exact',
          strategy: 'exact',
          reasonCode: 'video_duration_exact'
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const task = await getVideoTask('videotask_portrait');

    expect(task.status).toBe('failed');
    expect(task.submittedRequest?.durationReconciliation?.supportedDurations).toEqual([]);
    expect(task.submittedRequest?.durationReconciliation?.requiresSplit).toBe(false);
  });

  it('loads recent actor-scoped Video tasks without using Image history', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      items: [{ id: 'videotask_recent', status: 'completed', outputAsset: { publicUrl: '/outputs/video.mp4' } }],
      hasMore: false
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await listRecentVideoTasks(6);
    expect(result.items[0]?.id).toBe('videotask_recent');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/generation/video/tasks?limit=6');
  });
});
