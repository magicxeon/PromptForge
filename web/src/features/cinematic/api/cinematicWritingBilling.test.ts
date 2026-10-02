import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '../../../lib/api/apiError';
import { webcrypto } from 'node:crypto';
import { CinematicWritingCancelled, cinematicWritingQuoteSchema, registerCinematicWritingConsent, withCinematicWritingConsentScope, withCinematicWritingQuote } from './cinematicWritingBilling';

const state = vi.hoisted(() => ({ actor: 'writer', request: vi.fn() }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => state.actor }));
vi.mock('../../../lib/api/apiClient', () => ({ apiRequest: (...args: unknown[]) => state.request(...args) }));
vi.mock('../../../lib/i18n/i18n', () => ({ i18n: { t: (key: string) => key } }));
const quote = () => ({ id: 'cw_one', operation: 'chapters' as const, credits: 35, billingStatus: 'paid' as const, expiresAt: new Date(Date.now() + 60000).toISOString() });
let unregister: (() => void) | undefined;
beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); state.actor = 'writer'; state.request.mockReset().mockResolvedValue(quote()); });
afterEach(() => { unregister?.(); unregister = undefined; });

describe('Cinematic writing authorization', () => {
  it.each(['paid', 'free', 'settlement_pending'] as const)('notifies only verified settlement after execution (%s)', async billingStatus => {
    const onSettled = vi.fn().mockResolvedValue(undefined);
    unregister = registerCinematicWritingConsent(async () => true, { onSettled });
    const result = { billingStatus };
    expect(await withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, async () => result)).toEqual(result);
    if (billingStatus === 'settlement_pending') expect(onSettled).not.toHaveBeenCalled();
    else expect(onSettled).toHaveBeenCalledExactlyOnceWith({ actorId: 'writer', operationId: 'cw_one', status: billingStatus === 'free' ? 'refunded' : 'succeeded' });
  });
  it.each(['succeeded', 'failed', 'delivered', 'dispatching', 'refund_pending'] as const)('notifies wallet recovery only for confirmed terminal receipt (%s)', async status => {
    const onSettled = vi.fn().mockResolvedValue(undefined);
    unregister = registerCinematicWritingConsent(async () => true, { onSettled });
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status, result: ['succeeded', 'delivered'].includes(status) ? { story: 'Recovered' } : undefined });
    const options = { projectId: 'p', operation: 'chapters' as const, input: {}, resultSchema: z.object({ story: z.string() }) };
    const execute = vi.fn().mockRejectedValue(new TypeError('Lost response'));
    if (['succeeded', 'delivered'].includes(status)) expect(await withCinematicWritingQuote(options, execute)).toEqual({ story: 'Recovered' });
    else await expect(withCinematicWritingQuote(options, execute)).rejects.toThrow(status === 'failed' ? 'failed' : 'pending');
    if (status === 'succeeded' || status === 'failed') expect(onSettled).toHaveBeenCalledExactlyOnceWith({ actorId: 'writer', operationId: 'cw_one', status });
    else expect(onSettled).not.toHaveBeenCalled();
  });
  it('does not retry execution or discard its result when wallet refresh fails', async () => {
    const onSettled = vi.fn().mockRejectedValue(new Error('Refresh offline'));
    unregister = registerCinematicWritingConsent(async () => true, { onSettled });
    const execute = vi.fn().mockResolvedValue({ billingStatus: 'paid', story: 'Delivered' });
    expect(await withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).toEqual({ billingStatus: 'paid', story: 'Delivered' });
    expect(execute).toHaveBeenCalledOnce(); expect(state.request).toHaveBeenCalledOnce(); expect(onSettled).toHaveBeenCalledOnce();
  });
  it('does not invalidate on free Full Story or cancelled paid consent', async () => {
    const onSettled = vi.fn();
    unregister = registerCinematicWritingConsent(async () => false, { onSettled });
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, vi.fn())).rejects.toBeInstanceOf(CinematicWritingCancelled);
    state.request.mockResolvedValue({ id: null, operation: 'full_story', credits: 0, billingStatus: 'free', expiresAt: null });
    await withCinematicWritingQuote({ projectId: 'p', operation: 'full_story', input: {} }, async () => ({ billingStatus: 'free' }));
    expect(onSettled).not.toHaveBeenCalled();
  });
  it('accepts the nullable free contract and requires a priced paid quote', () => {
    expect(cinematicWritingQuoteSchema.parse({ id: null, operation: 'full_story', credits: 0, expiresAt: null, billingStatus: 'free' }).id).toBeNull();
    expect(cinematicWritingQuoteSchema.safeParse({ ...quote(), id: null }).success).toBe(false);
    expect(cinematicWritingQuoteSchema.safeParse({ ...quote(), credits: 0 }).success).toBe(false);
  });
  it('binds an immutable exact input to a mandatory scoped consent and execution', async () => {
    const consent = vi.fn().mockResolvedValue(true), execute = vi.fn().mockResolvedValue('result');
    unregister = registerCinematicWritingConsent(consent);
    const input = { scope: 'all', expectedVersion: 4, instruction: 'Keep the ending' };
    let pending!: Promise<string>;
    withCinematicWritingConsentScope({ title: 'All Chapters', scope: 'Three Chapters' }, () => {
      pending = withCinematicWritingQuote({ projectId: 'p/1', operation: 'chapters', input, mandatory: true }, execute);
    });
    input.instruction = 'Changed';
    expect(await pending).toBe('result');
    expect(state.request).toHaveBeenCalledWith('/api/cinematic/projects/p%2F1/writing/quotes', expect.objectContaining({ body: {
      operation: 'chapters', input: { scope: 'all', expectedVersion: 4, instruction: 'Keep the ending' }
    } }));
    expect(consent).toHaveBeenCalledWith(expect.objectContaining({ mandatory: true, title: 'All Chapters', scope: 'Three Chapters' }));
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith({ scope: 'all', expectedVersion: 4, instruction: 'Keep the ending', writingQuoteId: 'cw_one' });
  });
  it('never dispatches cancelled or unhosted paid requests', async () => {
    const execute = vi.fn();
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toThrow('consentUnavailable');
    unregister = registerCinematicWritingConsent(async () => false);
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(['actor', 'route', 'expiry'] as const)('invalidates consent after %s changes', async change => {
    const execute = vi.fn();
    unregister = registerCinematicWritingConsent(async ({ quote: offered }) => {
      if (change === 'actor') state.actor = 'other';
      if (change === 'route') unregister?.();
      if (change === 'expiry') offered.expiresAt = new Date(0).toISOString();
      return true;
    });
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects expired, mismatched and pending quotes without dispatch', async () => {
    const execute = vi.fn(), consent = vi.fn(); unregister = registerCinematicWritingConsent(consent);
    for (const response of [{ ...quote(), expiresAt: new Date(0).toISOString() }, { ...quote(), operation: 'shots' }, { ...quote(), billingStatus: 'pending' }]) {
      state.request.mockResolvedValueOnce(response);
      await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toThrow();
    }
    expect(consent).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
  });
  it('quotes free Full Story but dispatches without priced consent or a null ID', async () => {
    state.request.mockResolvedValue({ id: null, operation: 'full_story', credits: 0, billingStatus: 'free', expiresAt: null });
    const execute = vi.fn().mockResolvedValue('story');
    expect(await withCinematicWritingQuote({ projectId: 'p', operation: 'full_story', input: { expectedVersion: 1 } }, execute)).toBe('story');
    expect(execute).toHaveBeenCalledWith({ expectedVersion: 1 });
  });
  it('quotes Brief without a project and preserves the original request', async () => {
    state.request.mockResolvedValue({ ...quote(), operation: 'brief' });
    unregister = registerCinematicWritingConsent(async () => true);
    const execute = vi.fn().mockResolvedValue('brief');
    await withCinematicWritingQuote({ projectId: null, operation: 'brief', input: { purpose: 'roles', storyBrief: 'Story' } }, execute);
    expect(state.request).toHaveBeenCalledWith('/api/cinematic/writing/quotes', expect.objectContaining({ body: { operation: 'brief', input: { purpose: 'roles', storyBrief: 'Story' } } }));
    expect(execute).toHaveBeenCalledWith({ purpose: 'roles', storyBrief: 'Story', writingQuoteId: 'cw_one' });
  });
  it('prevents concurrent requests while consent is unresolved', async () => {
    let accept!: (value: boolean) => void;
    unregister = registerCinematicWritingConsent(() => new Promise(resolve => { accept = resolve; }));
    const execute = vi.fn();
    const pending = withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute);
    await vi.waitFor(() => expect(accept).toBeDefined());
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toThrow('busy');
    accept(true); await pending;
    expect(state.request).toHaveBeenCalledOnce(); expect(execute).toHaveBeenCalledOnce();
  });
  it.each(['succeeded', 'dispatching'])('reads the accepted receipt on 409 without repeating AI (%s)', async status => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValueOnce({ ...quote(), status, result: status === 'succeeded' ? { story: 'Recovered' } : undefined });
    const execute = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'cinematic_writing_processing', message: 'Processing', details: { operationId: 'cw_one' } }));
    const pending = withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {}, resultSchema: z.object({ story: z.string() }) }, execute);
    if (status === 'succeeded') expect(await pending).toEqual({ story: 'Recovered' });
    else await expect(pending).rejects.toThrow('pending');
    expect(state.request).toHaveBeenLastCalledWith('/api/cinematic/projects/p/writing/operations/cw_one', expect.objectContaining({ cache: 'no-store' }));
    expect(execute).toHaveBeenCalledOnce();
  });
  it.each([new TypeError('Failed to fetch'), new ApiError({ status: 502, message: 'Proxy failed' })])('recovers a lost POST response with its known quote ID (%s)', async error => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValueOnce({ ...quote(), status: 'succeeded', result: { story: 'Recovered' } });
    const execute = vi.fn().mockRejectedValue(error);
    expect(await withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: { instruction: 'Private text' }, resultSchema: z.object({ story: z.string() }) }, execute)).toEqual({ story: 'Recovered' });
    expect(state.request).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledOnce();
    expect(state.request).toHaveBeenLastCalledWith('/api/cinematic/projects/p/writing/operations/cw_one', expect.any(Object));
  });
  it('persists only an actor/request receipt and recovers after a reload without a new quote', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockRejectedValueOnce(new TypeError('Status offline'));
    const input = { instruction: 'Private story text', expectedVersion: 5 };
    const execute = vi.fn().mockRejectedValue(new TypeError('POST response lost'));
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input, resultSchema: z.object({ story: z.string() }) }, execute)).rejects.toThrow('Status offline');
    const stored = localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')!;
    expect(stored).toContain('cw_one'); expect(stored).not.toContain('Private story text'); expect(stored).not.toContain('instruction');
    vi.resetModules();
    const resumed = await import('./cinematicWritingBilling');
    const release = resumed.registerCinematicWritingConsent(async () => true);
    state.request.mockReset().mockResolvedValue({ ...quote(), status: 'succeeded', result: { story: 'Recovered after reload' } });
    const retry = vi.fn();
    try {
      expect(await resumed.withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input, resultSchema: z.object({ story: z.string() }) }, retry)).toEqual({ story: 'Recovered after reload' });
      expect(retry).not.toHaveBeenCalled(); expect(state.request).toHaveBeenCalledOnce();
      expect(state.request.mock.calls[0]?.[0]).toContain('/operations/cw_one');
    } finally { release(); }
  });
  it('blocks a fresh quote while an earlier accepted request is unresolved, including changed inputs', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status: 'dispatching' });
    const execute = vi.fn().mockRejectedValue(new TypeError('POST response lost'));
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: { instruction: 'One' }, resultSchema: z.object({ story: z.string() }) }, execute)).rejects.toThrow('pending');
    const retry = vi.fn();
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: { instruction: 'Two' }, resultSchema: z.object({ story: z.string() }) }, retry)).rejects.toThrow('pending');
    expect(retry).not.toHaveBeenCalled(); expect(execute).toHaveBeenCalledOnce();
    expect(state.request.mock.calls.filter(call => String(call[0]).endsWith('/quotes'))).toHaveLength(1);
  });
  it('accepts a delivered settlement-pending result and retains its recovery ID', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status: 'delivered', result: { story: 'Usable', billingStatus: 'settlement_pending' } });
    const execute = vi.fn().mockRejectedValue(new TypeError('POST response lost'));
    expect(await withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {}, resultSchema: z.object({ story: z.string(), billingStatus: z.literal('settlement_pending') }) }, execute)).toEqual({ story: 'Usable', billingStatus: 'settlement_pending' });
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).toContain('cw_one');
  });
  it('fails closed before POST when browser receipt storage cannot be written', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const execute = vi.fn();
    try {
      await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {} }, execute)).rejects.toThrow('storageUnavailable');
      expect(execute).not.toHaveBeenCalled();
    } finally { write.mockRestore(); }
  });
  it('keeps recovery receipts isolated when the active actor changes', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockRejectedValueOnce(new TypeError('Status offline'));
    const execute = vi.fn().mockRejectedValue(new TypeError('POST response lost'));
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {}, resultSchema: z.object({ story: z.string() }) }, execute)).rejects.toThrow();
    state.actor = 'other'; state.request.mockReset().mockResolvedValue(quote());
    const second = vi.fn().mockResolvedValue({ story: 'Other actor result' });
    await withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {}, resultSchema: z.object({ story: z.string() }) }, second);
    expect(state.request).toHaveBeenCalledOnce();
    expect(state.request.mock.calls[0]?.[0]).toContain('/quotes');
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).toContain('cw_one');
    expect(second).toHaveBeenCalledOnce();
  });
  it('reuses an unaccepted quote after a proxy failure instead of creating a fresh quote', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValue(quote());
    const execute = vi.fn().mockRejectedValueOnce(new TypeError('Proxy response lost')).mockResolvedValue({ story: 'Result' });
    const options = { projectId: 'p', operation: 'chapters' as const, input: { expectedVersion: 1 }, resultSchema: z.object({ story: z.string() }) };
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status: 'quoted' });
    await expect(withCinematicWritingQuote(options, execute)).rejects.toThrow('pending');
    expect(await withCinematicWritingQuote(options, execute)).toEqual({ story: 'Result' });
    expect(execute).toHaveBeenLastCalledWith({ expectedVersion: 1, writingQuoteId: 'cw_one' });
    expect(state.request.mock.calls.filter(call => String(call[0]).endsWith('/quotes'))).toHaveLength(1);
  });
  it('releases a definitively source-stale quote only after its status is verified as unaccepted', async () => {
    unregister = registerCinematicWritingConsent(async () => true);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status: 'quoted' });
    const execute = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'enhancement_stale', message: 'Source changed' }));
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: {}, resultSchema: z.object({ story: z.string() }) }, execute)).rejects.toThrow('expired');
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).not.toContain('cw_one');
  });
  it.each(['succeeded', 'delivered'] as const)('offers explicit previous-result recovery after reload with a changed project version (%s)', async status => {
    const consent = vi.fn().mockResolvedValue(true);
    unregister = registerCinematicWritingConsent(consent);
    state.request.mockResolvedValueOnce(quote()).mockRejectedValueOnce(new TypeError('Status offline'));
    const execute = vi.fn().mockRejectedValue(new TypeError('POST response lost'));
    const schema = z.object({ story: z.string(), billingStatus: z.string() });
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'chapters', input: { expectedVersion: 1 }, resultSchema: schema }, execute)).rejects.toThrow();
    consent.mockReset().mockResolvedValueOnce(false).mockResolvedValue(true);
    state.request.mockReset().mockResolvedValue({ ...quote(), expiresAt: new Date(0).toISOString(), artifactExpiresAt: new Date(Date.now() + 86400000).toISOString(), status,
      result: { story: 'Previous result', billingStatus: status === 'delivered' ? 'settlement_pending' : 'paid' } });
    const retry = vi.fn(), options = { projectId: 'p', operation: 'chapters' as const, input: { expectedVersion: 2 }, resultSchema: schema };
    await expect(withCinematicWritingQuote(options, retry)).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).toContain('cw_one');
    await expect(withCinematicWritingQuote(options, retry)).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(consent).toHaveBeenLastCalledWith(expect.objectContaining({ mandatory: true, recovery: { status, artifactExpiresAt: expect.any(String), result: { story: 'Previous result', billingStatus: status === 'delivered' ? 'settlement_pending' : 'paid' } }, quote: expect.objectContaining({ id: 'cw_one' }) }));
    expect(retry).not.toHaveBeenCalled();
    expect(state.request.mock.calls.every(call => String(call[0]).includes('/operations/cw_one'))).toBe(true);
    if (status === 'succeeded') {
      state.request.mockReset().mockResolvedValue(quote()); retry.mockResolvedValue({ story: 'New result', billingStatus: 'paid' });
      expect(await withCinematicWritingQuote(options, retry)).toEqual({ story: 'New result', billingStatus: 'paid' });
      expect(state.request.mock.calls[0]?.[0]).toContain('/quotes');
    } else expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).toContain('cw_one');
  });
});
