import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCreditConfirmation } from './useCreditConfirmation';
import { AccountPreferencesDialog } from '../layout/AccountPreferencesDialog';
import { userPreferencesKey, useUserPreferences } from '../../lib/auth/userPreferences';

const api = vi.hoisted(() => ({ actor: 'alice', ask: true, request: vi.fn(), submit: vi.fn() }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('../../lib/api/apiClient', () => ({ apiRequest: (...args: unknown[]) => api.request(...args) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, args?: { credits?: number }) => args?.credits !== undefined ? `${key} ${args.credits}` : key }) }));

function Harness({ amount = 12, requestKey = 'quote-1', actor = 'alice', ready = true, mandatory = false }: { amount?: number; requestKey?: string; actor?: string; ready?: boolean; mandatory?: boolean }) {
  const preferences = useUserPreferences(actor);
  const consent = useCreditConfirmation({ actorId: actor, requestKey, estimatedCredits: amount,
    description: 'Model / Shot 1', ready, mandatory });
  return <>{consent.dialog}<button data-preference-ready={preferences.isSuccess && !preferences.isFetching} onClick={async () => { if (await consent.request() && consent.isCurrent()) api.submit(); }}>Generate</button></>;
}
function setup(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = (next: typeof props) => <QueryClientProvider client={client}><Harness {...next} /></QueryClientProvider>;
  const view = render(element(props));
  return { ...view, client, update: (next: typeof props) => view.rerender(element(next)) };
}
const generate = () => fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));

beforeEach(() => {
  api.actor = 'alice'; api.ask = true; api.submit.mockReset(); api.request.mockReset();
  api.request.mockImplementation(async (_path, options) => {
    if (options.method === 'PATCH') api.ask = options.body.confirmCreditUsage;
    return { confirmCreditUsage: api.ask };
  });
});

