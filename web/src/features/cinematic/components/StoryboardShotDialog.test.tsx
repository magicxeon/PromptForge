import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ComponentProps, ReactNode } from 'react';
import type { GenerationWorkspaceRegions } from '../../../components/generation/GenerationExperience';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationRequestDraft } from '../../generation/api/generationApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import {
  readStoryboardEnginePreference,
  writeStoryboardEnginePreference
} from '../state/storyboardEnginePreference';
import { StoryboardShotDialog } from './StoryboardShotDialog';

const mocks = vi.hoisted(() => ({
  approveSource: vi.fn(),
  prepareFrame: vi.fn(),
  estimateGeneration: vi.fn(),
  getContext: vi.fn(),
  submitBatch: vi.fn(),
  updateDirection: vi.fn(),
  updateSettings: vi.fn()
}));

vi.mock('../../../components/generation/GenerationExperience', () => ({
  GenerationExperience: ({
    blockedReason,
    prompt,
    readOnlyPrompt,
    readOnlyPromptSupplement,
    cinematicCaptureProfileId,
    cinematicFaceless,
    initialEnginePreference,
    engineOptions,
    referenceLead,
    showEmptyResult,
    submitSingleDraft,
    renderWorkspace
  }: {
    blockedReason?: string | null;
    prompt?: string;
    readOnlyPrompt?: { label: string; description?: string } | null;
    readOnlyPromptSupplement?: ReactNode;
    cinematicCaptureProfileId?: 'photorealistic-cinematic' | null;
    cinematicFaceless?: boolean;
    initialEnginePreference?: { provider: string; model: string } | null;
    engineOptions?: ReactNode;
    referenceLead?: ReactNode;
    showEmptyResult?: boolean;
    submitSingleDraft?: (draft: GenerationRequestDraft) => Promise<unknown>;
    renderWorkspace?: (regions: GenerationWorkspaceRegions) => ReactNode;
  }) => {
    const regions = {
      result: <div data-testid="generation-preview">Preview</div>,
      prompt: readOnlyPrompt ? <section data-testid="storyboard-prompt-group">
        <label>{readOnlyPrompt.label}<textarea aria-label={readOnlyPrompt.label} readOnly value={prompt || ''} /></label>
        {readOnlyPrompt.description ? <small>{readOnlyPrompt.description}</small> : null}
        {readOnlyPromptSupplement}
      </section> : null,
      engine: engineOptions,
      references: referenceLead, messages: null, queue: null,
      actions: <button type="button" disabled={Boolean(blockedReason)}
        onClick={() => void submitSingleDraft?.(generationDraft({ cinematicCaptureProfileId, cinematicFaceless }))}>Generate test image</button>
    };
    return <section
    data-testid="generation-experience"
    data-show-empty-result={String(Boolean(showEmptyResult))}
    data-provider={initialEnginePreference?.provider || ''}
    data-model={initialEnginePreference?.model || ''}
  >
    {renderWorkspace?.(regions)}
  </section>;
  }
}));

vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_alice', username: 'alice', role: 'user' } })
}));

vi.mock('../../generation/api/generationApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../generation/api/generationApi')>(),
  estimateGeneration: mocks.estimateGeneration
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  approveCinematicStoryboardSource: mocks.approveSource,
  prepareCinematicPreviousVideoFrame: mocks.prepareFrame,
  getCinematicStoryboardGenerationContext: mocks.getContext,
  submitCinematicStoryboardBatch: mocks.submitBatch,
  updateCinematicShotDirection: mocks.updateDirection,
  updateCinematicStoryboardSettings: mocks.updateSettings
}));

const testI18n = i18next.createInstance();

