import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiMediaBlob, apiRequest, apiRequestWithProgress } from './apiClient';
import { beginIdentityResolution, beginIdentityRevalidation, finishIdentityRevalidation, publishIdentity, getIdentitySnapshot } from '../auth/actorStore';

beforeEach(() => {
  const epoch = beginIdentityResolution();
  publishIdentity(epoch, { actorId: 'account_fixture', authMode: 'session', csrfToken: 'fixture-csrf' });
});

describe('apiRequestWithProgress', () => {
  it.each(['json', 'media', 'progress'])('invalidates a private401 during background checking immediately: %s', async kind => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const listener = vi.fn();
    window.addEventListener('mpf:identity-invalidated', listener);
    try {
      const pending = kind === 'json' ? apiRequest('/api/private') : kind === 'media'
        ? apiMediaBlob('/outputs/private.png') : apiRequestWithProgress('/api/stream', {
          method: 'POST', schema: z.object({ ok: z.boolean() }), progressSchema: z.object({ stage: z.string() }), onProgress: () => undefined
        });
      const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const token = beginIdentityRevalidation();
      finish(new Response('{"error":{"code":"auth_session_expired","message":"Expired"}}', {
        status: 401, headers: { 'content-type': 'application/json' }
      }));
      await rejected;
      expect(listener).toHaveBeenCalledTimes(1);
      expect(getIdentitySnapshot().ready).toBe(false);
      finishIdentityRevalidation(token);
    } finally { window.removeEventListener('mpf:identity-invalidated', listener); }
  });

  it('holds new private reads, media and mutations during a same-session check without replaying them', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"ok":true}', {
      headers: { 'content-type': 'application/json' }
    })));
    vi.stubGlobal('fetch', fetchMock);
    const epoch = getIdentitySnapshot().epoch;
    const token = beginIdentityRevalidation();
    const json = apiRequest('/api/private');
    const media = apiMediaBlob('/outputs/private.png');
    const mutation = apiRequest('/api/private', { method: 'POST', body: {} });
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    await apiRequest('/api/me');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finishIdentityRevalidation(token);
    await Promise.all([json, media, mutation]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(getIdentitySnapshot().epoch).toBe(epoch);
  });

  it('never dispatches waiting mutations after identity changes or caller cancellation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    let token = beginIdentityRevalidation();
    const pending = apiRequest('/api/private', { method: 'POST', body: {} });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const epoch = beginIdentityResolution();
    publishIdentity(epoch, { actorId: 'another', authMode: 'session', csrfToken: 'new' });
    finishIdentityRevalidation(token);
    await rejected;
    token = beginIdentityRevalidation();
    const controller = new AbortController();
    const cancelled = apiMediaBlob('/outputs/private.png', controller.signal);
    const aborted = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await aborted;
    finishIdentityRevalidation(token);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['json', 'blob'] as const)('holds decoded %s until identity is confirmed and rejects changed-session data', async kind => {
    let finish!: (value: never) => void;
    const response = new Response(null, { headers: { 'content-type': 'application/json' } });
    const decoder = vi.spyOn(response, kind).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const pending = kind === 'json' ? apiRequest('/api/private') : apiMediaBlob('/outputs/private.png');
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(decoder).toHaveBeenCalled());
    const token = beginIdentityRevalidation();
    finish((kind === 'json' ? { private: 'old' } : new Blob(['private'])) as never);
    let settled = false;
    void pending.then(() => { settled = true; }, () => { settled = true; });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(settled).toBe(false);
    beginIdentityResolution();
    finishIdentityRevalidation(token);
    await rejected;
  });

  it('pauses a stream between events during a focus check and resumes once without replay', async () => {
    let release!: symbol;
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('event: progress\ndata: {"stage":"first"}\n\nevent: progress\ndata: {"stage":"second"}\n\nevent: result\ndata: {"id":"done"}\n\n'));
      controller.close();
    } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': 'text/event-stream' } })));
    const events: string[] = [];
    const pending = apiRequestWithProgress('/api/stream', {
      method: 'POST', schema: z.object({ id: z.string() }), progressSchema: z.object({ stage: z.string() }),
      onProgress: event => { events.push(event.stage); if (event.stage === 'first') release = beginIdentityRevalidation(); }
    });
    await vi.waitFor(() => expect(events).toEqual(['first']));
    finishIdentityRevalidation(release);
    expect(await pending).toEqual({ id: 'done' });
    expect(events).toEqual(['first', 'second']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves authorized PNG/JPEG blobs and exposes response headers without changing JSON errors', async () => {
    for (const type of ['image/png', 'image/jpeg', 'application/zip']) {
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

  it('uses cookie credentials for JSON, progress and Blob, strips forged actors and attaches CSRF only to unsafe requests', async () => {
    localStorage.setItem('mpf_active_mock_user_id', 'admin');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"ok":true}', {
      headers: { 'content-type': 'application/json' }
    })));
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/api/test', { method: 'POST', body: {}, headers: { 'x-mpf-user-id': 'admin', 'x-csrf-token': 'forged' } });
    await apiRequestWithProgress('/api/test-progress', {
      method: 'POST', schema: z.object({ ok: z.boolean() }), progressSchema: z.object({ stage: z.string() }), onProgress: () => undefined
    });
    await apiMediaBlob('/api/media/fixture');
    for (const [index, call] of fetchMock.mock.calls.entries()) {
      expect(call[1].credentials).toBe('include');
      const headers = new Headers(call[1].headers);
      expect(headers.has('x-mpf-user-id')).toBe(false);
      expect(headers.get('x-csrf-token')).toBe(index < 2 ? 'fixture-csrf' : null);
    }
  });

  it('does not send an unsafe request before browser CSRF is resolved', async () => {
    beginIdentityResolution();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'auth_service_unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('suspends private reads and media until identity resolution completes', async () => {
    beginIdentityResolution();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest('/api/me/preferences')).rejects.toMatchObject({ code: 'auth_service_unavailable' });
    await expect(apiMediaBlob('/api/private/image')).rejects.toMatchObject({ code: 'auth_service_unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retains resolved guest identity for credential rejection while private401 still invalidates', async () => {
    const invalidated = vi.fn();
    window.addEventListener('mpf:identity-invalidated', invalidated);
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"code":"auth_invalid_credentials"}', { status: 401, headers: { 'content-type': 'application/json' } }))
        .mockResolvedValueOnce(new Response('{"code":"auth_session_expired"}', { status: 401, headers: { 'content-type': 'application/json' } })));
      await expect(apiRequest('/api/auth/login', { method: 'POST', body: { email: 'fixture@example.invalid', password: 'wrong' } })).rejects.toMatchObject({ code: 'auth_invalid_credentials' });
      expect(invalidated).not.toHaveBeenCalled();
      await expect(apiRequest('/api/me/preferences')).rejects.toMatchObject({ code: 'auth_session_expired' });
      expect(invalidated).toHaveBeenCalledOnce();
    } finally { window.removeEventListener('mpf:identity-invalidated', invalidated); }
  });

  it('discards JSON and Blob bodies that finish after an identity transition even when fetch ignores abort', async () => {
    for (const kind of ['json', 'blob'] as const) {
      const response = new Response(null, { headers: { 'content-type': 'application/json' } });
      let finish!: (value: never) => void;
      const decoder = vi.spyOn(response, kind).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const epoch = beginIdentityResolution();
      publishIdentity(epoch, { actorId: 'old_actor', authMode: 'session', csrfToken: 'old-csrf' });
      const pending = kind === 'json' ? apiRequest('/api/private') : apiMediaBlob('/api/private');
      const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      await vi.waitFor(() => expect(decoder).toHaveBeenCalled());
      beginIdentityResolution();
      finish((kind === 'json' ? { private: 'old' } : new Blob(['old'])) as never);
      await rejected;
    }
  });

  it('ignores remaining progress/result events after identity changes in the same stream chunk', async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('event: progress\ndata: {"stage":"first"}\n\nevent: progress\ndata: {"stage":"old"}\n\nevent: result\ndata: {"id":"old"}\n\n'));
      controller.close();
    } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': 'text/event-stream' } })));
    const progress: string[] = [];
    await expect(apiRequestWithProgress('/api/stream', {
      schema: z.object({ id: z.string() }), progressSchema: z.object({ stage: z.string() }),
      onProgress: event => { progress.push(event.stage); beginIdentityResolution(); }
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(progress).toEqual(['first']);
  });
});
