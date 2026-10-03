import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundVideoExperience } from './PlaygroundVideoWorkspace';
import { videoModelCapabilitySchema } from '../../generation/schemas/videoGenerationSchemas';
import playgroundEnglish from '../../../../../client/i18n/locales/en/playground.json';
import { writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  quote: vi.fn(),
  submit: vi.fn(),
  task: vi.fn(),
  recent: vi.fn(),
  mediaBlob: vi.fn(),
  focusRegion: vi.fn(),
  cancelFocus: vi.fn(),
  lookUrl: '/outputs/look.png',
  actor: 'alice',
  ask: false,
}));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actor }));
vi.mock('../../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({ isSuccess: true, isFetching: false, data: { confirmCreditUsage: mocks.ask }, save: vi.fn() }) }));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: mocks.actor } }),
}));
vi.mock('../../../lib/api/apiClient', async importOriginal => ({
  ...await importOriginal<typeof import('../../../lib/api/apiClient')>(),
  apiMediaBlob: mocks.mediaBlob,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { id?: string; number?: number; count?: number; mode?: string }) => {
      if (key.startsWith('playground.video.references.purpose.') || [
        'playground.video.references.frame', 'playground.video.references.imageReference',
        'playground.video.references.imageNumber', 'playground.video.references.summary',
        'playground.options.maximumCredits',
        'playground.options.moreReferences',
      ].includes(key)) {
        const message = playgroundEnglish[key as keyof typeof playgroundEnglish];
        return message.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name as keyof typeof values] ?? ''));
      }
      return values?.id ? `${key}: ${values.id}` : values?.number ? `${key}: ${values.number}` : key;
    },
  }),
}));
vi.mock('../../generation/api/videoGenerationApi', () => ({
  getVideoCapabilityCatalog: mocks.catalog,
  quoteVideoGeneration: mocks.quote,
  submitVideoGeneration: mocks.submit,
  getVideoTask: mocks.task,
  listRecentVideoTasks: mocks.recent,
}));
vi.mock('../../../components/generation/PromptEditor', () => ({
  PromptEditor: (p: {
    value: string;
    onChange: (value: string) => void;
    primaryFooter: ReactNode;
    primaryMaxLength: number;
  }) => (
    <>
      <textarea
        aria-label="Prompt"
        maxLength={p.primaryMaxLength}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
      />
      {p.primaryFooter}
    </>
  ),
}));
vi.mock('../../../components/generation/VideoEngineTargetPanel', () => ({
  VideoEngineTargetPanel: (p: { selectedModel: { modelId: string }; maximumCreditEstimate?: boolean; showQuote?: boolean; onModelChange: (value: string) => void }) => (
    <div data-testid="model" data-maximum-credit-estimate={String(Boolean(p.maximumCreditEstimate))}
      data-show-quote={String(p.showQuote)}>{p.selectedModel.modelId}
      {p.showQuote !== false ? <span>playground.video.creditEstimate</span> : null}
      <button onClick={() => p.onModelChange('modelark:other')}>Change model</button>
    </div>
  ),
}));
vi.mock('./PlaygroundVideoSources', () => ({
  PlaygroundVideoSources: (p: { onChange: (value: unknown) => void; invalidFrame?: boolean; invalidLook?: boolean; invalidCharacter?: boolean }) => (
    <section className={p.invalidFrame || p.invalidLook || p.invalidCharacter ? 'is-provider-rejected' : undefined}>
    <button
      data-invalid-frame={String(Boolean(p.invalidFrame))}
      data-invalid-look={String(Boolean(p.invalidLook))}
      onClick={() =>
        p.onChange({
          referenceImageUrl: '/outputs/frame.png',
          lookSheet: {
            url: mocks.lookUrl,
            assetId: 'look',
            name: 'Look',
            characterName: 'Lalin',
          },
        })
      }
    >
      Attach
    </button>
    </section>
  ),
}));
vi.mock('../../../components/media/GenerationVideoViewer', () => ({
  GenerationVideoViewer: () => null,
}));
vi.mock('./resultRegionFocus', () => ({
  focusResultRegionAfterLayout: mocks.focusRegion,
}));
const model = videoModelCapabilitySchema.parse({
  providerId: 'modelark',
  modelId: 'seedance',
  displayName: 'Seedance',
  operations: ['text_to_video'],
  inputModes: ['text_to_video', 'image_to_video', 'multimodal_reference'],
  referenceImageLimit: 9,
  supportsOrderedImageReferences: true,
  qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false,
  testingRoutingEnabled: true,
  durations: [6],
  resolutions: ['480p'],
  aspectRatios: ['9:16'],
  audioModes: ['none'],
});
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeEach(() => {
  mocks.ask = false;
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.focusRegion.mockImplementation((region: HTMLElement | null) => {
    region?.focus({ preventScroll: true });
    return mocks.cancelFocus;
  });
  localStorage.clear();
  mocks.actor = 'alice';
  mocks.lookUrl = '/outputs/look.png';
  mocks.mediaBlob.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  mocks.catalog.mockResolvedValue({
    models: [model],
    comparison: { enabled: false },
  });
  mocks.quote.mockResolvedValue({
    estimate: {
      estimateId: 'quote',
      estimatedCredits: 1,
      expiresAt: '2099-01-01',
    },
    account: { canAfford: true },
    requestFingerprint: 'quote-fingerprint',
  });
  mocks.recent.mockResolvedValue({ items: [] });
  mocks.submit.mockResolvedValue({ id: 'task-one', status: 'provider_queued' });
  mocks.task.mockResolvedValue({ id: 'task-one', status: 'provider_queued' });
});
afterEach(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (visible: boolean) => <QueryClientProvider client={client}>
    {visible ? <PlaygroundVideoExperience /> : <div>Other tab</div>}
  </QueryClientProvider>;
  const view = render(ui(true));
  return { client, ...view, tab: (visible: boolean) => view.rerender(ui(visible)) };
}
function restoreDraft(payload: Record<string, unknown>) {
  writeActorScopedDraft({ actorId: 'alice', feature: 'playground-video', schemaVersion: 6,
    payload: { providerModelKey: 'modelark:seedance', durationSeconds: 6, resolution: '480p', audioMode: 'none', ...payload } });
}
function changeOperation(operation: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'playground.video.sourceTitle' }), {
    target: { value: operation },
  });
}
async function expandReferences() {
  const details = document.querySelector<HTMLDetailsElement>('.generation-reference-disclosure details')!;
  if (!details.open) fireEvent.click(details.querySelector('summary')!);
  await waitFor(() => expect(details).toHaveAttribute('open'));
  return details;
}
async function ready(operation = 'character_to_video') {
  await screen.findByTestId('model');
  changeOperation(operation);
  await expandReferences();
  fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Small motion' },
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    ).toBeEnabled(),
  );
}