describe('StoryboardShotDialog', () => {
  it('disables last-frame reuse until the previous Shot has an approved Take', async () => {
    mocks.getContext.mockResolvedValue({ ...generationContext(), previousVideoFrame: {
      available: false, reason: 'cinematic_previous_video_not_approved', previousShotId: 'shot_0',
      previousShotTitle: 'Opening', approvedTakeId: null, posterUrl: null
    } });
    renderDialog();
    expect(await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.prepare' })).toBeDisabled();
    await waitFor(() => expect(screen.getByText('cinematic.storyboard.previousFrame.cinematic_previous_video_not_approved')).toBeVisible());
    expect(mocks.prepareFrame).not.toHaveBeenCalled();
  });

  it('previews the previous Take frame before explicit Storyboard approval', async () => {
    mocks.getContext.mockResolvedValue({ ...generationContext(), previousVideoFrame: {
      available: true, reason: null, previousShotId: 'shot_0', previousShotTitle: 'Opening',
      approvedTakeId: 'take_0', posterUrl: null
    } });
    mocks.prepareFrame.mockResolvedValue({ assetId: 'frame_1', sourceAttemptId: 'take_0',
      sourceKind: 'previous_video_last_frame', imageUrl: '/outputs/frame.png' });
    mocks.approveSource.mockResolvedValue({});
    renderDialog();
    const prepare = await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.prepare' });
    await waitFor(() => expect(prepare).toBeEnabled());
    fireEvent.click(prepare);
    await waitFor(() => expect(mocks.prepareFrame).toHaveBeenCalledOnce());
    expect(mocks.approveSource).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.approve' }));
    await waitFor(() => expect(mocks.approveSource).toHaveBeenCalledWith('cineproj_1', 'shot_1', expect.objectContaining({
      sourceType: 'previous_video_last_frame', frameAssetId: 'frame_1'
    })));
  });

  it('asks for an additional confirmation when the previous Take is in another Scene', async () => {
    mocks.getContext.mockResolvedValue({ ...generationContext(), previousVideoFrame: {
      available: true, reason: null, previousShotId: 'shot_0', previousShotTitle: 'Exit',
      previousSceneTitle: 'Outside', crossScene: true, approvedTakeId: 'take_0', posterUrl: null
    } });
    mocks.prepareFrame.mockResolvedValue({ assetId: 'frame_1', sourceAttemptId: 'take_0',
      sourceKind: 'previous_video_last_frame', imageUrl: '/outputs/frame.png' });
    mocks.approveSource.mockResolvedValue({});
    renderDialog();
    const prepare = await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.prepare' });
    await waitFor(() => expect(prepare).toBeEnabled());
    fireEvent.click(prepare);
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.approve' }));
    expect(mocks.approveSource).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.storyboard.previousFrame.confirmCrossScene' }));
    await waitFor(() => expect(mocks.approveSource).toHaveBeenCalledWith('cineproj_1', 'shot_1', expect.objectContaining({
      crossSceneConfirmed: true
    })));
  });

  it('opens image settings, preserves unsaved direction and preview across tabs, and keeps Generate visible', async () => {
    renderDialog();
    expect(screen.getByRole('tab', { name: 'cinematic.storyboard.workspace.image' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate test image' })).toBeEnabled());
    const preview = screen.getByTestId('generation-preview');
    openTab('shot');
    const direction = await screen.findByRole('textbox', { name: 'cinematic.storyboard.shotDirection' });
    fireEvent.change(direction, { target: { value: 'Keep both hands above the rim' } });
    openTab('video');
    expect(screen.getByRole('button', { name: 'Generate test image' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate test image' })).toBeDisabled();
    openTab('shot');
    expect(screen.getByRole('textbox', { name: 'cinematic.storyboard.shotDirection' })).toBe(direction);
    expect(direction).toHaveValue('Keep both hands above the rim');
    expect(screen.getByTestId('generation-preview')).toBe(preview);
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    expect(mocks.updateDirection).not.toHaveBeenCalled();
  });

  it('opens the inline editor directly from the header without losing image settings', async () => {
    renderDialog();
    await screen.findByRole('switch', { name: 'cinematic.storyboard.naturalRealism' });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.editShot' }));
    expect(screen.getByRole('tab', { name: 'cinematic.storyboard.workspace.shot' })).toHaveAttribute('aria-selected', 'true');
    const editor = screen.getByRole('region', { name: 'cinematic.storyboard.editShot' });
    openTab('image');
    expect(screen.getByRole('switch', { name: 'cinematic.storyboard.naturalRealism' })).toHaveAttribute('aria-checked', 'true');
    openTab('shot');
    expect(screen.getByRole('region', { name: 'cinematic.storyboard.editShot' })).toBe(editor);
  });
  it('keeps the approved photoreal composition selectable in Storyboard', async () => {
    const project = projectFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.approvedStoryboardSource = {
      assetId: 'photo', assetVersionId: 'photo', sourceJobId: 'job-photo',
      imageUrl: '/outputs/photo.png', thumbnailUrl: '/outputs/photo.png',
      contentHash: 'hash', sourceFingerprint: 'fingerprint', approvedAt: '2026-09-12T00:00:00Z',
      storyboardRenderStyle: 'photorealistic_storyboard_v1'
    };
    shot.videoReferenceMode = 'storyboard_and_looks';
    renderDialog(project);
    openTab('video');
    const toggle = await screen.findByRole('switch', { name: 'cinematic.produce.references.useSketch' });
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { cinematic: {} } },
      keySeparator: false,
      returnNull: false,
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    localStorage.clear();
    mocks.approveSource.mockReset();
    mocks.prepareFrame.mockReset();
    mocks.estimateGeneration.mockReset();
    mocks.getContext.mockReset();
    mocks.submitBatch.mockReset();
    mocks.updateDirection.mockReset();
    mocks.updateSettings.mockReset();
    mocks.getContext.mockResolvedValue(generationContext());
    mocks.estimateGeneration.mockResolvedValue({
      estimate: { estimateId: 'estimate_1', estimatedCredits: 10, expiresAt: Date.now() + 60_000 },
      account: { availableCredits: 100, canAfford: true }
    });
    mocks.submitBatch.mockResolvedValue({
      batchId: 'ggrp_1',
      groupId: 'ggrp_1',
      status: 'queued',
      requestedOutputCount: 1,
      acceptedCount: 1,
      failedCount: 0,
      children: [{
        operationId: 'shot_1',
        sceneId: 'scene_1',
        shotId: 'shot_1',
        jobId: 'job_1',
        status: 'planned',
        error: null
      }]
    });
    mocks.updateDirection.mockResolvedValue({});
  });

  afterEach(() => vi.unstubAllGlobals());

  it('saves author direction against the latest server context versions', async () => {
    renderDialog();
    openTab('shot');

    const direction = await screen.findByRole('textbox', { name: 'cinematic.storyboard.shotDirection' });
    fireEvent.change(direction, { target: { value: 'Hold on the Character at the doorway.' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.saveDirection' }));

    await waitFor(() => expect(mocks.updateDirection).toHaveBeenCalledWith(
      'cineproj_1',
      'scene_1',
      'shot_1',
      expect.objectContaining({ expectedVersion: 12, expectedShotVersion: 7 })
    ));
  });

  it('edits the Shot inline, preserves the preview node and submits only on Save', async () => {
    renderDialog();
    openTab('shot');
    await screen.findByRole('textbox', { name: 'cinematic.storyboard.compiledPrompt' });
    const preview = screen.getByTestId('generation-preview');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.editShot' }));
    const editor = within(screen.getByRole('region', { name: 'cinematic.storyboard.editShot' }));
    fireEvent.change(editor.getByRole('textbox', { name: 'cinematic.director.subjectAction' }), {
      target: { value: 'Grip the pot before trying to lift it' }
    });
    fireEvent.change(editor.getByRole('textbox', { name: 'cinematic.storyboard.shotDirection' }), { target: { value: '' } });
    expect(mocks.updateDirection).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Generate test image' })).toBeDisabled();
    fireEvent.click(editor.getByRole('button', { name: 'cinematic.storyboard.saveDirection' }));
    await waitFor(() => expect(mocks.updateDirection).toHaveBeenCalledWith('cineproj_1', 'scene_1', 'shot_1',
      expect.objectContaining({ prompt: '', subjectAction: 'Grip the pot before trying to lift it', expectedVersion: 12, expectedShotVersion: 7 })));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'cinematic.storyboard.editShot' })).not.toBeInTheDocument());
    expect(screen.getByTestId('generation-preview')).toBe(preview);
    expect(mocks.submitBatch).not.toHaveBeenCalled();
  });

  it('retains inline edits after a save error and Cancel does not save', async () => {
    mocks.updateDirection.mockRejectedValue(new Error('Version conflict'));
    renderDialog();
    openTab('shot');
    await screen.findByRole('textbox', { name: 'cinematic.storyboard.compiledPrompt' });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.editShot' }));
    const editor = within(screen.getByRole('region', { name: 'cinematic.storyboard.editShot' }));
    const field = editor.getByRole('textbox', { name: 'cinematic.director.visibleMoment' });
    fireEvent.change(field, { target: { value: 'Hands just above the rim' } });
    fireEvent.click(editor.getByRole('button', { name: 'cinematic.storyboard.saveDirection' }));
    await screen.findByText('Version conflict');
    expect(field).toHaveValue('Hands just above the rim');
    fireEvent.click(editor.getByRole('button', { name: 'cinematic.actions.cancel' }));
    expect(mocks.updateDirection).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'cinematic.storyboard.editShot' })).not.toBeInTheDocument();
  });

  it('shows the exact server-compiled prompt as read-only beside editable Shot direction', async () => {
    renderDialog();
    openTab('shot');

    await waitFor(() => expect(screen.getByRole('textbox', {
      name: 'cinematic.storyboard.compiledPrompt'
    })).toHaveValue('STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1'));
    const compiledPrompt = screen.getByRole('textbox', {
      name: 'cinematic.storyboard.compiledPrompt'
    });
    expect(compiledPrompt).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', {
      name: 'cinematic.storyboard.shotDirection'
    })).not.toHaveAttribute('readonly');
  });

  it('orders Preview before the compiled prompt and groups Additional direction after it', async () => {
    renderDialog();
    openTab('shot');

    const compiledPrompt = await screen.findByRole('textbox', {
      name: 'cinematic.storyboard.compiledPrompt'
    });
    const preview = screen.getByTestId('generation-preview');
    const promptGroup = screen.getByTestId('storyboard-prompt-group');
    const additionalDirection = screen.getByRole('textbox', {
      name: 'cinematic.storyboard.shotDirection'
    });

    expect(screen.getByTestId('generation-experience')).toHaveAttribute('data-show-empty-result', 'true');
    expect(preview.compareDocumentPosition(compiledPrompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(compiledPrompt.compareDocumentPosition(additionalDirection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(promptGroup).toContainElement(additionalDirection);
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.reset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.saveDirection' })).toBeInTheDocument();
  });

  it('uses a new idempotency key after each accepted manual generation', async () => {
    renderDialog();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate test image' })).toBeEnabled());
    const generate = screen.getByRole('button', { name: 'Generate test image' });
    fireEvent.click(generate);
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    fireEvent.click(generate);
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(2));

    const firstKey = mocks.submitBatch.mock.calls[0]?.[1]?.idempotencyKey;
    const secondKey = mocks.submitBatch.mock.calls[1]?.[1]?.idempotencyKey;
    expect(firstKey).toMatch(/^cinematic-storyboard:cineproj_1:shot_1:/);
    expect(secondKey).toMatch(/^cinematic-storyboard:cineproj_1:shot_1:/);
    expect(secondKey).not.toBe(firstKey);
  });

  it('restores the actor engine and remembers the submitted engine after acceptance', async () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    renderDialog();

    expect(await screen.findByTestId('generation-experience')).toHaveAttribute(
      'data-provider',
      'meta-muse'
    );
    expect(screen.getByTestId('generation-experience')).toHaveAttribute(
      'data-model',
      'muse-image-1.0'
    );

    await waitFor(() => expect(screen.getByRole('button', {
      name: 'Generate test image'
    })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Generate test image' }));
    await waitFor(() => expect(readStoryboardEnginePreference('usr_alice')).toEqual({
      provider: 'gemini',
      model: 'image-model'
    }));
  });

  it('allows a new review candidate when the Shot already has an approved source', async () => {
    const project = projectFixture();
    project.scenes[0]!.shots[0]!.approvedStoryboardSource = {
      assetId: 'asset_old', assetVersionId: 'asset_old', sourceJobId: 'job_old',
      imageUrl: '/old.jpg', thumbnailUrl: '/old.jpg', contentHash: 'hash_old',
      sourceFingerprint: 'fingerprint_old', approvedAt: '2026-09-04T00:00:00.000Z'
    };
    renderDialog(project);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate test image' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Generate test image' }));
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
  });

  it('defaults natural realism on, keeps it outside the prompt and submits the selected profile', async () => {
    renderDialog();

    const toggle = await screen.findByRole('switch', {
      name: 'cinematic.storyboard.naturalRealism'
    });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    openTab('shot');
    expect(await screen.findByRole('textbox', {
      name: 'cinematic.storyboard.compiledPrompt'
    })).not.toHaveValue(expect.stringContaining('Natural camera realism'));

    openTab('image');
    const readyToggle = screen.getByRole('switch', {
      name: 'cinematic.storyboard.naturalRealism'
    });
    fireEvent.click(readyToggle);
    expect(readyToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Generate test image' }));
    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ cinematicCaptureProfileId: null })
    ));
  });

  it('defaults Faceless off, saves explicitly and submits the new setting without generating automatically', async () => {
    renderDialog();
    const toggle = await screen.findByRole('switch', { name: 'cinematic.storyboard.faceless' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    mocks.updateSettings.mockImplementation(async () => {
      mocks.getContext.mockResolvedValue({ ...generationContext(), cinematicFaceless: true });
      return {};
    });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(mocks.updateSettings).toHaveBeenCalledWith('cineproj_1', 'scene_1', 'shot_1', {
      expectedVersion: 12, expectedShotVersion: 7, storyboardFaceless: true, storyboardFacialTreatment: 'blank'
    });
    expect(mocks.submitBatch).not.toHaveBeenCalled();
    expect(mocks.approveSource).not.toHaveBeenCalled();
    mocks.updateSettings.mockImplementation(async (_project, _scene, _shot, input) => {
      mocks.getContext.mockResolvedValue({ ...generationContext(), cinematicFaceless: true, cinematicFacialTreatment: input.storyboardFacialTreatment });
      return {};
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'cinematic.storyboard.facialTreatment' }), { target: { value: 'white_previs' } });
    await waitFor(() => expect(mocks.updateSettings).toHaveBeenLastCalledWith('cineproj_1', 'scene_1', 'shot_1', expect.objectContaining({ storyboardFacialTreatment: 'white_previs' })));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'cinematic.storyboard.facialTreatment' })).toHaveValue('white_previs'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate test image' }));
    await waitFor(() => expect(mocks.estimateGeneration).toHaveBeenCalledWith(expect.objectContaining({ cinematicFaceless: true })));
  });

  it('embeds the existing image workflow without a modal or duplicate prompt editor and respects the row save blocker', async () => {
    renderDialog(projectFixture(), { embedded: true, blockedReason: 'Save row first' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'cinematic.storyboard.shotDirection' })).not.toBeInTheDocument();
    expect(screen.getByTestId('generation-preview')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate test image' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'cinematic.storyboard.faceless' })).toBeDisabled();
  });
});

