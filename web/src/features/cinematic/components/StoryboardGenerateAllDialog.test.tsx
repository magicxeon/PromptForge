import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import {
  readStoryboardEnginePreference,
  writeStoryboardEnginePreference
} from '../state/storyboardEnginePreference';
import { StoryboardGenerateAllDialog } from './StoryboardGenerateAllDialog';

const mocks = vi.hoisted(() => ({
  actorId: 'usr_alice', skipConsent: true,
  getProviderCatalog: vi.fn(),
  estimateGeneration: vi.fn(),
  getContext: vi.fn(),
  submitBatch: vi.fn()
}));

vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: mocks.actorId, username: 'alice', role: 'user' } })
}));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actorId }));
vi.mock('../../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({
  isSuccess: true, isFetching: false, data: { confirmCreditUsage: !mocks.skipConsent }, save: vi.fn()
}) }));

vi.mock('../../generation/api/generationApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../generation/api/generationApi')>(),
  getProviderCatalog: mocks.getProviderCatalog,
  estimateGeneration: mocks.estimateGeneration
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  getCinematicStoryboardGenerationContext: mocks.getContext,
  submitCinematicStoryboardBatch: mocks.submitBatch
}));

const testI18n = i18next.createInstance();

describe('StoryboardGenerateAllDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { cinematic: {}, playground: {} } },
      keySeparator: false,
      returnNull: false,
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    mocks.actorId = 'usr_alice'; mocks.skipConsent = true;
    localStorage.clear();
    mocks.getProviderCatalog.mockReset();
    mocks.estimateGeneration.mockReset();
    mocks.getContext.mockReset();
    mocks.submitBatch.mockReset();
    mocks.getProviderCatalog.mockResolvedValue({
      defaultProvider: 'gemini',
      providers: [{
        id: 'gemini',
        displayName: 'Gemini',
        defaultModel: 'image-model',
        models: [{
          id: 'image-model',
          displayName: 'Image Model',
          capabilities: {
            imageGeneration: true,
            imageEdit: true,
            imageReferences: true,
            maxReferenceImages: 4,
            streaming: false,
            aspectRatios: ['9:16'],
            resolutions: ['1K']
          },
          defaults: { resolution: '1K' },
          pricingStatus: 'priced',
          qualificationStatus: 'qualified',
          paidRoutingEnabled: true
        }]
      }, {
        id: 'meta-muse',
        displayName: 'Meta Muse',
        defaultModel: 'muse-image-1.0',
        models: [{
          id: 'muse-image-1.0',
          displayName: 'Muse Image 1.0',
          capabilities: {
            imageGeneration: true,
            imageEdit: false,
            imageReferences: false,
            maxReferenceImages: 0,
            streaming: false,
            aspectRatios: ['9:16'],
            resolutions: ['1K']
          },
          defaults: { resolution: '1K' },
          pricingStatus: 'priced',
          qualificationStatus: 'qualified',
          paidRoutingEnabled: true
        }]
      }]
    });
    mocks.getContext.mockImplementation(async (_projectId: string, sceneId: string, shotId: string) => ({
      schemaVersion: 1,
      projectId: 'cineproj_batch',
      projectVersion: 3,
      sceneId,
      shotId,
      shotVersion: 1,
      characterProfileContext: null,
      references: { outfit_front: null, outfit_back: null, style_reference: null },
      cast: [],
      looks: [],
      continuitySource: null,
      keyframeContract: {
        sourceFingerprint: `keyframe_${shotId}`,
        providerIndependentPrompt: `STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1\n\nKEYFRAME MOMENT:\n${shotId}`
      },
      generationEligible: true,
      blockingReason: null
    }));
    mocks.estimateGeneration.mockResolvedValue({
      estimate: {
        estimateId: 'estimate_storyboard',
        estimatedCredits: 12,
        expiresAt: Date.now() + 60_000
      },
      account: { availableCredits: 100, canAfford: true }
    });
    mocks.submitBatch.mockResolvedValue({
      batchId: 'ggrp_storyboard',
      groupId: 'ggrp_storyboard',
      status: 'queued',
      requestedOutputCount: 1,
      acceptedCount: 1,
      failedCount: 0,
      children: [{
        operationId: 'shot_pending',
        sceneId: 'scene_1',
        shotId: 'shot_pending',
        jobId: 'job_storyboard',
        status: 'planned',
        error: null
      }]
    });
  });

  function setupConsent() {
    mocks.skipConsent = false;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const project = projectFixture();
    const ui = (open = true, value = project) => <QueryClientProvider client={client}><I18nextProvider i18n={testI18n}>
      <StoryboardGenerateAllDialog open={open} onOpenChange={vi.fn()} project={value} />
    </I18nextProvider></QueryClientProvider>;
    const view = render(ui());
    return { client, change: (open = true, value = project) => view.rerender(ui(open, value)) };
  }
  async function requestConsent() {
    const generate = screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    await screen.findByRole('alertdialog');
  }
  it('real shared consent cancels without spending and confirms the reviewed quote once', async () => {
    setupConsent(); await requestConsent();
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
    expect(screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' })).not.toBeChecked();
    await requestConsent();
    const approve = screen.getByRole('button', { name: 'ui.creditConsent.confirm' });
    fireEvent.click(approve); fireEvent.click(approve);
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]![1].operations[0].estimateId).toBe('estimate_storyboard');
    expect(mocks.estimateGeneration).toHaveBeenCalledTimes(1);
  });
  it.each(['actor', 'project', 'close'])('invalidates batch consent on %s changes', async change => {
    const view = setupConsent(); await requestConsent();
    if (change === 'actor') mocks.actorId = 'usr_bob';
    view.change(change !== 'close', change === 'project' ? { ...projectFixture(), version: 4 } : projectFixture());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });
  it('invalidates consent when a fresh quote changes price, then requires new confirmation', async () => {
    const view = setupConsent(); await requestConsent();
    mocks.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'new-price', estimatedCredits: 20, expiresAt: Date.now() + 60_000 },
      account: { availableCredits: 100, canAfford: true } });
    await view.client.invalidateQueries({ queryKey: ['cinematic-storyboard-batch-quotes'] });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    await requestConsent(); fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]![1].operations[0].estimateId).toBe('new-price');
  });
  it('invalidates consent when the selected regeneration scope changes', async () => {
    setupConsent();
    const scope = screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' });
    await requestConsent();
    fireEvent.click(scope);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    await screen.findByText('24 cinematic.cost.credits');
    await requestConsent(); fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]![1].operations).toHaveLength(2);
  });
  it('opt-out never bypasses scope selection or unavailable estimates', async () => {
    setupConsent(); mocks.skipConsent = true;
    await screen.findByText('12 cinematic.cost.credits');
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    mocks.estimateGeneration.mockRejectedValue(new Error('No price'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' }));
    await screen.findByText('No price');
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' })).toBeDisabled();
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });
  it('zero-credit bulk still requires explicit confirmation despite opt-out', async () => {
    mocks.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'free', estimatedCredits: 0, expiresAt: Date.now() + 60_000 },
      account: { availableCredits: 100, canAfford: true } });
    setupConsent();
    const generate = screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    fireEvent.click(generate); fireEvent.click(generate);
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('blocks expired quotes and enables generation only after explicit refresh', async () => {
    mocks.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'expired', estimatedCredits: 12, expiresAt: Date.now() - 1 }, account: { availableCredits: 100 } });
    setupConsent();
    await screen.findByText('cinematic.storyboard.batch.quoteExpired');
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' })).toBeDisabled();
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    mocks.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'fresh', estimatedCredits: 12, expiresAt: new Date(Date.now() + 60_000).toISOString() }, account: { availableCredits: 100 } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.refresh' }));
    await requestConsent();
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });

  it('quotes eligible Shots once and submits one server-owned batch command', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog
          open
          onOpenChange={vi.fn()}
          project={projectFixture()}
        />
      </I18nextProvider>
    </QueryClientProvider>);

    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    expect(mocks.getContext).toHaveBeenCalledTimes(1);
    expect(mocks.estimateGeneration).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' })).not.toBeChecked();
    expect(mocks.getContext).not.toHaveBeenCalledWith('cineproj_batch', 'scene_1', 'shot_approved');

    fireEvent.click(screen.getByRole('button', {
      name: 'cinematic.storyboard.batch.generate'
    }));
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    const submitted = mocks.submitBatch.mock.calls[0]?.[1];
    expect(submitted?.operations).toHaveLength(1);
    expect(submitted?.operations[0]).toEqual(expect.objectContaining({
      sceneId: 'scene_1',
      shotId: 'shot_pending',
      keyframeContractFingerprint: 'keyframe_shot_pending',
      estimateId: 'estimate_storyboard',
      draft: expect.objectContaining({
        prompt: expect.stringContaining('STORYBOARD KEYFRAME CONTRACT'),
        cinematicCaptureProfileId: 'photorealistic-cinematic'
      })
    }));
    expect(await screen.findByText('cinematic.storyboard.batch.queued')).toBeVisible();
  });

  it('quotes and submits a direct Cast sheet as identity without inventing a Character Profile', async () => {
    const context = await mocks.getContext('cineproj_batch', 'scene_1', 'shot_pending');
    context.references.character_reference = '/outputs/direct-cast-sheet.png';
    mocks.getContext.mockResolvedValue(context);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);
    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    const expected = expect.objectContaining({
      characterProfileContext: null,
      references: { character_reference: '/outputs/direct-cast-sheet.png' },
      characterReferenceOutfitBehavior: 'preserve'
    });
    expect(mocks.estimateGeneration).toHaveBeenCalledWith(expected);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' }));
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]?.[1].operations[0].draft).toEqual(expected);
  });

  it('excludes Playground-only models from the Cinematic selector', async () => {
    const catalog = await mocks.getProviderCatalog();
    catalog.providers.find((provider: { id: string }) => provider.id === 'meta-muse')
      .models[0].allowedGenerationSurfaces = ['playground'];
    mocks.getProviderCatalog.mockResolvedValue(catalog);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);
    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Meta Muse' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gemini' })).toBeInTheDocument();
  });

  it('requotes approved Shots only after opt-in and retains their source on submission', async () => {
    const project = projectFixture();
    const source = structuredClone(project.scenes[0]!.shots[1]!.approvedStoryboardSource);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={project} />
      </I18nextProvider>
    </QueryClientProvider>);
    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();

    const scope = screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' });
    fireEvent.click(scope);
    expect(await screen.findByText('24 cinematic.cost.credits')).toBeVisible();
    expect(mocks.getContext).toHaveBeenCalledWith('cineproj_batch', 'scene_1', 'shot_approved');
    expect(screen.getByText('cinematic.storyboard.batch.approvedIncluded')).toBeVisible();
    expect(mocks.submitBatch).not.toHaveBeenCalled();

    fireEvent.click(scope);
    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    expect(screen.getByText('cinematic.storyboard.batch.approvedSkipped')).toBeVisible();
    fireEvent.click(scope);
    const generate = screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]?.[1]?.operations.map((item: { shotId: string }) => item.shotId))
      .toEqual(['shot_pending', 'shot_approved']);
    expect(project.scenes[0]!.shots[1]!.approvedStoryboardSource).toEqual(source);
  });

  it('allows an all-approved board to quote and generate new review candidates', async () => {
    const project = projectFixture();
    project.scenes[0]!.shots = [project.scenes[0]!.shots[1]!];
    project.scenes[0]!.shotOrder = ['shot_approved'];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={project} />
      </I18nextProvider>
    </QueryClientProvider>);
    const generate = screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' });
    expect(generate).toBeDisabled();
    expect(mocks.estimateGeneration).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' }));
    await waitFor(() => expect(generate).toBeEnabled());
    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    fireEvent.click(generate);
    if (screen.queryByRole('alertdialog')) {
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    }
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    expect(mocks.submitBatch.mock.calls[0]?.[1]?.operations).toEqual([
      expect.objectContaining({ shotId: 'shot_approved', estimateId: 'estimate_storyboard' })
    ]);
  });

  it('does not submit an old quote while the expanded scope is being quoted or fails', async () => {
    const project = projectFixture();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={project} />
      </I18nextProvider>
    </QueryClientProvider>);
    const generate = screen.getByRole('button', { name: 'cinematic.storyboard.batch.generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    let rejectQuote!: (cause: Error) => void;
    mocks.estimateGeneration.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectQuote = reject; }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'cinematic.storyboard.batch.includeApproved' }));
    await waitFor(() => expect(rejectQuote).toBeTypeOf('function'));
    expect(generate).toBeDisabled();
    rejectQuote(new Error('Quote unavailable'));
    expect(await screen.findByText('Quote unavailable')).toBeVisible();
    expect(generate).toBeDisabled();
    fireEvent.click(generate);
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });

  it('restores the actor-scoped provider and model before quoting', async () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'meta-muse', submodel: 'muse-image-1.0' })
    ));
  });

  it('falls back to the saved provider default when its saved model was removed', async () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'removed-model'
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'meta-muse', submodel: 'muse-image-1.0' })
    ));
  });

  it('falls back to the catalog default when the saved provider was removed', async () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'removed-provider',
      model: 'removed-model'
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', submodel: 'image-model' })
    ));
  });

  it('requotes every eligible Shot when natural realism is disabled', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    const toggle = await screen.findByRole('switch', {
      name: 'cinematic.storyboard.naturalRealism'
    });
    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ cinematicCaptureProfileId: 'photorealistic-cinematic' })
    ));
    mocks.estimateGeneration.mockClear();
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ cinematicCaptureProfileId: null })
    ));
  });

  it('persists the engine only after the batch submission accepts work', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    expect(await screen.findByText('12 cinematic.cost.credits')).toBeVisible();
    expect(readStoryboardEnginePreference('usr_alice')).toBeNull();

    fireEvent.click(screen.getByRole('button', {
      name: 'cinematic.storyboard.batch.generate'
    }));
    fireEvent.click(screen.getByRole('button', { name: 'ui.creditConsent.confirm' }));
    await waitFor(() => expect(readStoryboardEnginePreference('usr_alice')).toEqual({
      provider: 'gemini',
      model: 'image-model'
    }));
  });

  it('falls back when the saved model cannot carry the required references', async () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    mocks.getContext.mockImplementation(async (_projectId: string, sceneId: string, shotId: string) => ({
      ...await generationContextWithReference(sceneId, shotId)
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <StoryboardGenerateAllDialog open onOpenChange={vi.fn()} project={projectFixture()} />
      </I18nextProvider>
    </QueryClientProvider>);

    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'gemini', submodel: 'image-model' })
    ));
  });
});

