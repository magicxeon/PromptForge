import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GenerationExperience } from './GenerationExperience';
import { generationRoutePointerFeature, writeGenerationRoutePointer } from '../../features/generation/job-center/generationRoutePointer';

const mocks = vi.hoisted(() => ({ actor: { userId: 'owner' }, skip: false,
  estimate: vi.fn(), submit: vi.fn(), compareEstimate: vi.fn(), compare: vi.fn(),
  job: vi.fn(), group: vi.fn(), comparison: vi.fn(), catalog: vi.fn(),
  enhanceQuote: vi.fn(), enhance: vi.fn(), readEnhance: vi.fn() }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actor.userId }));
vi.mock('../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({ isSuccess: true, isFetching: false, data: { confirmCreditUsage: !mocks.skip }, save: vi.fn() }) }));
vi.mock('../../lib/permissions/FeaturePolicyProvider', () => ({ useFeaturePolicy: () => ({ isEnabled: () => false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../../features/comparisons/api/comparisonApi', () => ({ getComparison: mocks.comparison, updateComparison: vi.fn() }));
vi.mock('../../features/credits/api/creditApi', () => ({ getCreditAccount: async () => ({ account: { availableCredits: 100 } }), grantMockCredits: vi.fn() }));
vi.mock('../../features/generation/api/lookSheetEnhancementApi', () => ({
  quoteLookSheetEnhancement: mocks.enhanceQuote, executeLookSheetEnhancement: mocks.enhance, readLookSheetEnhancement: mocks.readEnhance
}));
vi.mock('../../features/generation/api/generationApi', async original => ({ ...await original<object>(),
  estimateGeneration: mocks.estimate, submitGeneration: mocks.submit,
  getJobStatus: mocks.job, getGenerationGroupStatus: mocks.group,
  estimateComparison: mocks.compareEstimate, submitComparison: mocks.compare,
  previewCompiledPrompt: async () => ({}),
  getProviderCatalog: mocks.catalog
}));

const providerCatalog = { defaultProvider: 'fixture', providers: [{ id: 'fixture', name: 'Fixture', displayName: 'Fixture', defaultModel: 'one',
  models: ['one', 'two'].map(id => ({ id, name: id, displayName: id, capabilities: { aspectRatios: ['6:8'], resolutions: ['1K'], maxReferenceImages: 10 } })) }] };
const quote = (credits = 10) => ({ estimate: { estimateId: `price-${credits}`, estimatedCredits: credits, expiresAt: '2099-01-01' }, account: { availableCredits: 100, canAfford: true } });
const textQuote = { id: 'text-price', status: 'quoted', credits: 4, expiresAt: '2099-01-01', artifactExpiresAt: '2099-01-01' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.actor = { userId: 'owner' }; mocks.skip = false;
  Element.prototype.scrollIntoView = vi.fn();
  mocks.estimate.mockReset().mockResolvedValue(quote());
  mocks.submit.mockReset().mockResolvedValue({ jobId: 'job', status: 'queued' });
  mocks.compareEstimate.mockResolvedValue({ estimatedTotalCredit: 20, estimateToken: 'comparison-price', slots: [] });
  mocks.compare.mockResolvedValue({ setId: 'set', runId: 'run', status: 'queued', jobs: [] });
  mocks.job.mockReset().mockResolvedValue({ id: 'job', status: 'queued' });
  mocks.group.mockReset().mockResolvedValue({ id: 'group', status: 'queued', children: [] });
  mocks.comparison.mockReset().mockResolvedValue({ runs: [] });
  mocks.catalog.mockReset().mockResolvedValue(providerCatalog);
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

it('renders the guided Playground builder and read-only prompt, preserving pending field locks and consent', async () => {
  mocks.submit.mockImplementation(() => new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const { container } = render(<MemoryRouter><QueryClientProvider client={client}>
    <GenerationExperience surface="playground" generationMode="character-sheet" layoutVariant="playground"
      initialPrompt="Approved character direction" showRecentGenerations={false} allowComparison={false}
      showPromptEditor={false} readOnlyPrompt={{ label: 'Compiled Look Sheet prompt' }}
      lookSheetDefinition={{ schemaVersion: 1, name: 'Kin', ageYears: 25, appearance: 'Dark hair', situation: 'Office', outfit: 'Suit', personality: 'Quiet' }}
      studioBuilderTitle="Character definition" studioBuilder={<input aria-label="Character draft" defaultValue="Kin" />} />
  </QueryClientProvider></MemoryRouter>);
  const draft = await screen.findByRole('textbox', { name: 'Character draft' });
  expect(draft).toBeEnabled();
  expect(draft.closest('.playground-workspace__builder')).toHaveAttribute('open');
  expect(screen.getByRole('textbox', { name: 'Compiled Look Sheet prompt' })).toHaveAttribute('readonly');
  expect(container.querySelector('.studio-configurator-panel')).toBeNull();
  const generateButton = screen.getByRole('button', { name: /^playground\.action\.generate/ });
  await waitFor(() => expect(generateButton).toBeEnabled());
  fireEvent.click(generateButton);
  expect(mocks.submit).not.toHaveBeenCalled();
  confirm();
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(draft).toBeDisabled();
  expect(container.querySelector('.engine-target-panel')?.closest('fieldset')).toBeDisabled();
  expect(generateButton).toBeDisabled();
  client.clear();
});

it('returns to guided settings even when an incomplete Look Sheet has no compiled prompt', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<MemoryRouter><QueryClientProvider client={client}>
    <GenerationExperience surface="playground" generationMode="character-sheet" layoutVariant="playground"
      initialPrompt="" showRecentGenerations={false} allowComparison={false} showPromptEditor={false}
      blockedReason="Incomplete definition" lookSheetDefinition={{ schemaVersion: 1, name: '', ageYears: null, appearance: '', situation: '', outfit: '', personality: '' }}
      studioBuilderTitle="Character definition" studioBuilder={<input aria-label="Character draft" defaultValue="" />} />
  </QueryClientProvider></MemoryRouter>);
  await screen.findByRole('textbox', { name: 'Character draft' });
  expect(container.querySelector('.studio-prompt-preview')).toBeNull();
  expect(container.querySelector('.playground-workspace__result')).not.toBeVisible();
  const toggle = container.querySelector<HTMLButtonElement>('.playground-workspace__setup-toggle')!;
  fireEvent.click(toggle);
  expect(screen.queryByRole('textbox', { name: 'Character draft' })).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(screen.getByRole('textbox', { name: 'Character draft' })).toHaveValue('');
  client.clear();
});

type RenderKind = 'image' | 'look-sheet' | 'group' | 'comparison';
function lifecycleFixture(kind: RenderKind, status = 'completed', media = true) {
  const result = media ? { imageUrl: '/outputs/lifecycle.png' } : null;
  const slots = ['one', 'two'].map(id => ({ id, jobId: id, status, result, provider: 'fixture', model: id }));
  const data = kind === 'comparison'
    ? { id: 'set', name: 'Lifecycle comparison', runs: [{ id: 'run', status, createdAt: 1, slots }] }
    : kind === 'group'
      ? { id: 'group', status, requestedOutputCount: 2, completedCount: status === 'completed' ? 2 : 0,
        failedCount: status === 'failed' ? 2 : 0, children: slots }
      : { id: 'job', status, result };
  return {
    data,
    read: kind === 'comparison' ? mocks.comparison : kind === 'group' ? mocks.group : mocks.job,
    queryKey: kind === 'comparison' ? ['comparison', 'owner', 'set']
      : kind === 'group' ? ['generation-group', 'owner', 'group'] : ['generation-job', 'owner', 'job'],
    pointer: { jobId: kind === 'image' || kind === 'look-sheet' ? 'job' : null,
      generationGroupId: kind === 'group' ? 'group' : null, comparisonSetId: kind === 'comparison' ? 'set' : null }
  };
}

function mountLifecycle(kind: RenderKind) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const element = (visible = true) => <MemoryRouter><QueryClientProvider client={client}>
    {visible ? <GenerationExperience surface="playground" generationMode={kind === 'look-sheet' ? 'character-sheet' : 'playground'}
      layoutVariant="playground" initialPrompt="Lifecycle direction" showRecentGenerations={false}
      initialComparisonActive={kind === 'comparison'}
      {...(kind === 'look-sheet' ? { showPromptEditor: false, readOnlyPrompt: { label: 'Compiled prompt' },
        lookSheetDefinition: { schemaVersion: 1 as const, name: 'Kin', ageYears: 25, appearance: 'Dark hair', situation: 'Office', outfit: 'Suit', personality: 'Quiet' },
        studioBuilder: <input aria-label="Character draft" defaultValue="Kin" /> } : {})} /> : <div>Other tab</div>}
  </QueryClientProvider></MemoryRouter>;
  const view = render(element());
  return { ...view, client, tab: (visible: boolean) => view.rerender(element(visible)) };
}

function lifecycleToggle() {
  return screen.getByRole('button', { name: /playground.setup.title/ });
}

it.each<RenderKind>(['image', 'look-sheet', 'group', 'comparison'])('keeps async restored %s expanded despite initial pending hydration and tab return', async kind => {
  const fixture = lifecycleFixture(kind);
  let resolve!: (value: typeof fixture.data) => void;
  fixture.read.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue(fixture.data);
  writeGenerationRoutePointer('owner', generationRoutePointerFeature('playground', kind === 'look-sheet' ? 'character-sheet' : 'playground'), fixture.pointer);
  const view = mountLifecycle(kind);
  await waitFor(() => expect(fixture.read).toHaveBeenCalled());
  await screen.findByRole('button', { name: /playground.setup.title/ });
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  expect(view.container.querySelector('.studio-generate-button')).toBeDisabled();
  await act(async () => resolve(fixture.data));
  await waitFor(() => expect(view.client.getQueryData(fixture.queryKey)).toEqual(fixture.data));
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(lifecycleToggle());
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'false');
  view.tab(false);
  view.tab(true);
  await screen.findByRole('button', { name: /playground.setup.title/ });
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  expect(view.client.getQueryData(fixture.queryKey)).toEqual(fixture.data);
  expect(mocks.submit).not.toHaveBeenCalled();
  expect(mocks.compare).not.toHaveBeenCalled();
  view.unmount(); view.client.clear();
});

it.each<RenderKind>(['image', 'look-sheet', 'group', 'comparison'])('collapses a newly submitted %s whose first query is already completed, once only', async kind => {
  mocks.skip = true;
  const fixture = lifecycleFixture(kind);
  let resolve!: (value: typeof fixture.data) => void;
  fixture.read.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue(fixture.data);
  if (kind === 'group') mocks.submit.mockResolvedValue({ jobId: 'one', groupId: 'group', status: 'queued' });
  const view = mountLifecycle(kind);
  const generateButton = await screen.findByRole('button', { name: /^playground.action.generate/ });
  await waitFor(() => expect(generateButton).toBeEnabled());
  fireEvent.click(generateButton);
  await waitFor(() => expect(fixture.read).toHaveBeenCalled());
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  await act(async () => resolve(fixture.data));
  await waitFor(() => expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'false'));
  fireEvent.click(lifecycleToggle());
  await act(async () => { await view.client.refetchQueries({ queryKey: fixture.queryKey }); });
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  expect(kind === 'comparison' ? mocks.compare : mocks.submit).toHaveBeenCalledTimes(1);
  view.unmount(); view.client.clear();
});

it.each<RenderKind>(['image', 'group', 'comparison'])('collapses an actually observed active restored %s only when it succeeds with media', async kind => {
  const fixture = lifecycleFixture(kind, 'queued');
  fixture.read.mockResolvedValue(fixture.data);
  writeGenerationRoutePointer('owner', generationRoutePointerFeature('playground', 'playground'), fixture.pointer);
  const view = mountLifecycle(kind);
  await waitFor(() => expect(view.client.getQueryData(fixture.queryKey)).toEqual(fixture.data));
  await screen.findByRole('button', { name: /playground.setup.title/ });
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  await act(async () => { view.client.setQueryData(fixture.queryKey, lifecycleFixture(kind).data); });
  await waitFor(() => expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'false'));
  view.unmount(); view.client.clear();
});

it('keeps manually reopened setup expanded when first-time Compare loading remounts the workspace', async () => {
  mocks.skip = true;
  mocks.job.mockResolvedValue(lifecycleFixture('image').data);
  const view = mountLifecycle('image');
  const generateButton = await screen.findByRole('button', { name: /^playground.action.generate/ });
  await waitFor(() => expect(generateButton).toBeEnabled());
  fireEvent.click(generateButton);
  await waitFor(() => expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'false'));
  const oldToggle = lifecycleToggle();
  fireEvent.click(oldToggle);
  let resolve!: (value: typeof providerCatalog) => void;
  mocks.catalog.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  fireEvent.click(screen.getByRole('button', { name: /^playground.action.compare/ }));
  await screen.findByText('playground.engine.loading');
  expect(oldToggle).not.toBeInTheDocument();
  await act(async () => resolve(providerCatalog));
  const newToggle = await screen.findByRole('button', { name: /playground.setup.title/ });
  expect(newToggle).not.toBe(oldToggle);
  expect(newToggle).toHaveAttribute('aria-expanded', 'true');
  await waitFor(() => expect(screen.getByRole('button', { name: /^playground.action.generateComparison/ })).toBeEnabled());
  expect(newToggle).toHaveAttribute('aria-expanded', 'true');
  expect(mocks.submit).toHaveBeenCalledTimes(1);
  expect(mocks.compare).not.toHaveBeenCalled();
  view.unmount(); view.client.clear();
});

it.each(['failed', 'cancelled', 'partially_completed', 'missing-media'])('keeps newly submitted image setup expanded for %s', async status => {
  mocks.skip = true;
  mocks.job.mockResolvedValue(lifecycleFixture('image', status === 'missing-media' ? 'completed' : status, false).data);
  const view = mountLifecycle('image');
  const generateButton = await screen.findByRole('button', { name: /^playground.action.generate/ });
  await waitFor(() => expect(generateButton).toBeEnabled());
  fireEvent.click(generateButton);
  await waitFor(() => expect(mocks.job).toHaveBeenCalled());
  await waitFor(() => expect(generateButton).toBeEnabled());
  expect(lifecycleToggle()).toHaveAttribute('aria-expanded', 'true');
  view.unmount(); view.client.clear();
});