function openTab(tab: 'image' | 'shot' | 'video') {
  fireEvent.mouseDown(screen.getByRole('tab', { name: `cinematic.storyboard.workspace.${tab}` }), { button: 0, ctrlKey: false });
}

function renderDialog(project = projectFixture(), props: Partial<ComponentProps<typeof StoryboardShotDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const scene = project.scenes[0]!;
  const shot = scene.shots[0]!;
  render(<QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={testI18n}>
      <StoryboardShotDialog
        open
        onOpenChange={vi.fn()}
        project={project}
        scene={scene}
        shot={shot}
        {...props}
      />
    </I18nextProvider>
  </QueryClientProvider>);
}

function generationDraft(overrides: Partial<GenerationRequestDraft> = {}): GenerationRequestDraft {
  return {
    provider: 'gemini',
    submodel: 'image-model',
    prompt: 'Server-owned prompt',
    aspectRatio: '9:16',
    imageResolution: '1K',
    outputCount: 1,
    generationMode: 'scene',
    generationSurface: 'cinematic',
    references: {},
    ...overrides
  };
}

function generationContext() {
  return {
    schemaVersion: 1,
    projectId: 'cineproj_1',
    projectVersion: 12,
    sceneId: 'scene_1',
    shotId: 'shot_1',
    shotVersion: 7,
    characterProfileContext: null,
    references: { outfit_front: null, outfit_back: null, style_reference: null },
    cast: [],
    looks: [],
    continuitySource: null,
    keyframeContract: {
      sourceFingerprint: 'keyframe_1',
      providerIndependentPrompt: 'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1'
    },
    generationEligible: true,
    blockingReason: null
  };
}