describe('Playground video execution controls', () => {
  it('starts collapsed with compact source options and a visible path to missing-reference editors', async () => {
    mount();
    await screen.findByTestId('model');
    const sourceMode = screen.getByRole('combobox', { name: 'playground.video.sourceTitle' });
    expect(sourceMode).toHaveValue('text_to_video');
    expect(sourceMode.querySelectorAll('option')).toHaveLength(3);
    changeOperation('image_to_video');
    const details = document.querySelector<HTMLDetailsElement>('.generation-reference-disclosure details')!;
    expect(details).not.toHaveAttribute('open');
    expect(document.querySelector('.generation-reference-disclosure__editor button')).toBeInTheDocument();
    expect(document.querySelector('.generation-reference-disclosure__editor button')).not.toBeVisible();
    const problem = document.querySelector<HTMLElement>('.generation-reference-disclosure__problem')!;
    expect(problem).toHaveTextContent('playground.video.references.needFrame');
    expect(problem).toBeVisible();
    expect(details).not.toContainElement(problem);
    fireEvent.click(screen.getByRole('button', { name: 'playground.options.editReferences' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Attach' })).toHaveFocus());
    expect(details).toHaveAttribute('open');
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('bounds a restored maximum-reference summary without trimming or reordering the quote snapshot', async () => {
    const imageReferences = Array.from({ length: 9 }, (_, index) => ({ url: `/outputs/image-${index + 1}.png` }));
    restoreDraft({ operation: 'image_to_video', prompt: 'Restored motion', imageReferences });
    mount();
    await waitFor(() => expect(screen.getByRole('button', { name: /playground.video.generate/ })).toBeEnabled());
    const details = document.querySelector<HTMLDetailsElement>('.generation-reference-disclosure details')!;
    expect(details).not.toHaveAttribute('open');
    const thumbnails = document.querySelectorAll('.playground-video-reference-summary__thumbnail img');
    expect(Array.from(thumbnails).map(image => image.getAttribute('src')))
      .toEqual(imageReferences.slice(0, 2).map(image => image.url));
    expect(screen.getByText('+7 more references')).toBeVisible();
    expect(document.querySelector('.generation-reference-disclosure__count')).toHaveTextContent('9 / 9');
    expect(document.querySelectorAll('.generation-reference-disclosure__editor button[data-invalid-frame]')).toHaveLength(9);
    const snapshot = mocks.quote.mock.calls.at(-1)?.[0];
    expect(snapshot.references.map((reference: { referenceImageUrl: string }) => reference.referenceImageUrl))
      .toEqual(imageReferences.map(image => image.url));
    await expandReferences();
    expect(screen.getAllByRole('button', { name: 'Attach' })).toHaveLength(9);
    fireEvent.click(details.querySelector('summary')!);
    await waitFor(() => expect(details).not.toHaveAttribute('open'));
    expect(screen.getByLabelText('Prompt')).toHaveValue('Restored motion');
    expect(mocks.quote.mock.calls.at(-1)?.[0]).toEqual(snapshot);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it.each(['image', 'look'])('keeps a rejected %s beyond the summary visible and focuses its exact editor', async kind => {
    const failed = { id: 'restored-failed', status: 'failed', providerError: {
      code: 'video_provider_input_image_rejected',
      referenceIssue: { contentIndex: 8, referenceIndex: 7, reason: 'possible_real_person' },
    } };
    mocks.task.mockResolvedValue(failed);
    const sources = Array.from({ length: 9 }, (_, index) => ({ url: `/outputs/reference-${index + 1}.png`, name: `Look ${index + 1}` }));
    restoreDraft({ operation: kind === 'image' ? 'image_to_video' : 'character_to_video',
      prompt: 'Preserved direction', activeTaskId: failed.id,
      ...(kind === 'image' ? { imageReferences: sources } : { lookSheets: sources }) });
    mount();
    await screen.findByTestId('model');
    const edit = await screen.findByRole('button', { name: 'playground.options.editReferences' });
    const problem = document.querySelector<HTMLElement>('.generation-reference-disclosure__problem')!;
    expect(problem).toBeVisible();
    await waitFor(() => expect(problem).toHaveTextContent('Image 8'));
    expect(document.querySelectorAll('.playground-video-reference-summary__list li')).toHaveLength(2);
    expect(document.querySelector('.playground-video-reference-summary__list li.is-rejected')).toBeNull();
    const details = document.querySelector<HTMLDetailsElement>('.generation-reference-disclosure details')!;
    expect(details).not.toHaveAttribute('open');
    const affected = document.querySelector<HTMLButtonElement>('.generation-reference-disclosure__editor .is-provider-rejected button')!;
    expect(affected).toBeInTheDocument();
    fireEvent.click(edit);
    await waitFor(() => expect(affected).toHaveFocus());
    expect(affected).toHaveAttribute(kind === 'image' ? 'data-invalid-frame' : 'data-invalid-look', 'true');
    expect(details).toHaveAttribute('open');
    expect(problem).toBeVisible();
    expect(screen.getByLabelText('Prompt')).toHaveValue('Preserved direction');
    expect(mocks.focusRegion).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('loads protected Look thumbnails through the authenticated media boundary', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL() { return 'blob:protected-look'; }
      static revokeObjectURL() {}
    });
    let unmount = () => {};
    try {
      mocks.lookUrl = '/api/character-profiles/lalin/looks/look/versions/v1/media/sheet';
      unmount = mount().unmount; await ready();
      await waitFor(() => expect(mocks.mediaBlob).toHaveBeenCalledWith(mocks.lookUrl, expect.any(AbortSignal)));
      await waitFor(() => expect(document.querySelector('.playground-video-reference-summary__thumbnail img[src="blob:protected-look"]')).not.toBeNull());
      expect(mocks.submit).not.toHaveBeenCalled();
    } finally { unmount(); vi.unstubAllGlobals(); }
  });

  it.each(['operation', 'model'])('dismisses old rejection highlighting after changing %s', async change => {
    mocks.catalog.mockResolvedValue({ models: [model, { ...model, modelId: 'other' }], comparison: { enabled: false } });
    const failed = { id: 'failed-task', status: 'failed', providerError: {
      code: 'video_provider_input_image_rejected',
      referenceIssue: { contentIndex: 1, referenceIndex: 0, reason: 'possible_real_person' },
    } };
    mocks.submit.mockResolvedValue(failed); mocks.task.mockResolvedValue(failed);
    mount(); await ready('image_to_video');
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await waitFor(() => expect(document.querySelector('.playground-video-reference-summary__list li.is-rejected')).not.toBeNull());
    if (change === 'model') fireEvent.click(screen.getByRole('button', { name: 'Change model' }));
    else changeOperation('character_to_video');
    await waitFor(() => expect(document.querySelector('.playground-video-reference-summary__list li.is-rejected')).toBeNull());
    expect(screen.getByRole('button', { name: 'Attach' })).toHaveAttribute('data-invalid-frame', 'false');
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('separates writing from render settings and hides only the unused result placeholder', async () => {
    mount();
    await ready();
    const prompt = screen.getByRole('textbox', { name: 'Prompt' });
    const composer = prompt.closest<HTMLElement>('.playground-workspace__composer');
    const tools = prompt.closest<HTMLElement>('.playground-workspace__tools-frame');
    const source = screen.getByRole('button', { name: 'Attach' });
    const engine = screen.getByTestId('model');
    const generate = screen.getByRole('button', { name: /playground.video.generate/ });
    expect(engine).toHaveAttribute('data-maximum-credit-estimate', 'false');
    expect(engine).toHaveAttribute('data-show-quote', 'false');
    expect(screen.queryByText('playground.video.creditEstimate')).not.toBeInTheDocument();
    expect(generate).toHaveTextContent('1 playground.comparison.credits');
    for (const region of [source, engine]) expect(composer).toContainElement(region);
    for (const region of [generate]) {
      expect(tools).toContainElement(region);
      expect(composer).toContainElement(region);
      expect(engine.closest('.playground-workspace__render-settings')).toContainElement(region);
    }
    const orderedRegions: Array<[Element, Element]> = [[source, prompt], [prompt, engine], [engine, generate]];
    for (const [before, after] of orderedRegions) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getAllByRole('button', { name: /playground.video.generate/ })).toHaveLength(1);
    const result = screen.getByRole('heading', { name: 'playground.video.resultTitle', hidden: true });
    expect(result).not.toBeVisible();
    expect(result.closest('.playground-workspace__output')).not.toBeNull();
    expect(composer).not.toContainElement(result);
    expect(screen.getByRole('heading', { name: 'playground.video.recentTitle' })
      .closest('.playground-workspace__output')).not.toBeNull();
    expect(screen.getByText('Scene / first-frame image')).toBeVisible();
    expect(screen.getByText('Uploaded Character Look Sheet')).toBeVisible();
    expect(screen.getByText('Lalin')).toBeVisible();
    expect(screen.getByText('Image 1')).toBeVisible();
    const thumbnails = composer!.querySelectorAll('.playground-video-reference-summary__thumbnail img');
    expect(Array.from(thumbnails).map(image => image.getAttribute('src')))
      .toEqual(['/outputs/frame.png', '/outputs/look.png']);
    fireEvent.error(thumbnails[0]!);
    expect(composer!.querySelectorAll('.playground-video-reference-summary__thumbnail img')).toHaveLength(1);
    expect(composer!.querySelector('.playground-video-reference-summary__thumbnail svg')).not.toBeNull();
    expect(screen.queryByText('reference_image')).not.toBeInTheDocument();
    expect(screen.queryByText('multimodal_reference')).not.toBeInTheDocument();
  });

  it.each([
    { status: 'completed', publicUrl: '/outputs/complete.mp4', collapsed: true },
    { status: 'completed', publicUrl: null, collapsed: false },
    { status: 'failed', publicUrl: null, collapsed: false },
  ])('folds Video only when a successful task has usable media: $status/$publicUrl', async ({status,publicUrl,collapsed}) => {
    const task = { id: 'task-one', status, outputAsset: publicUrl ? { publicUrl } : null };
    mocks.submit.mockResolvedValue(task);
    mocks.task.mockResolvedValue(task);
    mount(); await ready();
    const toggle=document.querySelector('.playground-workspace__setup-toggle')!;
    expect(toggle).toHaveAttribute('aria-expanded','true');
    fireEvent.click(screen.getByRole('button',{name:/playground.video.generate/}));
    await waitFor(()=>expect(mocks.task).toHaveBeenCalled());
    await waitFor(()=>expect(toggle).toHaveAttribute('aria-expanded',collapsed?'false':'true'));
    expect(screen.getByRole('heading',{name:'playground.video.resultTitle'})).toBeVisible();
    if(collapsed){
      fireEvent.click(screen.getByRole('button',{name:'playground.options.returnToSettings'}));
      await waitFor(()=>expect(toggle).toHaveAttribute('aria-expanded','true'));
      expect(screen.getByRole('textbox',{name:'Prompt'})).toBeVisible();
    }
  });

  it('keeps async restored completed Video expanded on entry and cached tab return', async () => {
    const completed = { id: 'restored-video', status: 'completed', outputAsset: { publicUrl: '/outputs/restored.mp4' } };
    let resolve!: (value: typeof completed) => void;
    mocks.task.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue(completed);
    restoreDraft({ activeTaskId: completed.id, prompt: 'Restored direction' });
    const view = mount();
    await screen.findByTestId('model');
    await waitFor(() => expect(mocks.task).toHaveBeenCalled());
    expect(document.querySelector('.playground-workspace__setup-toggle')).toHaveAttribute('aria-expanded', 'true');
    await act(async () => resolve(completed));
    await screen.findByTitle(completed.id);
    expect(document.querySelector('.playground-workspace__setup-toggle')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(document.querySelector('.playground-workspace__setup-toggle')!);
    view.tab(false);
    view.tab(true);
    await screen.findByTitle(completed.id);
    expect(document.querySelector('.playground-workspace__setup-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Restored direction');
    expect(mocks.submit).not.toHaveBeenCalled();
    view.unmount(); view.client.clear();
  });

  it('collapses an observed active restored Video on completion, but preserves reopen during polling', async () => {
    restoreDraft({ activeTaskId: 'task-one', prompt: 'Restored direction' });
    const view = mount();
    await screen.findByTitle('task-one');
    const completed = { id: 'task-one', status: 'completed', outputAsset: { publicUrl: '/outputs/new.mp4' } };
    mocks.task.mockResolvedValue(completed);
    await act(async () => { await view.client.refetchQueries({ queryKey: ['video-task', 'alice', 'task-one'] }); });
    const toggle = document.querySelector('.playground-workspace__setup-toggle')!;
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
    fireEvent.click(toggle);
    await act(async () => { await view.client.refetchQueries({ queryKey: ['video-task', 'alice', 'task-one'] }); });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Restored direction');
    view.unmount(); view.client.clear();
  });

  it('discards a deferred Video success when a newer submission fails while the old output remains', async () => {
    const view = mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await screen.findByTitle('task-one');
    const prompt = screen.getByRole('textbox', { name: 'Prompt' });
    act(() => prompt.focus());
    const completed = { id: 'task-one', status: 'completed', outputAsset: { publicUrl: '/outputs/new.mp4' } };
    mocks.task.mockResolvedValue(completed);
    await act(async () => { await view.client.refetchQueries({ queryKey: ['video-task', 'alice', 'task-one'] }); });
    const toggle = document.querySelector('.playground-workspace__setup-toggle')!;
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    mocks.submit.mockRejectedValueOnce(new Error('New submission failed'));
    const generate = screen.getByRole('button', { name: /playground.video.generate/ });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.mouseDown(generate);
    act(() => generate.focus());
    await act(async () => { await new Promise<void>(done => requestAnimationFrame(() => done())); });
    expect(generate).toBeVisible();
    fireEvent.mouseUp(generate);
    fireEvent.click(generate);
    await waitFor(() => expect(view.client.getMutationCache().getAll().at(-1)?.state.status).toBe('error'));
    expect(mocks.submit).toHaveBeenCalledTimes(2);
    await act(async () => { await view.client.refetchQueries({ queryKey: ['video-task', 'alice', 'task-one'] }); });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Small motion');
    expect(document.querySelector('.playground-video-result-media video source')).toHaveAttribute('src', expect.stringContaining('/outputs/new.mp4'));
    view.unmount(); view.client.clear();
  });

  it('asks before spending and sends the confirmed quote only after consent', async () => {
    mocks.ask = true; mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' })); });
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'ui.creditConsent.confirm' }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0]?.[0]).toMatchObject({ estimateId: 'quote', requestFingerprint: 'quote-fingerprint' });
  });
  it('shows the server estimate as a maximum only for usage-based quotes', async () => {
    mocks.quote.mockResolvedValue({
      estimate: { estimateId: 'usage-quote', estimatedCredits: 30, chargeMode: 'actual_usage', expiresAt: '2099-01-01' },
      account: { canAfford: true }, requestFingerprint: 'usage-fingerprint',
    });
    mount();
    await ready();
    expect(screen.getByTestId('model')).toHaveAttribute('data-maximum-credit-estimate', 'true');
    expect(screen.getAllByText('Up to 30 Credits')).toHaveLength(1);
    expect(screen.getByText('Up to 30 Credits').closest('.playground-workspace__action')).not.toBeNull();
    expect(screen.getByRole('button', { name: /playground.video.generate/ })).toHaveTextContent('Up to 30 Credits');
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('shows one pending quote with the shared spinner beside a disabled Generate', async () => {
    mocks.quote.mockReturnValue(new Promise(() => {}));
    mount();
    await screen.findByTestId('model');
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Quote this motion' } });
    const pending = await screen.findByText('playground.estimate.loading');
    const quote = pending.closest('.engine-target-panel__video-quote')!;
    expect(quote).toHaveAttribute('aria-busy', 'true');
    expect(quote.querySelector('[data-processing-spinner="true"]')).not.toBeNull();
    expect(quote.closest('.playground-workspace__action')).not.toBeNull();
    expect(screen.getAllByText('playground.video.creditEstimate')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /playground.video.generate/ })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it.each(['error', 'insufficient'])('keeps quote %s feedback visible beside Generate', async state => {
    if (state === 'error') mocks.quote.mockRejectedValue(new Error('Quote unavailable'));
    else mocks.quote.mockResolvedValue({
      estimate: { estimateId: 'unaffordable', estimatedCredits: 50, expiresAt: '2099-01-01' },
      account: { canAfford: false }, requestFingerprint: 'unaffordable-fingerprint',
    });
    mount();
    await screen.findByTestId('model');
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Quote this motion' } });
    const feedback = await screen.findByText(state === 'error' ? 'Quote unavailable' : 'playground.estimate.insufficient');
    expect(feedback).toBeVisible();
    expect(feedback.closest('.playground-workspace__action')).not.toBeNull();
    if (state === 'error') expect(feedback).toHaveAttribute('role', 'alert');
    expect(screen.getAllByText('playground.video.creditEstimate')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /playground.video.generate/ })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('uses the server-owned 8000-character Video prompt limit', async () => {
    mocks.catalog.mockResolvedValue({
      models: [model],
      comparison: { enabled: false },
      promptMaximumCharacters: 8000,
    });
    mount();
    const prompt = await screen.findByLabelText('Prompt');
    expect(prompt).toHaveAttribute('maxlength', '8000');
  });
  it('refreshes an expired quote without submitting a paid request', async () => {
    mocks.quote.mockResolvedValue({
      estimate: { estimateId: 'expired', estimatedCredits: 1, expiresAt: '2000-01-01' },
      account: { canAfford: true }, requestFingerprint: 'old',
    });
    mount();
    await ready();
    const previous = mocks.quote.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await waitFor(() => expect(mocks.quote.mock.calls.length).toBeGreaterThan(previous));
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('quotes and submits the same two references and fingerprint, blocking duplicates/active tasks', async () => {
    mount();
    await ready();
    const quoteInput = mocks.quote.mock.calls.at(-1)?.[0];
    expect(quoteInput.references).toHaveLength(2);
    const button = screen.getByRole('button', {
      name: /playground.video.generate/,
    });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0]?.[0]).toMatchObject({
      ...quoteInput,
      requestFingerprint: 'quote-fingerprint',
      estimateId: 'quote',
    });
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByTestId('model')).toHaveTextContent('seedance');
  });
  it('does not silently switch models or quote unsupported reference modes', async () => {
    mocks.catalog.mockResolvedValue({
      models: [{ ...model, inputModes: ['text_to_video'] }],
      comparison: { enabled: false },
    });
    mount();
    await screen.findByTestId('model');
    changeOperation('character_to_video');
    await expandReferences();
    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Test' },
    });
    expect(
      screen.getAllByText('playground.video.references.unsupportedMode')[0],
    ).toBeVisible();
    expect(screen.getByTestId('model')).toHaveTextContent('seedance');
    expect(mocks.quote).not.toHaveBeenCalled();
  });
  it('sends only first frame in image mode and shows terminal provider request ID', async () => {
    mocks.submit.mockResolvedValue({
      id: 'failed-task',
      status: 'failed',
      providerError: {
        code: 'video_provider_input_image_rejected',
        providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
        providerRequestId: 'request-123',
        referenceIssue: { contentIndex: 1, referenceIndex: 0, reason: 'possible_real_person' },
      },
    });
    mocks.task.mockResolvedValue({
      id: 'failed-task',
      status: 'failed',
      providerError: {
        code: 'video_provider_input_image_rejected',
        providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
        providerRequestId: 'request-123',
        referenceIssue: { contentIndex: 1, referenceIndex: 0, reason: 'possible_real_person' },
      },
    });
    mount();
    await ready('image_to_video');
    fireEvent.click(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.submit.mock.calls[0]?.[0].references).toEqual([
      {
        role: 'first_frame',
        purpose: 'opening_frame',
        referenceImageUrl: '/outputs/frame.png',
      },
    ]);
    expect(await screen.findByText(/request-123/)).toBeVisible();
    expect(screen.getByText('playground.video.providerError.possibleRealPerson: 1')).toBeVisible();
    const source = screen.getByRole('button', { name: 'Attach' });
    expect(source).toHaveAttribute('data-invalid-frame', 'true');
    const rejected = document.querySelector('.playground-video-reference-summary__list li.is-rejected');
    expect(rejected).toHaveTextContent('Image 1');
    expect(rejected).toHaveTextContent('playground.options.referenceRejected');
    fireEvent.click(source);
    await waitFor(() => expect(source).toHaveAttribute('data-invalid-frame', 'false'));
    expect(document.querySelector('.playground-video-reference-summary__list li.is-rejected')).toBeNull();
  });

  it('navigates once on submission and explicitly between stable result and tools regions without changing the draft', async () => {
    mount(); await ready();
    const prompt = screen.getByLabelText('Prompt');
    const result = document.getElementById('generation-video-results')!;
    const tools = document.querySelector('.playground-workspace__tools-frame')!;
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.focusRegion).toHaveBeenCalledTimes(1);
    expect(mocks.focusRegion).toHaveBeenLastCalledWith(result);
    fireEvent.click(screen.getByRole('button', { name: 'playground.options.returnToSettings' }));
    expect(mocks.focusRegion).toHaveBeenLastCalledWith(tools);
    expect(tools).toHaveFocus();
    expect(prompt).not.toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'playground.options.viewResult' }));
    expect(mocks.focusRegion).toHaveBeenLastCalledWith(result);
    expect(result).toHaveFocus();
    expect(mocks.focusRegion).toHaveBeenCalledTimes(3);
    expect(mocks.cancelFocus).toHaveBeenCalledTimes(2);
    expect(prompt).toHaveValue('Small motion');
    expect(screen.getByRole('combobox', { name: 'playground.video.sourceTitle' })).toHaveValue('character_to_video');
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it.each(['completed', 'reconciliation_required'])('does not refocus on late %s updates or polling while editing', async status => {
    const { client } = mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await waitFor(() => expect(screen.getByTitle('task-one')).toBeInTheDocument());
    const prompt = screen.getByLabelText('Prompt');
    prompt.focus();
    fireEvent.change(prompt, { target: { value: 'The next direction' } });
    const terminal = { id: 'task-one', status,
      ...(status === 'completed' ? { outputAsset: { publicUrl: '/outputs/video.mp4' } } : {}) };
    await act(async () => { client.setQueryData(['video-task', 'alice', 'task-one'], terminal); });
    await act(async () => { client.setQueryData(['video-task', 'alice', 'task-one'], { ...terminal, completedAt: '2026-10-02' }); });
    expect(mocks.focusRegion).toHaveBeenCalledTimes(1);
    expect(prompt).toHaveFocus();
    expect(prompt).toHaveValue('The next direction');
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('selects Recent without changing authoring inputs or scheduling result focus', async () => {
    const previous = { id: 'previous-task', status: 'completed', modelId: 'previous-model',
      outputAsset: { publicUrl: '/outputs/previous.mp4' } };
    mocks.recent.mockResolvedValue({ items: [previous] });
    mocks.task.mockResolvedValue(previous);
    mount(); await ready();
    const snapshot = mocks.quote.mock.calls.at(-1)?.[0];
    const prompt = screen.getByLabelText('Prompt');
    prompt.focus();
    fireEvent.click(await screen.findByRole('button', { name: /previous-model/ }));
    await waitFor(() => expect(screen.getByTitle('previous-task')).toBeInTheDocument());
    expect(prompt).toHaveValue('Small motion');
    expect(prompt).toHaveFocus();
    expect(screen.getByTestId('model')).toHaveTextContent('seedance');
    expect(mocks.quote.mock.calls.at(-1)?.[0]).toEqual(snapshot);
    expect(mocks.focusRegion).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('presents provider processing as a bounded friendly task status', async () => {
    mocks.submit.mockResolvedValue({ id: 'task-processing', status: 'provider_processing' });
    mocks.task.mockResolvedValue({ id: 'task-processing', status: 'provider_processing' });
    mount();
    await screen.findByTestId('model');
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Small motion' },
    });
    await waitFor(() => expect(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    ).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    expect(await screen.findByText('playground.video.taskStatus.processing')).toBeVisible();
    expect(screen.getByTitle('task-processing')).toHaveTextContent('task-processing');
    expect(screen.queryByText(/provider_processing\s*·/)).not.toBeInTheDocument();
  });
});
