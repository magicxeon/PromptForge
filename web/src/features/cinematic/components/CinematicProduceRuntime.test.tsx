import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  updateCinematicShotMotionDirection: vi.fn()
}));
const generationApi = vi.hoisted(() => ({ getVideoTask: vi.fn() }));

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
    await i18n.use(initReactI18next).init({ lng: 'en', resources: { en: { cinematic: {}, playground: {}, 'react-ui': {} } }, keySeparator: false });
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
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled();
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
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled();
    expect(screen.queryByText('cinematic.produce.portraitAuthorizationTitle')).not.toBeInTheDocument();
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
        providerError: { code: 'InputImageSensitiveContentDetected.PrivacyInformation' }
      }
    });
    renderRuntime();

    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    const generateButton = screen.getByRole('button', { name: 'cinematic.produce.generate' });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    expect(await screen.findByText('cinematic.produce.portraitRejectedTitle')).toBeVisible();
    expect(screen.getByText('cinematic.produce.portraitAuthorizationRefunded')).toBeVisible();
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
    expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled();
    expect(screen.queryByText('cinematic.produce.generating')).not.toBeInTheDocument();
  });
});

function renderRuntime(project = projectFixture(), onOpenStage = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><CinematicStageContent
    activeStage="produce"
    project={project}
    onPrevious={vi.fn()}
    onNext={vi.fn()}
    onOpenStage={onOpenStage}
  /></I18nextProvider></QueryClientProvider>);
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
