import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GenerationExperience } from './GenerationExperience';

const mocks = vi.hoisted(() => ({ actor: { userId: 'owner' }, skip: false,
  estimate: vi.fn(), submit: vi.fn(), compareEstimate: vi.fn(), compare: vi.fn(),
  enhanceQuote: vi.fn(), enhance: vi.fn(), readEnhance: vi.fn() }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actor.userId }));
vi.mock('../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({ isSuccess: true, isFetching: false, data: { confirmCreditUsage: !mocks.skip }, save: vi.fn() }) }));
vi.mock('../../lib/permissions/FeaturePolicyProvider', () => ({ useFeaturePolicy: () => ({ isEnabled: () => false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../../features/generation/hooks/useGenerationJob', () => ({ useGenerationJob: () => ({}) }));
vi.mock('../../features/generation/hooks/useGenerationGroup', () => ({ useGenerationGroup: () => ({}) }));
vi.mock('../../features/comparisons/api/comparisonApi', () => ({ getComparison: async () => ({ runs: [] }), updateComparison: vi.fn() }));
vi.mock('../../features/credits/api/creditApi', () => ({ getCreditAccount: async () => ({ account: { availableCredits: 100 } }), grantMockCredits: vi.fn() }));
vi.mock('../../features/generation/api/lookSheetEnhancementApi', () => ({
  quoteLookSheetEnhancement: mocks.enhanceQuote, executeLookSheetEnhancement: mocks.enhance, readLookSheetEnhancement: mocks.readEnhance
}));
vi.mock('../../features/generation/api/generationApi', async original => ({ ...await original<object>(),
  estimateGeneration: mocks.estimate, submitGeneration: mocks.submit,
  estimateComparison: mocks.compareEstimate, submitComparison: mocks.compare,
  previewCompiledPrompt: async () => ({}),
  getProviderCatalog: async () => ({ defaultProvider: 'fixture', providers: [{ id: 'fixture', name: 'Fixture', defaultModel: 'one',
    models: ['one', 'two'].map(id => ({ id, name: id, capabilities: { aspectRatios: ['6:8'], resolutions: ['1K'], maxReferenceImages: 10 } })) }] })
}));

const quote = (credits = 10) => ({ estimate: { estimateId: `price-${credits}`, estimatedCredits: credits, expiresAt: '2099-01-01' }, account: { availableCredits: 100, canAfford: true } });
const textQuote = { id: 'text-price', status: 'quoted', credits: 4, expiresAt: '2099-01-01', artifactExpiresAt: '2099-01-01' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.actor = { userId: 'owner' }; mocks.skip = false;
  Element.prototype.scrollIntoView = vi.fn();
  mocks.estimate.mockReset().mockResolvedValue(quote());
  mocks.submit.mockResolvedValue({ jobId: 'job', status: 'queued' });
  mocks.compareEstimate.mockResolvedValue({ estimatedTotalCredit: 20, estimateToken: 'comparison-price', slots: [] });
  mocks.compare.mockResolvedValue({ setId: 'set', jobs: [] });
  mocks.enhanceQuote.mockResolvedValue(textQuote);
  mocks.enhance.mockResolvedValue({ ...textQuote, status: 'succeeded' });
});
afterEach(cleanup);
type Props = Partial<ComponentProps<typeof GenerationExperience>>;
function setup(props: Props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ui = (next: Props) => <QueryClientProvider client={client}><GenerationExperience surface="playground" generationMode="playground"
    initialPrompt="Portrait" showRecentGenerations={false} renderWorkspace={regions => <>{regions.actions}{regions.messages}</>} {...next} /></QueryClientProvider>;
  const view = render(ui(props));
  return { client, change: (next: Props) => view.rerender(ui({ ...props, ...next })) };
}
async function generate(comparison = false) {
  const button = await screen.findByRole('button', { name: comparison ? 'playground.action.generateComparison' : 'playground.action.generate' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  return button;
}
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));

it('real consent cancels without dispatch, then confirms the displayed quote exactly once', async () => {
  setup(); await generate();
  expect(await screen.findByRole('alertdialog')).toBeVisible();
  expect(mocks.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
  await generate();
  const approve = screen.getByRole('button', { name: 'ui.creditConsent.confirm' });
  fireEvent.click(approve); fireEvent.click(approve);
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Portrait' }), 'price-10');
  expect(mocks.estimate).toHaveBeenCalledTimes(1);
});

it('invalidates open consent on live draft change before debounce, then prices the changed selections', async () => {
  const view = setup(); await generate();
  view.change({ selections: { lighting: 'new' } });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'playground.action.generate' })).toBeDisabled();
  expect(mocks.submit).not.toHaveBeenCalled();
  await generate(); confirm();
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ selections: { lighting: 'new' } }), 'price-10'));
  expect(mocks.estimate).toHaveBeenCalledTimes(2);
});

