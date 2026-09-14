import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { cinematicVideoQuoteSchema } from '../schemas/cinematicSchemas';
import { ApiError } from '../../../lib/api/apiError';
import { persistActiveActorId } from '../../../lib/auth/actorStore';
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
const authRole = vi.hoisted(() => ({ value: 'user' }));

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

vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_demo', role: authRole.value } })
}));

const i18n = i18next.createInstance();

describe('Cinematic Produce runtime workspace', () => {
  it.each(['shot', 'scene'])('keeps a late submission bound to its original %s and actor cache', async target => {
    const response = { attemptId: 'late-attempt', task: { id: 'late-task', status: 'provider_processing' } };
    const pending = deferred<typeof response>();
    api.createCinematicVideoAttempt.mockReturnValue(pending.promise);
    generationApi.getVideoTask.mockResolvedValue(response.task);
    const project = projectFixture();
    const secondShot = { ...project.scenes[0]!.shots[0]!, id: 'shot-2', title: 'Second shot' };
    if (target === 'shot') project.scenes[0]!.shots.push(secondShot);
    else project.scenes.push({ ...project.scenes[0]!, id: 'scene-2', shots: [secondShot] });
    const { queryClient, onProjectRefresh } = renderRuntime(project);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.generate' }));
    await waitFor(() => expect(api.createCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1',
      expect.objectContaining({ estimateId: 'estimate-1', durationSeconds: 4, requestFingerprint: 'request-1' })));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-2' }));
    await act(async () => pending.resolve(response));
    await waitFor(() => expect(onProjectRefresh).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryData(['video-task', 'usr_demo', 'late-task'])).toEqual(response.task);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['generation-job-center', 'usr_demo'] });
    expect(generationApi.getVideoTask).not.toHaveBeenCalled();
    expect(screen.queryByText('cinematic.produce.generating')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-1' }));
    await waitFor(() => expect(generationApi.getVideoTask).toHaveBeenCalledWith('late-task'));
    expect(api.createCinematicVideoAttempt).toHaveBeenCalledTimes(1);
  });

  it.each(['actor', 'project', 'unmount'])('ignores a late submission after %s ownership changes', async change => {
    const response = { attemptId: 'late-attempt', task: { id: 'late-task', status: 'provider_processing' } };
    const pending = deferred<typeof response>();
    api.createCinematicVideoAttempt.mockReturnValue(pending.promise);
    const { queryClient, onProjectRefresh, rerenderProject, unmount } = renderRuntime();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.produce.generate' }));
    await waitFor(() => expect(api.createCinematicVideoAttempt).toHaveBeenCalledTimes(1));
    if (change === 'actor') {
      persistActiveActorId('actor-b');
      queryClient.clear();
      rerenderProject(projectFixture());
    } else if (change === 'project') rerenderProject({ ...projectFixture(), id: 'project-b' });
    else unmount();
    await act(async () => pending.resolve(response));
    expect(queryClient.getQueryData(['video-task', 'usr_demo', 'late-task'])).toBeUndefined();
    expect(queryClient.getQueryData(['video-task', 'actor-b', 'late-task'])).toBeUndefined();
    expect(onProjectRefresh).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['generation-job-center', 'actor-b'] });
    expect(generationApi.getVideoTask).not.toHaveBeenCalled();
  });

  it('explicitly rechecks the same task once and preserves an older Take and motion draft', async () => {
    const review = reviewTask();
    const completed = { ...review, status: 'completed', reviewRequired: false, recheckAllowed: false,
      outputAsset: { publicUrl: '/recovered.mp4' } };
    const pending = deferred<typeof completed>();
    generationApi.getVideoTask.mockImplementation((id, options) => options?.recheck ? pending.promise
      : Promise.resolve(id === 'old-task' ? { id, status: 'completed', outputAsset: { publicUrl: '/old.mp4' } } : review));
    const project = reviewProject();
    project.generationAttempts.unshift({ id: 'old-take', shotId: 'shot-1', operation: 'cinematic_draft_clip',
      generationJobId: 'old-task', status: 'completed' });
    const { queryClient, onProjectRefresh } = renderRuntime(project);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const button = await screen.findByRole('button', { name: 'cinematic.produce.recheckStatus' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(document.querySelectorAll('.cinematic-take')[1]!);
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/old.mp4'));
    const video = document.querySelector('video');
    const draft = screen.getByLabelText('cinematic.produce.additionalMotionDirection');
    fireEvent.change(draft, { target: { value: 'Keep this unsaved direction.' } });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.rechecking' })).toBeDisabled());
    fireEvent.click(button);
    expect(generationApi.getVideoTask.mock.calls.filter(([, options]) => options?.recheck)).toEqual([['review-task', { recheck: true }]]);
    expect(document.querySelector('video')).toBe(video);
    await act(async () => pending.resolve(completed));
    await waitFor(() => expect(onProjectRefresh).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryData(['video-task', 'usr_demo', 'review-task'])).toEqual(completed);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['generation-job-center', 'usr_demo'] });
    expect(document.querySelector('video source')).toHaveAttribute('src', '/old.mp4');
    expect(draft).toHaveValue('Keep this unsaved direction.');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it.each(['actor', 'project'])('ignores a late explicit recheck after an %s switch', async change => {
    const completed = { ...reviewTask(), status: 'completed', outputAsset: { publicUrl: '/private-a.mp4' } };
    const pending = deferred<typeof completed>();
    generationApi.getVideoTask.mockImplementation((_id, options) => options?.recheck ? pending.promise : Promise.resolve(reviewTask()));
    const { queryClient, onProjectRefresh, rerenderProject } = renderRuntime(reviewProject());
    const button = await screen.findByRole('button', { name: 'cinematic.produce.recheckStatus' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(generationApi.getVideoTask).toHaveBeenCalledWith('review-task', { recheck: true }));
    if (change === 'actor') persistActiveActorId('actor-b');
    queryClient.clear();
    rerenderProject({ ...projectFixture(), id: change === 'project' ? 'project-b' : 'project-1' });
    await act(async () => pending.resolve(completed));
    expect(queryClient.getQueryData(['video-task', 'usr_demo', 'review-task'])).toBeUndefined();
    expect(queryClient.getQueryData(['video-task', 'actor-b', 'review-task'])).toBeUndefined();
    expect(onProjectRefresh).not.toHaveBeenCalled();
    expect(document.querySelector('video')).toBeNull();
  });

  it.each(['cooldown', 'exhausted', 'financial'])('keeps explicit recheck disabled for %s without resubmission', async reason => {
    const review = reviewTask();
    review.recheckAllowed = false;
    if (reason === 'cooldown') review.recovery.explicitNextCheckAt = new Date(Date.now() + 60_000).toISOString();
    if (reason === 'exhausted') review.recovery.explicitCheckCount = 3;
    generationApi.getVideoTask.mockResolvedValue(review);
    renderRuntime(reviewProject());
    const button = await screen.findByRole('button', { name: 'cinematic.produce.recheckStatus' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(generationApi.getVideoTask.mock.calls.some(([, options]) => options?.recheck)).toBe(false);
    expect(screen.queryByText('cinematic.produce.attemptFailed')).not.toBeInTheDocument();
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('refreshes eligibility once at cooldown expiry using an ordinary read', async () => {
    const review = reviewTask();
    review.recheckAllowed = false;
    review.recovery.explicitNextCheckAt = new Date(Date.now() + 350).toISOString();
    generationApi.getVideoTask.mockResolvedValueOnce(review).mockResolvedValue({ ...review, recheckAllowed: true });
    renderRuntime(reviewProject());
    const button = await screen.findByRole('button', { name: 'cinematic.produce.recheckStatus' });
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).toBeEnabled());
    expect(generationApi.getVideoTask.mock.calls).toEqual([['review-task'], ['review-task']]);
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('shows a recheck transport failure without automatically retrying or replacing media', async () => {
    generationApi.getVideoTask.mockImplementation((_id, options) => options?.recheck
      ? Promise.reject(new Error('Status unavailable.')) : Promise.resolve({ ...reviewTask(), outputAsset: { publicUrl: '/retained.mp4' } }));
    renderRuntime(reviewProject());
    const button = await screen.findByRole('button', { name: 'cinematic.produce.recheckStatus' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Status unavailable.')).toBeVisible();
    expect(document.querySelector('video source')).toHaveAttribute('src', '/retained.mp4');
    expect(generationApi.getVideoTask.mock.calls.filter(([, options]) => options?.recheck)).toHaveLength(1);
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });
  it('keeps an explicit shorter Take duration while switching Shots and requotes the chosen duration', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].durations = [4, 8];
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    project.scenes[0]!.shots[0]!.durationMs = 8000;
    project.scenes[0]!.shots.push({ ...project.scenes[0]!.shots[0]!, id: 'shot-2', title: 'Second shot' });
    renderRuntime(project);
    const duration = await screen.findByRole('combobox', { name: 'playground.video.duration' });
    expect(duration).toHaveValue('8');
    fireEvent.change(duration, { target: { value: '4' } });
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenLastCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ durationSeconds: 4 })));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-2' }));
    expect(duration).toHaveValue('8');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-1' }));
    expect(duration).toHaveValue('4');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('switches the actual player node between Takes and never carries it into an empty Shot', async () => {
    const project = projectFixture();
    project.scenes[0]!.shots.push({ ...project.scenes[0]!.shots[0]!, id: 'shot-2', title: 'Empty shot' });
    project.generationAttempts = [1, 2].map(n => ({ id: `take-${n}`, shotId: 'shot-1', operation: 'cinematic_draft_clip',
      status: 'completed', generationJobId: `videotask_${n}`, createdAt: `2026-09-13T10:0${n}:00Z`, outputAsset: { publicUrl: `/take-${n}.mp4` } }));
    generationApi.getVideoTask.mockImplementation(async id => ({ id, status: 'completed', billingStatus: 'captured',
      outputAsset: { publicUrl: `/take-${id.endsWith('1') ? 1 : 2}.mp4`, technicalProbe: { status: 'passed' } } }));
    renderRuntime(project);
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/take-2.mp4'));
    const outgoing = document.querySelector('video')!;
    fireEvent.click(within(screen.getByRole('region', { name: 'cinematic.takes.title' })).getAllByRole('button')[1]!);
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/take-1.mp4'));
    await waitFor(() => expect(document.querySelector('video')).not.toBe(outgoing));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.selectShot shot-2' }));
    await waitFor(() => expect(document.querySelector('video')).toBeNull());
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
  });
  it('shows usable four seconds, opening buffer and the actual priced five-second render', async () => {
    const originalQuote = await api.quoteCinematicVideoAttempt();
    api.quoteCinematicVideoAttempt.mockResolvedValue({ ...originalQuote,
      usableRange: { leadInMs: 500, usableDurationMs: 4000, trimInMs: 500, trimOutMs: 4500 },
      durationReconciliation: { plannedDurationSeconds: 4.5, renderDurationSeconds: 5, trimDurationSeconds: 0.5,
        durationControlMode: 'exact', strategy: 'pad_and_trim', supportedDurations: [4, 5, 6], requiresSplit: false, reasonCode: 'video_duration_padded_for_provider' }
    });
    renderRuntime(projectFixture());
    await screen.findByText('cinematic.produce.leadIn');
    const summary = screen.getByText('cinematic.produce.leadIn').closest('dl')!;
    expect(summary).toHaveTextContent('cinematic.produce.plannedDuration4s');
    expect(summary).toHaveTextContent('cinematic.produce.leadIn0.5s');
    expect(summary).toHaveTextContent('cinematic.produce.renderDuration5s');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });
  it('accepts a parsed storyboard composition quote and enables Generate with correct reference labels', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].firstFrameEnabled = false;
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.videoReferenceMode = 'storyboard_and_looks';
    shot.approvedStoryboardSource!.storyboardRenderStyle = 'faceless_previs_v1';
    const rawQuote = { ...await api.quoteCinematicVideoAttempt(), referenceSummary: [
      { imageNumber: 1, assetId: 'board', purpose: 'storyboard_composition', roleName: null, lookName: null, previewUrl: '/board.png' },
      { imageNumber: 2, assetId: 'look', purpose: 'generated_look', roleName: 'Lalin', lookName: 'Florist', previewUrl: '/look.png' }
    ] };
    api.quoteCinematicVideoAttempt.mockImplementation(async () => cinematicVideoQuoteSchema.parse(rawQuote));
    renderRuntime(project);
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    fireEvent.click(await screen.findByText('cinematic.produce.references.title'));
    const references = within(document.querySelector('.cinematic-produce-references')!).getAllByRole('listitem');
    expect(references[0]).toHaveTextContent('cinematic.produce.references.storyboard');
    expect(references[1]).toHaveTextContent('cinematic.produce.references.look');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('action duration estimate warning still quotes and enables Generate for an approved faceless source', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].firstFrameEnabled = false;
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.estimatedActionDurationMs = 5000;
    shot.videoReferenceMode = 'storyboard_and_looks';
    shot.approvedStoryboardSource!.storyboardRenderStyle = 'faceless_previs_v1';
    const context = produceContext();
    api.getCinematicProduceContext.mockResolvedValue({ ...context,
      videoPacket: { ...context.videoPacket,
        timing: { plannedDurationMs: 4000, estimatedActionDurationMs: 5000 },
        findings: [{ code: 'cinematic_video_action_overflow', severity: 'warning', fieldPath: 'shot.estimatedActionDurationMs' }]
      }
    });
    renderRuntime(project);
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'storyboard_and_looks', durationSeconds: 4 })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(shot.approvedStoryboardSource!.imageUrl).toBe('/source-1.jpg');
  });

  it.each(['concept_sketch_v1', 'photorealistic_storyboard_v1', 'faceless_previs_v1', 'white_previs_v1'] as const)('offers %s composition and Generate with Seedance first frames disabled', async style => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].firstFrameEnabled = false;
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].audioModes = ['none', 'generated'];
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.approvedStoryboardSource!.storyboardRenderStyle = style;
    shot.videoReferenceMode = 'storyboard_and_looks';
    renderRuntime(project);
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useSketch' });
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'storyboard_and_looks', audioMode: 'generated' })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('previews a previous-plan Take without approving it against a different Shot', async () => {
    const project = projectFixture();
    project.generationAttempts = [{ id: 'previous-plan-take', shotId: 'removed-shot', operation: 'cinematic_draft_clip', status: 'completed', generationJobId: 'videotask_previous_plan', videoPacketFingerprint: 'packet-1' }];
    generationApi.getVideoTask.mockResolvedValue({ id: 'videotask_previous_plan', status: 'completed', billingStatus: 'captured', outputAsset: { publicUrl: '/previous-plan.mp4', technicalProbe: { status: 'passed' } } });
    renderRuntime(project);
    const history = screen.getByText(/cinematic.takes.previousPlan/).closest('details')!;
    fireEvent.click(within(history).getByRole('button'));
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/previous-plan.mp4'));
    expect(screen.queryByRole('button', { name: 'cinematic.takes.use' })).not.toBeInTheDocument();
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });
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
    authRole.value = 'user';
    vi.clearAllMocks();
    localStorage.clear();
    generationApi.getVideoTask.mockReset();
    api.createCinematicVideoAttempt.mockReset();
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
      updated.scenes[0]!.shots[0]!.lastFirstFrameMode = ['looks_only', 'text_only'].includes(input.referenceMode) ? 'storyboard_and_looks' : input.referenceMode;
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

  it('previews and selects an older Take while the latest task remains observed', async () => {
    const project = projectFixture();
    project.generationAttempts = [
      { id: 'old-take', shotId: 'shot-1', operation: 'cinematic_draft_clip', status: 'completed', generationJobId: 'old-task', videoPacketFingerprint: 'packet-1' },
      { id: 'new-take', shotId: 'shot-1', operation: 'cinematic_draft_clip', status: 'provider_processing', generationJobId: 'new-task', videoPacketFingerprint: 'packet-1' }
    ];
    generationApi.getVideoTask.mockImplementation(async id => id === 'old-task'
      ? { id, status: 'completed', billingStatus: 'captured', outputAsset: { id: 'old-asset', publicUrl: '/old-clip.mp4', technicalProbe: { status: 'passed' } } }
      : { id, status: 'provider_processing', billingStatus: 'reserved' });
    api.approveCinematicVideoAttempt.mockResolvedValue(produceContext());
    renderRuntime(project);
    await waitFor(() => expect(generationApi.getVideoTask).toHaveBeenCalledWith('new-task'));
    fireEvent.click(document.querySelectorAll('.cinematic-take')[1]!);
    await waitFor(() => expect(generationApi.getVideoTask).toHaveBeenCalledWith('old-task'));
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/old-clip.mp4'));
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.takes.use' }));
    await waitFor(() => expect(api.approveCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', 'old-take', 4));
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('disabled Seedance First Frame exposes a ready no-Cast text route without removing the saved still', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].firstFrameEnabled = false;
    catalog.models[0].inputModes.push('text_to_video');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    renderRuntime(project);
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useFirstFrame' });
    await waitFor(() => expect(toggle).toBeDisabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(api.quoteCinematicVideoAttempt).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'text_only', sourceFingerprint: null })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.produce.generate' })).toBeEnabled());
    expect(project.scenes[0]!.shots[0]!.approvedStoryboardSource?.imageUrl).toBe('/source-1.jpg');
    expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
  });

  it('shows the shared processing indicator immediately before the Project refresh returns', async () => {
    api.createCinematicVideoAttempt.mockResolvedValue({ attemptId: 'new-take', task: { id: 'new-task', status: 'provider_processing', billingStatus: 'reserved' } });
    generationApi.getVideoTask.mockResolvedValue({ id: 'new-task', status: 'provider_processing', billingStatus: 'reserved' });
    renderRuntime(projectFixture());
    const generate = await screen.findByRole('button', { name: 'cinematic.produce.generate' });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    await waitFor(() => expect(document.querySelector('.cinematic-produce-media .generation-stage-state')).toHaveAttribute('aria-busy', 'true'));
    expect(document.querySelector('.cinematic-produce-media .generation-loading-indicator')).toBeInTheDocument();
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
    authRole.value = 'admin';
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
    fireEvent.click(await screen.findByText('cinematic.produce.references.title'));
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

  it('turns First Frame off without deleting its saved image, requotes and restores the saved on-mode', async () => {
    const catalog = await api.getCinematicVideoCapabilityCatalog();
    catalog.models[0].supportsCinematicLookReferences = true;
    catalog.models[0].inputModes.push('multimodal_reference');
    api.getCinematicVideoCapabilityCatalog.mockResolvedValue(catalog);
    const project = projectFixture();
    project.scenes[0]!.shots[0]!.videoReferenceMode = 'storyboard_and_looks';
    renderRuntime(project);
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useFirstFrame' });
    fireEvent.click(toggle);
    await waitFor(() => expect(api.updateCinematicShotVideoReferences).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({ referenceMode: 'text_only' })));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(screen.queryByRole('img', { name: 'cinematic.produce.approvedKeyframe' })).not.toBeInTheDocument();
    expect(project.scenes[0]!.shots[0]!.approvedStoryboardSource?.imageUrl).toBe('/source-1.jpg');
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
      if (reconciling) expect(button).toHaveAccessibleDescription('cinematic.produce.reconciliationRequired');
      fireEvent.click(button);
      expect(api.createCinematicVideoAttempt).not.toHaveBeenCalled();
    }
  );

  it('blocks stale quote submission during refresh and shows the actual quote failure', async () => {
    const { queryClient } = renderRuntime();
    fireEvent.click(await screen.findByText('cinematic.produce.references.title'));
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

  it.each(['user', 'admin', 'support'])('limits the compiled prompt to privileged %s roles without hiding Shot direction', async role => {
    authRole.value = role;
    renderRuntime();
    expect(await screen.findByText('cinematic.produce.shotDirection')).toBeInTheDocument();
    expect(screen.getByLabelText('cinematic.produce.additionalMotionDirection')).toBeInTheDocument();
    if (role === 'user') expect(screen.queryByText('cinematic.produce.technicalPrompt')).not.toBeInTheDocument();
    else expect(screen.getByText('cinematic.produce.technicalPrompt')).toBeInTheDocument();
  });

  it.each(['ready', 'shot_changed'])('shows canonical completed status and %s reason for a historical Take', async reason => {
    const project = projectFixture();
    project.generationAttempts = [{ id: 'old-take', sceneId: 'scene-1', shotId: 'shot-1',
      operation: 'cinematic_draft_clip', generationJobId: 'old-task', status: 'provider_queued',
      videoPacketFingerprint: 'old-policy-packet' }];
    api.getCinematicProduceContext.mockResolvedValue({ ...produceContext(), videoAttempts: [{
      id: 'old-take', status: 'completed', operation: 'cinematic_draft_clip', approvalReason: reason
    }] });
    generationApi.getVideoTask.mockResolvedValue({ id: 'old-task', status: 'completed', billingStatus: 'captured',
      outputAsset: { id: 'old-asset', publicUrl: '/old.mp4', technicalProbe: { status: 'passed' } } });
    renderRuntime(project);
    await waitFor(() => expect(document.querySelector('.cinematic-take')).toHaveTextContent('cinematic.takes.status.completed'));
    expect(document.querySelector('.cinematic-take')).toHaveTextContent(`cinematic.takes.reason.${reason}`);
    const useButton = screen.queryByRole('button', { name: 'cinematic.takes.use' });
    if (reason === 'ready') expect(useButton).toBeEnabled();
    else expect(useButton).not.toBeInTheDocument();
  });

  it('previews the newest ready older Take and exposes approval before a second task read completes', async () => {
    const project = projectFixture();
    project.generationAttempts = [
      { id: 'ready-old', sceneId: 'scene-1', shotId: 'shot-1', operation: 'cinematic_draft_clip',
        generationJobId: 'task-old', status: 'provider_queued', outputAsset: { publicUrl: '/ready-old.mp4' } },
      { id: 'blocked-new', sceneId: 'scene-1', shotId: 'shot-1', operation: 'cinematic_draft_clip',
        generationJobId: 'task-new', status: 'provider_queued', outputAsset: { publicUrl: '/blocked-new.mp4' } }
    ] as CinematicProject['generationAttempts'];
    api.getCinematicProduceContext.mockResolvedValue({ ...produceContext(), videoAttempts: [
      { id: 'ready-old', status: 'completed', operation: 'cinematic_draft_clip', approvalReason: 'ready' },
      { id: 'blocked-new', status: 'completed', operation: 'cinematic_draft_clip', approvalReason: 'keyframe_changed' }
    ] });
    generationApi.getVideoTask.mockReturnValue(new Promise(() => undefined));
    api.approveCinematicVideoAttempt.mockResolvedValue(produceContext());
    renderRuntime(project);
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/ready-old.mp4'));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.takes.use' }));
    await waitFor(() => expect(api.approveCinematicVideoAttempt).toHaveBeenCalledWith(
      'project-1', 'scene-1', 'shot-1', 'ready-old', 4
    ));
    fireEvent.click(within(screen.getByRole('region', { name: 'cinematic.takes.title' })).getAllByRole('button')[0]!);
    await waitFor(() => expect(document.querySelector('video source')).toHaveAttribute('src', '/blocked-new.mp4'));
    expect(screen.queryByRole('button', { name: 'cinematic.takes.use' })).not.toBeInTheDocument();
  });

  it('requires an explicit confirmation before a duration-only Take override', async () => {
    const project = projectFixture();
    project.generationAttempts = [{ id: 'duration-take', sceneId: 'scene-1', shotId: 'shot-1',
      operation: 'cinematic_draft_clip', generationJobId: 'duration-task', status: 'provider_queued',
      outputAsset: { publicUrl: '/duration.mp4' } }] as CinematicProject['generationAttempts'];
    api.getCinematicProduceContext.mockResolvedValue({ ...produceContext(), videoAttempts: [{
      id: 'duration-take', status: 'completed', operation: 'cinematic_draft_clip',
      approvalReason: 'duration_override_available', durationOverride: {
        kind: 'planned_duration', submittedDurationMs: 8000, currentDurationMs: 4000,
        submittedPacketFingerprint: 'old-packet', receiptCreatedAt: '2026-09-12T10:00:00.000Z'
      }
    }] });
    generationApi.getVideoTask.mockReturnValue(new Promise(() => undefined));
    api.approveCinematicVideoAttempt.mockResolvedValue(produceContext());
    renderRuntime(project);
    const trigger = await screen.findByRole('button', { name: 'cinematic.takes.overrideUse' });
    expect(api.approveCinematicVideoAttempt).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(screen.getByText('cinematic.takes.overrideDescription')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.takes.overrideConfirm' }));
    await waitFor(() => expect(api.approveCinematicVideoAttempt).toHaveBeenCalledWith(
      'project-1', 'scene-1', 'shot-1', 'duration-take', 4,
      { kind: 'planned_duration', submittedDurationMs: 8000, currentDurationMs: 4000 }
    ));
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
  const onProjectRefresh = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = (currentProject: CinematicProject) => <QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><CinematicStageContent
      activeStage="produce"
      mode="advanced"
    project={currentProject}
    onProjectRefresh={onProjectRefresh}
    onPrevious={vi.fn()}
    onNext={vi.fn()}
    onOpenStage={onOpenStage}
  /></I18nextProvider></QueryClientProvider>;
  const view = render(element(project));
  return { ...view, queryClient, onProjectRefresh, rerenderProject: (currentProject: CinematicProject) => view.rerender(element(currentProject)) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function reviewTask() {
  return { id: 'review-task', status: 'reconciliation_required', billingStatus: 'reserved',
    reviewRequired: true, recheckAllowed: true, recovery: { explicitCheckCount: 0, explicitMaxChecks: 3, explicitNextCheckAt: '' } };
}

function reviewProject() {
  const project = projectFixture();
  project.generationAttempts = [{ id: 'review-take', shotId: 'shot-1', operation: 'cinematic_draft_clip',
    generationJobId: 'review-task', status: 'reconciliation_required' }];
  return project;
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
