import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequestWithProgress } from './apiClient';

describe('apiRequestWithProgress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses bounded progress events and the final schema-validated result', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
        controller.enqueue(encoder.encode('event: progress\r\ndata: {"stage":"plan_generation"}\r\n'));
        controller.enqueue(encoder.encode('\r\nevent: result\ndata: {"id":"proposal_1"}\n\n'));
        controller.close();
      }
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const progress: string[] = [];

    const result = await apiRequestWithProgress('/api/test-progress', {
      method: 'POST',
      body: { mode: 'generate' },
      schema: z.object({ id: z.string() }),
      progressSchema: z.object({ stage: z.string() }),
      onProgress: event => progress.push(event.stage)
    });

    expect(progress).toEqual(['plan_generation']);
    expect(result).toEqual({ id: 'proposal_1' });
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('accept')).toBe('text/event-stream');
  });

  it('turns a streamed server error into the standard ApiError contract', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          'event: error\ndata: {"status":429,"error":{"code":"quota","message":"Try later"}}\n\n'
        ));
        controller.close();
      }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    })));

    await expect(apiRequestWithProgress('/api/test-progress', {
      method: 'POST',
      schema: z.object({ id: z.string() }),
      progressSchema: z.object({ stage: z.string() }),
      onProgress: () => undefined
    })).rejects.toMatchObject({ status: 429, code: 'quota', message: 'Try later' });
  });
});
