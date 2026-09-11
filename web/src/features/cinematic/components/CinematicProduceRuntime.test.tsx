import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { ApiError } from '../../../lib/api/apiError';
import { CinematicStageContent } from './CinematicStageContent';

const api = vi.hoisted(() => ({
  getCinematicProduceContext: vi.fn(),
  getCinematicVideoCapabilityCatalog: vi.fn(),
  quoteCinematicVideoAttempt: vi.fn(),
  createCinematicVideoAttempt: vi.fn(),
  approveCinematicVideoAttempt: vi.fn(),
  updateCinematicShotMotionDirection: vi.fn(),
  updateCinematicShotVideoReferences: vi.fn()
}));
const generationApi = vi.hoisted(() => ({ getVideoTask: vi.fn() }));

vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  ...api
}));

vi.mock('../../generation/api/videoGenerationApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../generation/api/videoGenerationApi')>(),
  getVideoTask: generationApi.getVideoTask
}));

const i18n = i18next.createInstance();

describe('Cinematic Produce runtime workspace', () => {
  beforeAll(async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    await i18n.use(initReactI18next).init({
      lng: 'en', keySeparator: false, interpolation: { prefix: '{', suffix: '}' },
      resources: { en: { cinematic: {
        'cinematic.produce.providerErrorCode': 'Error: {code}',
        'cinematic.produce.sourceCheckModel': 'Selected Video model: {model}',
        'cinematic.produce.providerRequestId': 'Provider request ID: {id}'
      }, playground: {}, 'react-ui': {} } }
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    generationApi.getVideoTask.mockReset();
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue({
      schemaVersion: 3,
      catalogVersion: 'test',
      mediaType: 'video',
      launchStatus: 'qualification_blocked',
      comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 },
      models: [{
        providerId: 'modelark', modelId: 'seedance-test', displayName: 'Seedance Test',
        operations: ['image_to_video'], commercialOperations: ['cinematic_draft_clip'], inputModes: ['image_to_video'],
        durationControlMode: 'exact', durations: [4], resolutions: ['720p'], aspectRatios: ['9:16'], audioModes: ['none'],
        referenceImageLimit: 1, supportsFirstFrame: true, supportsLastFrame: false,
        portraitReferencePolicy: 'provider_generated_asset_required',
        qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
      }]
    });
    api.getCinematicProduceContext.mockResolvedValue(produceContext());
    api.updateCinematicShotVideoReferences.mockImplementation(async (_project, _scene, _shot, input) => {
      const updated = projectFixture();
      updated.version = input.expectedVersion + 1;
      updated.scenes[0]!.shots[0]!.videoReferenceMode = input.referenceMode;
      updated.scenes[0]!.shots[0]!.lastFirstFrameMode = input.referenceMode === 'looks_only' ? 'storyboard_and_looks' : input.referenceMode;
      return updated;
    });
    api.quoteCinematicVideoAttempt.mockResolvedValue({
      estimate: { estimateId: 'estimate-1', estimatedCredits: 24, expiresAt: new Date(Date.now() + 60_000).toISOString(), breakdown: {} },
      account: { availableCredits: 100, canAfford: true },
      requestFingerprint: 'request-1', projectId: 'project-1', sceneId: 'scene-1', shotId: 'shot-1', shotVersion: 1,
      sourceFingerprint: 'source-1', videoPacketFingerprint: 'packet-1', approvedStoryboardAssetVersionId: 'asset-version-1'
    });
    api.updateCinematicShotMotionDirection.mockResolvedValue({
      ...projectFixture(),
      version: 5,
      scenes: [{
        ...projectFixture().scenes[0]!,
        shots: [{ ...projectFixture().scenes[0]!.shots[0]!, version: 2, additionalMotionDirection: 'Use a slower push-in.' }]
      }]
    });
  });

  it('shows immutable Story order, media-first review and the shared render panel', async () => {
    renderRuntime();

    expect(await screen.findByText('cinematic.produce.readinessTitle')).toBeVisible();
    const queue = screen.getByLabelText('cinematic.produce.shotQueue');
    expect(within(queue).getByRole('button', { name: 'cinematic.storyboard.selectShot shot-1' })).toBeVisible();
    expect(within(queue).queryByRole('button', { name: /moveEarlier/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'cinematic.produce.approvedKeyframe' })).toHaveAttribute('src', '/source-1.jpg');
    expect(screen.getAllByText('Hold the CLOSED sign')).not.toHaveLength(0);
    await waitFor(() => {
      expect(document.querySelector('.cinematic-produce-render-panel .engine-target-panel--compact')).toBeInTheDocument();
    });
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
  });

  it('requotes an explicit multi-reference selection and displays the exact mapped provider prompt', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    catalog.models[0].referenceImageLimit = 9;
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const initialQuote = await api.quoteCinematicVideoAttempt();
    api.quoteCinematicVideoAttempt.mockImplementation(async (_project, _scene, _shot, input) => ({
      ...initialQuote, referenceMode: input.referenceMode,
      renderedPrompt: input.referenceMode === 'storyboard_and_looks' ? 'Image 1 scene; Image 2 Nara; Image 3 Mai.' : 'Exact single-frame provider prompt.',
      referenceSummary: input.referenceMode === 'storyboard_and_looks' ? [
        { imageNumber: 1, assetId: 'board', purpose: 'storyboard_opening', roleName: null, lookName: null, previewUrl: '/board.jpg' },
        { imageNumber: 2, assetId: 'look-a', purpose: 'character_look', roleName: 'Nara', lookName: 'Cafe', previewUrl: '/look-a.jpg' },
        { imageNumber: 3, assetId: 'look-b', purpose: 'character_look', roleName: 'Mai', lookName: 'Visitor', previewUrl: '/look-b.jpg' }
      ] : []
    }));
    api.createCinematicVideoAttempt.mockResolvedValue({ attemptId: 'attempt-multi', task: { id: 'task-multi', status: 'provider_queued' } });
    generationApi.getVideoTask.mockResolvedValue({ id: 'task-multi', status: 'provider_queued' });
    renderRuntime();
    const select = await screen.findByRole('combobox', { name: 'cinematic.produce.references.mode' });
    expect(select).toHaveTextContent('cinematic.produce.references.single');
    fireEvent.keyDown(select, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'cinematic.produce.references.multiple' }));
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenLastCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'storyboard_and_looks' })));
    expect(await screen.findByText('Nara / Cafe')).toBeVisible();
    expect(screen.getByText('Mai / Visitor')).toBeVisible();
    expect(screen.getByLabelText('cinematic.produce.prompt')).toHaveValue('Image 1 scene; Image 2 Nara; Image 3 Mai.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.generate' }));
    await waitFor(() => expect(api.createCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'storyboard_and_looks', requestFingerprint: 'request-1' })));
  });

  it('requires compatible Seedream provenance only for Character shots and offers Storyboard recovery', async () => {
    const context = produceContext();
    (context.videoPacket.authority.characters as unknown[]).push({ assignmentId: 'cast-1' });
    api.getCinematicProduceContext.mockResolvedValue(context);
    api.quoteCinematicVideoAttempt.mockRejectedValue(new ApiError({
      status: 409,
      code: 'video_provider_synthetic_character_source_required',
      message: 'Compatible Seedream source required.'
    }));
    const onOpenStage = vi.fn();

    renderRuntime(projectFixture(), onOpenStage);

    expect(await screen.findByText('cinematic.produce.portraitAuthorizationTitle')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.seedreamRecovery' }));
    expect(onOpenStage).toHaveBeenCalledWith('storyboard');
  });

  it('turns First Frame off without deleting its preview, requotes and restores the saved on-mode', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    project.scenes[0]!.shots[0]!.videoReferenceMode = 'storyboard_and_looks';
    renderRuntime(project);
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useFirstFrame' });
    fireEvent.click(toggle);
    await waitFor(() => expect(api.updateCinematicShotVideoReferences).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'looks_only' })));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenLastCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'looks_only', sourceFingerprint: null })));
    expect(screen.getByRole('img', { name: 'cinematic.produce.approvedKeyframe' })).toHaveAttribute('src', '/source-1.jpg');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() => expect(api.updateCinematicShotVideoReferences).toHaveBeenLastCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'storyboard_and_looks' })));
  });

  it('proposes sheets-only for an unconfigured no-frame Shot on a compatible model without auto-generating', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    delete project.scenes[0]!.shots[0]!.approvedStoryboardSource;
    api.getCinematicProduceContext.mockResolvedValue({ ...produceContext(), approvedStoryboardSource: null, referenceMode: 'looks_only' });
    renderRuntime(project);
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenLastCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'looks_only', sourceFingerprint: null })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(api.updateCinematicShotVideoReferences).not.toHaveBeenCalled();
  });

  it('keeps stored First Frame off on an unsupported model and blocks rather than silently switching', async () => {
    const project = projectFixture();
    project.scenes[0]!.shots[0]!.videoReferenceMode = 'looks_only';
    renderRuntime(project);
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useFirstFrame' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByText('cinematic.produce.references.unsupported')[0]).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeDisabled();
    expect(api.quoteCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(api.updateCinematicShotVideoReferences).not.toHaveBeenCalled();
  });

  it('enables Generate for a Character shot with a currently compatible Seedream source', async () => {
    const context = produceContext();
    (context.videoPacket.authority.characters as unknown[]).push({ assignmentId: 'cast-1' });
    Object.assign(context.approvedStoryboardSource, {
      videoCompatibility: {
        targetId: 'modelark-seedance-2',
        status: 'eligible_internal_testing',
        reasonCode: null,
        sourceProviderId: 'modelark',
        sourceModelId: 'dola-seedream-5-0-pro-260628',
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        originalBytesPreserved: true
      }
    });
    api.getCinematicProduceContext.mockResolvedValue(context);

    renderRuntime();

    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(screen.queryByText('cinematic.produce.portraitAuthorizationTitle')).not.toBeInTheDocument();
  });

  it('distinguishes model portrait authorization and preserves the approved frame without offering regeneration', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models.push({ ...catalog.models[0], modelId: 'compatible-seedance', displayName: 'Compatible Seedance' });
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const goodQuote = await api.quoteCinematicVideoAttempt();
    api.quoteCinematicVideoAttempt.mockClear();
    api.quoteCinematicVideoAttempt.mockRejectedValue(new ApiError({ status: 409,
      code: 'video_provider_portrait_authorization_required', message: 'The selected model requires an authorized portrait Asset.' }));
    const onOpenStage = vi.fn();
    renderRuntime(projectFixture(), onOpenStage);
    const title = await screen.findByText('cinematic.produce.modelAuthorizationTitle');
    const alert = title.closest('[role="alert"]')!;
    expect(within(alert as HTMLElement).getByText('The selected model requires an authorized portrait Asset.')).toBeVisible();
    expect(within(alert as HTMLElement).getByText('Error: video_provider_portrait_authorization_required')).toBeVisible();
    expect(within(alert as HTMLElement).getByText('Selected Video model: Seedance Test')).toBeVisible();
    expect(screen.queryByText('cinematic.produce.portraitAuthorizationTitle')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cinematic.produce.seedreamRecovery' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'cinematic.produce.approvedKeyframe' })).toHaveAttribute('src', '/source-1.jpg');
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeDisabled();
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(onOpenStage).not.toHaveBeenCalled();
    api.quoteCinematicVideoAttempt.mockResolvedValue(goodQuote);
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.engine.model' }), { target: { value: 'modelark:compatible-seedance' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(screen.queryByText('cinematic.produce.modelAuthorizationTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'cinematic.produce.approvedKeyframe' })).toHaveAttribute('src', '/source-1.jpg');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('shows a trusted-source failure beside the approved preview without submitting work', async () => {
    api.quoteCinematicVideoAttempt.mockRejectedValue(new ApiError({ status: 409,
      code: 'video_trusted_source_unavailable', message: 'Trusted reference unavailable: expired' }));
    renderRuntime();
    const title = await screen.findByText('cinematic.produce.portraitAuthorizationTitle');
    const alert = title.closest('[role="alert"]')!;
    expect(within(alert as HTMLElement).getByText('Trusted reference unavailable: expired')).toBeVisible();
    expect(within(alert as HTMLElement).getByText('Error: video_trusted_source_unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeDisabled();
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('shows progress as soon as the video submit request starts', async () => {
    api.createCinematicVideoAttempt.mockImplementation(() => new Promise(() => undefined));
    renderRuntime();

    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    const generateButton = screen.getByRole('button', { name: 'cinematic.produce.generate' });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    expect((await screen.findAllByText('cinematic.produce.submitting'))[0]).toBeVisible();
    expect(screen.getAllByText('cinematic.produce.generating').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'cinematic.produce.generating' })).toBeDisabled();
  });

  it('shows an immediate failed and refunded Seedance task without waiting for another task fetch', async () => {
    generationApi.getVideoTask.mockImplementation(() => new Promise(() => undefined));
    api.createCinematicVideoAttempt.mockResolvedValue({
      attemptId: 'video-attempt-rejected',
      task: {
        id: 'video-task-rejected', status: 'failed', billingStatus: 'refunded',
        providerId: 'modelark', modelId: 'seedance-test',
        providerError: {
          code: 'video_provider_input_image_rejected',
          providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
          providerRequestId: 'provider-request-123'
        }
      }
    });
    renderRuntime();

    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    const generateButton = screen.getByRole('button', { name: 'cinematic.produce.generate' });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    expect(await screen.findByText('cinematic.produce.portraitRejectedTitle')).toBeVisible();
    expect(screen.getByText('cinematic.produce.portraitAuthorizationRefunded')).toBeVisible();
    expect(screen.getByText('Error: InputImageSensitiveContentDetected.PrivacyInformation')).toBeVisible();
    expect(screen.getByText('Provider request ID: provider-request-123')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'cinematic.produce.portraitRejectedRecovery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cinematic.produce.portraitAuthorizationRecovery' })).not.toBeInTheDocument();
    expect(generationApi.getVideoTask).toHaveBeenCalledWith('video-task-rejected');
  });

  it('opens read-only rough sequence gaps without quoting or submitting again', async () => {
    renderRuntime();
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.reviewSequence' }));
    expect(await screen.findByText('cinematic.produce.sequenceGap')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.shot 1: Closed cafe' })).toBeVisible();
    expect(screen.queryByText('shot-1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.openShot' }));
    await waitFor(() => expect(screen.queryByText('cinematic.produce.sequenceGap')).not.toBeInTheDocument());
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it.each(['provider_processing', 'media_copying', 'media_retry_pending', 'reconciliation_required'])(
    'prevents a second paid submission while the task is %s', async status => {
      generationApi.getVideoTask.mockResolvedValue({
        id: 'video-task-1', status, billingStatus: 'reserved',
        providerId: 'modelark', modelId: 'seedance-test'
      });
      const project = projectFixture();
      project.generationAttempts = [{
        id: 'video-attempt-1', operation: 'cinematic_draft_clip', shotId: 'shot-1',
        generationJobId: 'video-task-1', status, videoPacketFingerprint: 'packet-1'
      }];
      renderRuntime(project);
      const reconciling = status === 'reconciliation_required';
      const button = await screen.findByRole('button', {
        name: reconciling ? 'cinematic.produce.generate' : 'cinematic.produce.generating'
      });
      expect(button).toBeDisabled();
      if (reconciling) expect(await screen.findByText('cinematic.produce.reconciliationRequired')).toBeVisible();
      fireEvent.click(button);
      expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    }
  );

  it('blocks stale quote submission during refresh and shows the actual quote failure', async () => {
    const { queryClient } = renderRuntime();
    const button = await screen.findByRole('button', { name: 'cinematic.produce.generate' });
    await waitFor(() => expect(button).toBeEnabled());
    let rejectQuote!: (error: Error) => void;
    api.quoteCinematicVideoAttempt.mockImplementation(() => new Promise((_resolve, reject) => { rejectQuote = reject; }));
    act(() => { void queryClient.invalidateQueries({ queryKey: ['cinematic-video-quote'] }); });
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getAllByText('cinematic.produce.preparingQuote')[0]).toBeVisible();
    act(() => rejectQuote(new Error('The provider quote is unavailable.')));
    expect((await screen.findAllByText('The provider quote is unavailable.'))[0]).toBeVisible();
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('shows insufficient Credits as the reason Generate is disabled', async () => {
    api.quoteCinematicVideoAttempt.mockResolvedValue({
      estimate: { estimateId: 'estimate-1', estimatedCredits: 24, breakdown: {} },
      account: { availableCredits: 0, canAfford: false }, requestFingerprint: 'request-1'
    });
    renderRuntime();
    expect(await screen.findByText('cinematic.produce.insufficientCredits')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeDisabled();
  });

  it('saves a structured motion correction without compiling a prompt in React', async () => {
    renderRuntime();
    const input = await screen.findByLabelText('cinematic.produce.additionalMotionDirection');
    fireEvent.change(input, { target: { value: 'Use a slower push-in.' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.saveMotionDirection' }));

    await waitFor(() => expect(api.updateCinematicShotMotionDirection).toHaveBeenCalledWith(
      'project-1',
      'scene-1',
      'shot-1',
      expect.objectContaining({
        expectedVersion: 4,
        expectedShotVersion: 1,
        additionalMotionDirection: 'Use a slower push-in.'
      })
    ));
  });

  it('projects a completed provider task into the playable video preview without another submit', async () => {
    generationApi.getVideoTask.mockResolvedValue({
      id: 'video-task-1', status: 'completed', billingStatus: 'captured',
      providerId: 'modelark', modelId: 'seedance-test', durationSeconds: 4,
      aspectRatio: '9:16', resolution: '720p', createdAt: '2026-09-04T00:00:00.000Z',
      completedAt: '2026-09-04T00:00:04.000Z',
      outputAsset: {
        id: 'video-asset-1', publicUrl: '/outputs/cinematic/clip.mp4', posterUrl: null,
        technicalProbe: { status: 'passed', durationSeconds: 4, width: 720, height: 1280, fps: 24 }
      }
    });
    const project = projectFixture();
    project.generationAttempts = [{
      id: 'video-attempt-1', operation: 'cinematic_draft_clip', shotId: 'shot-1',
      generationJobId: 'video-task-1', videoPacketFingerprint: 'packet-1'
    }];

    renderRuntime(project);

    await waitFor(() => expect(generationApi.getVideoTask).toHaveBeenCalledWith('video-task-1'));
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
    const video = document.querySelector('video');
    expect(video?.querySelector('source')).toHaveAttribute('src', '/outputs/cinematic/clip.mp4');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('keeps the approved keyframe and selected Seedance model after a prior privacy rejection', async () => {
    api.createCinematicVideoAttempt.mockReset();
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue({
      schemaVersion: 3,
      catalogVersion: 'portrait-recovery-test',
      mediaType: 'video',
      launchStatus: 'qualification_blocked',
      comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 },
      models: [
        {
          providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615', displayName: 'Seedance 2.0 Mini',
          operations: ['image_to_video'], commercialOperations: ['cinematic_draft_clip'], inputModes: ['image_to_video'],
          durationControlMode: 'exact', durations: [4], resolutions: ['720p'], aspectRatios: ['9:16'], audioModes: ['none'],
          referenceImageLimit: 1, supportsFirstFrame: true, supportsLastFrame: false,
          portraitReferencePolicy: 'provider_authorized_asset_required',
          qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
        },
        {
          providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview', displayName: 'Veo 3.1 Lite',
          operations: ['image_to_video'], commercialOperations: ['cinematic_draft_clip'], inputModes: ['image_to_video'],
          durationControlMode: 'exact', durations: [4], resolutions: ['720p'], aspectRatios: ['9:16'], audioModes: ['generated'],
          referenceImageLimit: 1, supportsFirstFrame: true, supportsLastFrame: false,
          qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
        }
      ]
    });
    generationApi.getVideoTask.mockResolvedValue({
      id: 'video-task-portrait', status: 'failed', billingStatus: 'refunded',
      providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
      providerError: { code: 'InputImageSensitiveContentDetected.PrivacyInformation' }
    });
    api.quoteCinematicVideoAttempt.mockImplementation((_projectId, _sceneId, _shotId, input) => {
      if (input.providerId === 'modelark') {
        return Promise.reject(new ApiError({
          status: 409,
          code: 'video_provider_portrait_authorization_required',
          message: 'Authorized portrait required.'
        }));
      }
      return Promise.resolve({
        estimate: { estimateId: 'estimate-veo', estimatedCredits: 24, expiresAt: new Date(Date.now() + 60_000).toISOString(), breakdown: {} },
        account: { availableCredits: 100, canAfford: true },
        requestFingerprint: 'request-veo'
      });
    });
    const project = projectFixture();
    project.generationAttempts = [{
      id: 'video-attempt-portrait', operation: 'cinematic_draft_clip', shotId: 'shot-1',
      generationJobId: 'video-task-portrait', providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
      videoPacketFingerprint: 'packet-1'
    }];

    renderRuntime(project);

    expect(await screen.findByText('cinematic.produce.portraitRejectedTitle')).toBeVisible();
    expect(screen.getByText('cinematic.produce.portraitAuthorizationRefunded')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'cinematic.produce.portraitRejectedRecovery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'cinematic.produce.portraitAuthorizationRecovery' })).not.toBeInTheDocument();
    expect(api.quoteCinematicVideoAttempt).not.toHaveBeenCalledWith(
      'project-1', 'scene-1', 'shot-1', expect.objectContaining({ providerId: 'gemini' })
    );
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('does not keep Generate blocked when a terminal attempt task cannot be reloaded', async () => {
    generationApi.getVideoTask.mockRejectedValue(new Error('Historical task unavailable.'));
    const project = projectFixture();
    project.generationAttempts = [{
      id: 'video-attempt-failed', operation: 'cinematic_draft_clip', shotId: 'shot-1',
      generationJobId: 'video-task-missing', status: 'failed', videoPacketFingerprint: 'packet-1'
    }];

    renderRuntime(project);

    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(screen.queryByText('cinematic.produce.generating')).not.toBeInTheDocument();
  });
});

function renderRuntime(project = projectFixture(), onOpenStage = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><CinematicStageContent
    activeStage="produce"
    project={project}
    onPrevious={vi.fn()}
    onNext={vi.fn()}
    onOpenStage={onOpenStage}
  /></I18nextProvider></QueryClientProvider>);
  return { ...view, queryClient };
}

function projectFixture() {
  return {
    id: 'project-1', projectId: 'project-1', version: 4, aspectRatio: '9:16', durationTargetMs: 4000,
    scenes: [{
      id: 'scene-1', version: 1, orderKey: 1, title: 'Cafe close', durationMs: 4000,
      location: 'Cafe', time: 'Blue hour', emotionalStart: 'Alone', emotionalEnd: 'Hesitant', transitionIntent: 'Cut',
      castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [], purpose: 'Establish loss', shots: [{
        id: 'shot-1', version: 1, orderKey: 1, title: 'Closed cafe', purpose: 'Establish loss', coverageRole: 'establishing',
        visibleMoment: 'Nara stands alone', subjectAction: 'Hold the CLOSED sign', emotionalTarget: 'Restrained loneliness', performanceCue: 'Lowered chin',
        durationMs: 4000, framing: 'medium-wide', cameraAngle: 'eye level', cameraMovement: 'slow push', lensIntent: 'natural',
        blocking: 'frame right', performance: 'restrained', gaze: 'exit', lighting: 'blue dusk', environment: 'dry cafe', audioIntent: 'rain',
        prompt: 'Approved direction', continuityEntry: 'still', continuityExit: 'phone ready', transitionToNext: 'cut to hand',
        estimatedActionDurationMs: 3500, dialogueCues: [], audioCues: [], castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [],
        storyboardStatus: 'approved', approvedStoryboardSource: { imageUrl: '/source-1.jpg', assetId: 'asset-1', assetVersionId: 'asset-version-1', sourceJobId: 'job-image-1', sourceFingerprint: 'source-1' }
      }]
    }],
    castAssignments: [], generationAttempts: []
  } as unknown as CinematicProject;
}

function produceContext() {
  return {
    projectId: 'project-1', projectVersion: 4, sceneId: 'scene-1', shotId: 'shot-1', shotVersion: 1,
    approvedStoryboardSource: { imageUrl: '/source-1.jpg', assetId: 'asset-1', assetVersionId: 'asset-version-1', sourceJobId: 'job-image-1', sourceFingerprint: 'source-1' },
    generationEligible: true, blockingReason: null,
    videoPacket: {
      contractVersion: 'cinematic-video-packet-v2', projectId: 'project-1', projectVersion: 4, sceneId: 'scene-1', sceneVersion: 1, shotId: 'shot-1', shotVersion: 1,
      keyframeContractFingerprint: 'keyframe-1', approvedKeyframeContractFingerprint: 'keyframe-1', approvedStoryboardSourceFingerprint: 'source-1',
      timing: { plannedDurationMs: 4000, estimatedActionDurationMs: 3500 },
      referenceStrategy: { mode: 'first_frame', firstFrameAssetVersionId: 'asset-version-1', firstFrameSourceFingerprint: 'source-1', lastFrameAssetVersionId: null, additionalReferenceAssetIds: [] },
      authority: { characters: [], looks: [] },
      motion: { visibleStart: 'Nara stands alone', primaryAction: 'Hold the CLOSED sign', visibleEnd: 'phone ready', cameraMovement: 'slow push', blocking: 'frame right', screenDirection: 'right' },
      performance: { emotionalTarget: 'Restrained loneliness', direction: 'restrained', observableCue: 'Lowered chin', gaze: 'exit' },
      environment: { location: 'Cafe', time: 'Blue hour', lighting: 'blue dusk', environment: 'dry cafe', propContinuity: 'sign in right hand' },
      continuity: { entry: 'still', exit: 'phone ready', transitionToNext: 'cut to hand', notes: [] },
      audio: { intent: 'rain', dialogueCues: [], audioCues: [] }, authorDirection: '', prohibitions: [],
      provenance: { policyId: 'policy', policyVersion: 2 }, findings: [], packetFingerprint: 'packet-1', renderedPromptFingerprint: 'prompt-1', providerIndependentPrompt: 'CINEMATIC VIDEO EXECUTION PACKET'
    },
    directingContract: { visibleMoment: 'Nara stands alone', subjectAction: 'Hold the CLOSED sign', emotionalTarget: 'Restrained loneliness', performanceCue: 'Lowered chin', continuityEntry: 'still', continuityExit: 'phone ready', transitionToNext: 'cut to hand', dialogueCues: [], audioCues: [], characterAliases: [] },
    videoAttempts: [], timelineDependencyStatus: 'current'
  };
}
