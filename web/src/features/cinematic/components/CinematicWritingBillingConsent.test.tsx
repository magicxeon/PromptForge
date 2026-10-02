import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicWritingBillingConsent } from './CinematicWritingBillingConsent';
import { CinematicWritingCancelled, withCinematicWritingQuote } from '../api/cinematicWritingBilling';
import { CinematicWritingConsent } from './CinematicWritingConsent';
import { useState } from 'react';
import { webcrypto } from 'node:crypto';
import { z } from 'zod';

const state = vi.hoisted(() => ({ actor: 'writer', request: vi.fn(), save: vi.fn(), refetch: vi.fn(), invalidate: vi.fn(), confirm: true, loaded: true }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => queryClient }));
const queryClient = { invalidateQueries: state.invalidate };
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => state.actor }));
vi.mock('../../../lib/api/apiClient', () => ({ apiRequest: (...args: unknown[]) => state.request(...args) }));
vi.mock('../../../lib/i18n/i18n', () => ({ i18n: { t: (key: string) => key } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { credits: number }) => values ? `${key} ${values.credits}` : key }) }));
vi.mock('../../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({
  isSuccess: state.loaded, isFetching: false, isStale: false, data: { confirmCreditUsage: state.confirm }, refetch: state.refetch, save: state.save
}) }));
const quote = () => ({ id: 'cw_one', operation: 'environment', credits: 30, billingStatus: 'paid', expiresAt: new Date(Date.now() + 60000).toISOString() });
beforeEach(() => {
  localStorage.clear(); vi.stubGlobal('crypto', webcrypto);
  state.actor = 'writer'; state.confirm = true; state.loaded = true;
  state.request.mockReset().mockResolvedValue(quote()); state.save.mockReset().mockResolvedValue({ confirmCreditUsage: false });
  state.refetch.mockReset().mockResolvedValue({ isSuccess: false });
  state.invalidate.mockReset().mockResolvedValue(undefined);
});
function start(mandatory = false) {
  const execute = vi.fn().mockResolvedValue('done');
  const result = withCinematicWritingQuote({ projectId: 'p', operation: 'environment', input: { expectedVersion: 1 }, mandatory }, execute);
  return { execute, result };
}
const confirmButton = () => screen.getByRole('button', { name: 'cinematic:cinematic.writingBilling.confirm 30' });