function projectFixture() {
  return {
    id: 'cineproj_1',
    projectId: 'cineproj_1',
    version: 3,
    aspectRatio: '9:16',
    castAssignments: [],
    scenes: [{
      id: 'scene_1',
      version: 2,
      orderKey: 1,
      beatId: 'beat_1',
      title: 'Arrival',
      purpose: 'Begin',
      storyChange: 'A decision begins',
      location: 'Cafe',
      time: 'Dusk',
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
      shots: [{
        id: 'shot_1',
        version: 1,
        orderKey: 1,
        title: 'Doorway hold',
        purpose: 'Establish the decision',
        durationMs: 4000,
        framing: 'medium-wide',
        cameraAngle: 'eye-level',
        cameraMovement: 'locked',
        lensIntent: 'natural',
        blocking: 'Character waits',
        performance: 'restrained',
        gaze: 'toward the doorway',
        lighting: 'cool dusk',
        environment: 'closed cafe',
        audioIntent: 'rain ambience',
        prompt: 'A restrained doorway hold',
        castAssignmentIds: [],
        wardrobeLookIds: [],
        continuityNotes: [],
        storyboardStatus: 'draft'
      }],
      shotOrder: ['shot_1'],
      durationMs: 4000
    }]
  } as unknown as CinematicProject;
}