it('invalidates actor changes while the real consent dialog is open', async () => {
  const view = setup(); await generate();
  mocks.actor = { userId: 'other' }; view.change({});
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('invalidates a changed authoritative quote instead of spending the new amount', async () => {
  const view = setup(); await generate();
  mocks.estimate.mockResolvedValue(quote(30));
  await view.client.invalidateQueries({ queryKey: ['generation-estimate'] });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(mocks.submit).not.toHaveBeenCalled();
  await generate(); confirm();
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.anything(), 'price-30'));
});

it('never dispatches unavailable estimates even with opt-out', async () => {
  mocks.skip = true; mocks.estimate.mockRejectedValue(new Error('unavailable')); setup();
  await waitFor(() => expect(mocks.estimate).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'playground.action.generate' })).toBeDisabled();
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('legitimate zero cost skips the modal but still uses the exact quote', async () => {
  mocks.estimate.mockResolvedValue(quote(0)); setup(); await generate();
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.anything(), 'price-0'));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('opt-out still submits once with the current approved price', async () => {
  mocks.skip = true; setup(); const button = await generate(); fireEvent.click(button);
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(mocks.submit).toHaveBeenCalledWith(expect.anything(), 'price-10');
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('gates comparison and passes its approved quote unchanged', async () => {
  setup({ initialComparisonActive: true }); await generate(true);
  expect(mocks.compare).not.toHaveBeenCalled(); confirm();
  await waitFor(() => expect(mocks.compare).toHaveBeenCalledTimes(1));
  expect(mocks.compare.mock.calls[0]![2].estimateToken).toBe('comparison-price');
  expect(mocks.compareEstimate).toHaveBeenCalledTimes(1);
});

it('passes the approved quote into custom image submission without requoting', async () => {
  const custom = vi.fn().mockResolvedValue({ jobId: 'custom', status: 'queued' });
  setup({ submitSingleDraft: custom }); await generate(); expect(custom).not.toHaveBeenCalled(); confirm();
  await waitFor(() => expect(custom).toHaveBeenCalledWith(expect.anything(), quote()));
  expect(mocks.estimate).toHaveBeenCalledTimes(1); expect(mocks.submit).not.toHaveBeenCalled();
});

it.each([9, 11])('blocks Look Sheet fresh quote drift to %s after real consent before paid execution', async credits => {
  setup({ generationMode: 'character-sheet', lookSheetDefinition: { schemaVersion: 1, name: 'Mira', ageYears: 24,
    appearance: 'Dark hair', situation: 'Market', outfit: 'Shirt', personality: 'Warm' },
    lookSheetEnhancement: { enabled: true, operation: null, onEnabledChange: vi.fn(), onOperation: vi.fn() } });
  await generate(); expect(mocks.enhance).not.toHaveBeenCalled();
  mocks.estimate.mockResolvedValue(quote(credits)); confirm();
  await screen.findByText('lookSheet.auto.priceChanged');
  expect(mocks.enhance).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled();
});

it.each([9, 10, 11])('binds the post-enhancement image price %s to the confirmed amount', async credits => {
  setup({ generationMode: 'character-sheet', lookSheetDefinition: { schemaVersion: 1, name: 'Mira', ageYears: 24,
    appearance: 'Dark hair', situation: 'Market', outfit: 'Shirt', personality: 'Warm' },
    lookSheetEnhancement: { enabled: true, operation: null, onEnabledChange: vi.fn(), onOperation: vi.fn() } });
  await generate();
  mocks.estimate.mockResolvedValueOnce(quote()).mockResolvedValue(quote(credits)); confirm();
  await waitFor(() => expect(mocks.enhance).toHaveBeenCalledTimes(1));
  if (credits === 10) {
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ lookSheetEnhancementId: 'text-price' }), 'price-10', expect.any(String)));
  } else {
    await screen.findByText('lookSheet.auto.priceChanged');
    expect(mocks.submit).not.toHaveBeenCalled();
  }
});