describe('Cinematic priced consent', () => {
  it('refreshes canonical actor wallet and all ledger pages after paid success', async () => {
    state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    await start().result;
    expect(state.invalidate.mock.calls).toEqual([
      [{ queryKey: ['credits', 'writer'] }], [{ queryKey: ['credit-ledger', 'writer'] }]
    ]);
  });
  it.each(['succeeded', 'failed', 'delivered'] as const)('refreshes mounted wallet only after confirmed terminal recovery (%s)', async status => {
    state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    state.request.mockResolvedValueOnce(quote()).mockResolvedValue({ ...quote(), status,
      result: status === 'failed' ? undefined : { story: 'Recovered' } });
    const result = withCinematicWritingQuote({ projectId: 'p', operation: 'environment', input: {}, resultSchema: z.object({ story: z.string() }) },
      async () => { throw new TypeError('Response lost'); });
    if (status === 'failed') await expect(result).rejects.toThrow('failed');
    else await expect(result).resolves.toEqual({ story: 'Recovered' });
    if (status === 'delivered') expect(state.invalidate).not.toHaveBeenCalled();
    else expect(state.invalidate.mock.calls).toEqual([
      [{ queryKey: ['credits', 'writer'] }], [{ queryKey: ['credit-ledger', 'writer'] }]
    ]);
  });
  it('does not refresh another actor wallet after an actor change during execution', async () => {
    state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const execute = vi.fn(async () => { state.actor = 'other'; return { billingStatus: 'paid' }; });
    await expect(withCinematicWritingQuote({ projectId: 'p', operation: 'environment', input: {} }, execute)).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(state.invalidate).not.toHaveBeenCalled();
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).toContain('cw_one');
  });
  it('shows server Credits, an optional-image boundary and cancellation without execution', async () => {
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const pending = start();
    const rejection = expect(pending.result).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('cinematic:cinematic.writingBilling.credits 30')).toBeVisible();
    expect(screen.getByText('cinematic:cinematic.writingBilling.imageSeparate')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
    await rejection; expect(pending.execute).not.toHaveBeenCalled();
  });
  it('honors single-action preference but always confirms bulk using the same quote', async () => {
    state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const single = start(); await expect(single.result).resolves.toBe('done');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    const bulk = start(true); await screen.findByRole('alertdialog');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(bulk.execute).not.toHaveBeenCalled();
    fireEvent.click(confirmButton()); await expect(bulk.result).resolves.toBe('done');
    expect(bulk.execute).toHaveBeenCalledWith({ expectedVersion: 1, writingQuoteId: 'cw_one' });
    expect(state.request).toHaveBeenCalledTimes(2);
  });
  it('keeps confirmation visible if preferences cannot be loaded', async () => {
    state.loaded = false; state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const pending = start(); await screen.findByRole('alertdialog');
    expect(state.refetch).toHaveBeenCalledOnce();
    fireEvent.click(confirmButton()); await pending.result;
  });
  it('persists the opt-out only on confirmation and permits retry after save failure', async () => {
    state.save.mockRejectedValueOnce(new Error('offline'));
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const pending = start(); await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('react-ui:ui.creditConsent.saveFailed');
    expect(screen.getByRole('alertdialog')).toBeVisible(); expect(pending.execute).not.toHaveBeenCalled();
    fireEvent.click(confirmButton()); await pending.result;
    expect(state.save).toHaveBeenCalledTimes(2); expect(state.save).toHaveBeenLastCalledWith(false);
  });
  it('cancels a pending consent when the route host unmounts', async () => {
    const view = render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const pending = start(); const rejection = expect(pending.result).rejects.toBeInstanceOf(CinematicWritingCancelled);
    await screen.findByRole('alertdialog'); view.unmount(); await rejection;
    expect(pending.execute).not.toHaveBeenCalled();
  });
  it('keeps busy feedback from cancelling consent but invalidates a changed source', async () => {
    let result!: Promise<unknown>;
    const execute = vi.fn();
    function Demo({ version }: { version: number }) {
      const [busy, setBusy] = useState(false);
      return <><CinematicWritingBillingConsent actorId="writer" scopeKey="route" />
        <CinematicWritingConsent key={version} title="Environment" scope="Scene one" pending={busy}
          trigger={<button>Request</button>} onConfirm={() => {
            setBusy(true);
            result = withCinematicWritingQuote({ projectId: 'p', operation: 'environment', input: { expectedVersion: version }, mandatory: true }, execute);
          }} /></>;
    }
    const view = render(<Demo version={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request' }));
    const rejection = expect(result).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Scene one');
    view.rerender(<Demo version={2} />);
    await rejection;
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
  });
  it('reviews a changed-version terminal artifact without returning an old snapshot to the caller', async () => {
    state.confirm = false;
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const execute = vi.fn().mockRejectedValue(new TypeError('Lost POST'));
    state.request.mockResolvedValueOnce(quote()).mockRejectedValueOnce(new TypeError('Status offline'));
    const options = { projectId: 'p', operation: 'environment' as const, input: { expectedVersion: 1 }, resultSchema: z.object({ story: z.string() }) };
    await expect(withCinematicWritingQuote(options, execute)).rejects.toThrow('Status offline');
    state.request.mockReset().mockResolvedValue({ ...quote(), status: 'succeeded', expiresAt: new Date(0).toISOString(),
      artifactExpiresAt: new Date(Date.now() + 60000).toISOString(), result: { story: 'Previous accepted description' } });
    const caller = vi.fn(), result = withCinematicWritingQuote({ ...options, input: { expectedVersion: 2 } }, caller);
    const cancellation = expect(result).rejects.toBeInstanceOf(CinematicWritingCancelled);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Previous accepted description');
    expect(screen.getByText('cw_one')).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.writingBilling.downloadResult' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic:cinematic.writingBilling.reviewPrevious' }));
    await cancellation;
    expect(caller).not.toHaveBeenCalled();
    expect(state.request.mock.calls.every(call => String(call[0]).includes('/operations/cw_one'))).toBe(true);
    expect(localStorage.getItem('mpf.react.draft:cinematic-writing-recovery:writer')).not.toContain('cw_one');
  });
  it('expires an open quote and preserves the Cancel action', async () => {
    state.request.mockResolvedValue({ ...quote(), expiresAt: new Date(Date.now() + 150).toISOString() });
    render(<CinematicWritingBillingConsent actorId="writer" scopeKey="route" />);
    const pending = start(); const rejection = expect(pending.result).rejects.toBeInstanceOf(CinematicWritingCancelled);
    await screen.findByRole('alertdialog');
    await waitFor(() => expect(confirmButton()).toBeDisabled());
    expect(screen.getByRole('alert')).toHaveTextContent('expired');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' })); });
    await rejection; expect(pending.execute).not.toHaveBeenCalled();
  });
});
