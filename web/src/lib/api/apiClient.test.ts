import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest, apiRequestWithProgress } from './apiClient';

describe('apiRequestWithProgress', () => {
  it('preserves authorized PNG/JPEG blobs and exposes response headers without changing JSON errors', async () => {
    for (const type of ['image/png', 'image/jpeg']) {
      const response = new Response(null, { headers: { 'Content-Type': type, 'X-Momelo-Export': 'metadata' } });
      vi.spyOn(response, 'blob').mockResolvedValue(new Blob(['image'], { type }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const onResponseHeaders = vi.fn();
      const blob = await apiRequest('/api/media/exports', { responseType: 'blob', schema: z.instanceof(Blob), onResponseHeaders });
      expect(blob.type).toBe(type);
      expect(onResponseHeaders.mock.calls[0]![0].get('X-Momelo-Export')).toBe('metadata');
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'export_busy', message: 'Retry' } }), { status: 429, headers: { 'Content-Type': 'application/json' } })));
    await expect(apiRequest('/api/media/exports', { responseType: 'blob', schema: z.instanceof(Blob) })).rejects.toMatchObject({ code: 'export_busy', status: 429 });
  });
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