async function generationContextWithReference(sceneId: string, shotId: string) {
  return {
    schemaVersion: 1,
    projectId: 'cineproj_batch',
    projectVersion: 3,
    sceneId,
    shotId,
    shotVersion: 1,
    characterProfileContext: null,
    references: { outfit_front: '/reference.webp', outfit_back: null, style_reference: null },
    cast: [],
    looks: [],
    continuitySource: null,
    keyframeContract: {
      sourceFingerprint: `keyframe_${shotId}`,
      providerIndependentPrompt: `STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1\n\nKEYFRAME MOMENT:\n${shotId}`
    },
    generationEligible: true,
    blockingReason: null
  };
}

function projectFixture() {
  const shot = (id: string, approved = false) => ({
    id,
    version: 1,
    orderKey: approved ? 2 : 1,
    title: id,
    purpose: 'Advance the story',
    durationMs: 4000,
    framing: 'medium',
    cameraAngle: 'eye-level',
    cameraMovement: 'locked',
    lensIntent: 'natural',
    blocking: 'Character waits',
    performance: 'restrained',
    gaze: 'off camera',
    lighting: 'soft',
    environment: 'station',
    audioIntent: 'ambient',
    prompt: 'A cinematic frame',
    castAssignmentIds: [],
    wardrobeLookIds: [],
    continuityNotes: [],
    storyboardStatus: approved ? 'ready' : 'draft',
    ...(approved ? {
      approvedStoryboardSource: {
        assetVersionId: 'asset_approved',
        sourceJobId: 'job_approved',
        sourceFingerprint: 'fingerprint',
        imageUrl: '/outputs/approved.webp',
        thumbnailUrl: '/outputs/approved.webp',
        approvedAt: new Date(0).toISOString()
      }
    } : {})
  });
  return {
    id: 'cineproj_batch',
    projectId: 'cineproj_batch',
    version: 3,
    aspectRatio: '9:16',
    castAssignments: [],
    scenes: [{
      id: 'scene_1',
      version: 1,
      orderKey: 1,
      beatId: 'beat_1',
      title: 'Arrival',
      purpose: 'Begin',
      storyChange: 'Decision begins',
      location: 'Station',
      time: 'Night',
      emotionalStart: 'uncertain',
      emotionalEnd: 'resolved',
      transitionIntent: 'cut',
      castAssignmentIds: [],
      wardrobeLookIds: [],
      blocking: '',
      lighting: '',
      performance: '',
      audioIntent: '',
      continuityNotes: [],
      shots: [shot('shot_pending'), shot('shot_approved', true)],
      shotOrder: ['shot_pending', 'shot_approved'],
      durationMs: 8000
    }]
  } as unknown as CinematicProject;
}