it.each([0, 12])('always confirms a mandatory bulk amount %s despite saved opt-out', async amount => {
  api.ask = false;
  setup({ amount, mandatory: true }); generate();
  expect(await screen.findByRole('alertdialog')).toHaveTextContent(`ui.creditConsent.amount ${amount}`);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(api.submit).not.toHaveBeenCalled(); confirm();
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
  generate(); expect(await screen.findByRole('alertdialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
  expect(api.submit).toHaveBeenCalledTimes(1);
  expect(api.request.mock.calls.filter(([, options]) => options.method === 'PATCH')).toHaveLength(0);
});

it('shows exact Credits, cancels without dispatch and confirms only once', async () => {
  setup(); generate();
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('ui.creditConsent.amount 12');
  expect(api.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
  expect(api.submit).not.toHaveBeenCalled();
  const trigger = screen.getByRole('button', { name: 'Generate' });
  fireEvent.click(trigger); fireEvent.click(trigger);
  const approval = screen.getByRole('button', { name: 'ui.creditConsent.confirm' });
  fireEvent.click(approval); fireEvent.click(approval);
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
  expect(api.request.mock.calls.filter(([, options]) => options.method === 'PATCH')).toHaveLength(0);
});

it('persists opt-out only with confirmation and reads it on a new session', async () => {
  const view = setup(); generate();
  fireEvent.click(await screen.findByRole('checkbox')); confirm();
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
  expect(api.request).toHaveBeenCalledWith('/api/me/preferences', expect.objectContaining({ method: 'PATCH', body: { confirmCreditUsage: false } }));
  view.unmount(); setup();
  await waitFor(() => expect(api.request.mock.calls.filter(([, options]) => !options.method)).toHaveLength(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute('data-preference-ready', 'true'));
  generate();
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('cancel does not persist a checked opt-out', async () => {
  setup(); generate(); fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
  expect(api.ask).toBe(true); expect(api.submit).not.toHaveBeenCalled();
});

it.each(['quote', 'actor', 'readiness'])('invalidates consent when %s changes', async change => {
  const view = setup({ amount: 12, requestKey: 'quote-1', actor: 'alice', ready: true }); generate();
  await screen.findByRole('alertdialog');
  if (change === 'actor') api.actor = 'bob';
  view.update({ amount: change === 'quote' ? 24 : 12, requestKey: change === 'quote' ? 'quote-2' : 'quote-1',
    actor: change === 'actor' ? 'bob' : 'alice', ready: change !== 'readiness' });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(api.submit).not.toHaveBeenCalled();
});

it('fails safely on preference save error and lets the user confirm without opting out', async () => {
  api.request.mockImplementation(async (_path, options) => {
    if (options.method === 'PATCH') throw new Error('Unavailable');
    return { confirmCreditUsage: true };
  });
  setup(); generate(); fireEvent.click(await screen.findByRole('checkbox')); confirm();
  expect(await screen.findByRole('alert')).toHaveTextContent('ui.creditConsent.saveFailed');
  expect(api.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox')); confirm();
  await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
});

it('does not dispatch a stale actor after opt-out persistence finishes late', async () => {
  let resolve!: (value: { confirmCreditUsage: boolean }) => void;
  api.request.mockImplementation(async (_path, options) => options.method === 'PATCH'
    ? new Promise(done => { resolve = done; }) : { confirmCreditUsage: true });
  const view = setup({ actor: 'alice' }); generate(); fireEvent.click(await screen.findByRole('checkbox')); confirm();
  await waitFor(() => expect(resolve).toBeDefined());
  api.actor = 'bob'; view.update({ actor: 'bob' });
  await act(async () => resolve({ confirmCreditUsage: false }));
  expect(api.submit).not.toHaveBeenCalled();
});

it('asks by default if profile loading fails and refuses unavailable estimates', async () => {
  api.request.mockRejectedValue(new Error('Offline'));
  const view = setup({ amount: Number.NaN }); generate();
  expect(api.submit).not.toHaveBeenCalled(); expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  view.update({ amount: 12 }); generate();
  expect(await screen.findByRole('alertdialog')).toBeVisible();
});

it('restores the ask preference from account settings', async () => {
  api.ask = false;
  render(<QueryClientProvider client={new QueryClient()}><AccountPreferencesDialog actorId="alice" onClose={vi.fn()} /></QueryClientProvider>);
  const toggle = await screen.findByRole('checkbox');
  expect(toggle).not.toBeChecked(); fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toBeChecked());
  expect(api.ask).toBe(true);
});

it('does not honor cached opt-out when a later preference fetch fails', async () => {
  api.ask = false;
  const view = setup();
  await waitFor(() => expect(view.client.getQueryData(userPreferencesKey('alice'))).toEqual({ confirmCreditUsage: false }));
  api.request.mockRejectedValue(new Error('Network'));
  await act(async () => { await view.client.invalidateQueries({ queryKey: userPreferencesKey('alice') }); });
  await waitFor(() => expect(view.client.getQueryState(userPreferencesKey('alice'))?.status).toBe('error'));
  generate(); expect(await screen.findByRole('alertdialog')).toBeVisible();
  expect(api.submit).not.toHaveBeenCalled();
});

it('does not let an older GET overwrite a successfully restored preference', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(userPreferencesKey('alice'), { confirmCreditUsage: false });
  let resolve!: (value: { confirmCreditUsage: boolean }) => void;
  api.request.mockImplementation(async (_path, options) => options.method === 'PATCH'
    ? { confirmCreditUsage: true } : new Promise(done => { resolve = done; }));
  render(<QueryClientProvider client={client}><AccountPreferencesDialog actorId="alice" onClose={vi.fn()} /></QueryClientProvider>);
  act(() => { void client.invalidateQueries({ queryKey: userPreferencesKey('alice') }); });
  await waitFor(() => expect(resolve).toBeDefined());
  fireEvent.click(screen.getByRole('checkbox'));
  await waitFor(() => expect(client.getQueryData(userPreferencesKey('alice'))).toEqual({ confirmCreditUsage: true }));
  await act(async () => resolve({ confirmCreditUsage: false }));
  expect(client.getQueryData(userPreferencesKey('alice'))).toEqual({ confirmCreditUsage: true });
});
