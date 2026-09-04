import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationRequestDraft } from '../../generation/api/generationApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { StoryboardShotDialog } from './StoryboardShotDialog';

const mocks = vi.hoisted(() => ({
  approveSource: vi.fn(),
  estimateGeneration: vi.fn(),
  getContext: vi.fn(),
  submitBatch: vi.fn(),
  updateDirection: vi.fn()
}));

vi.mock('../../../components/generation/GenerationExperience', () => ({
  GenerationExperience: ({
    blockedReason,
    prompt,
    readOnlyPrompt,
    readOnlyPromptSupplement,
    cinematicCaptureProfileId,
    engineOptions,
    showEmptyResult,
    submitSingleDraft
  }: {
    blockedReason?: string | null;
    prompt?: string;
    readOnlyPrompt?: { label: string; description?: string } | null;
    readOnlyPromptSupplement?: ReactNode;
    cinematicCaptureProfileId?: 'photorealistic-cinematic' | null;
    engineOptions?: ReactNode;
    showEmptyResult?: boolean;
    submitSingleDraft?: (draft: GenerationRequestDraft) => Promise<unknown>;
  }) => <section data-testid="generation-experience" data-show-empty-result={String(Boolean(showEmptyResult))}>
    <div data-testid="generation-preview">Preview</div>
    {readOnlyPrompt ? <section data-testid="storyboard-prompt-group">
      <label>
        {readOnlyPrompt.label}
        <textarea aria-label={readOnlyPrompt.label} readOnly value={prompt || ''} />
      </label>
      {readOnlyPrompt.description ? <small>{readOnlyPrompt.description}</small> : null}
      {readOnlyPromptSupplement}
    </section> : null}
    {engineOptions}
    <button
      type="button"
      disabled={Boolean(blockedReason)}
      onClick={() => void submitSingleDraft?.(generationDraft({ cinematicCaptureProfileId }))}
    >Generate test image</button>
  </section>
}));

vi.mock('../../generation/api/generationApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../generation/api/generationApi')>(),
  estimateGeneration: mocks.estimateGeneration
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  approveCinematicStoryboardSource: mocks.approveSource,
  getCinematicStoryboardGenerationContext: mocks.getContext,
  submitCinematicStoryboardBatch: mocks.submitBatch,
  updateCinematicShotDirection: mocks.updateDirection
}));

const testI18n = i18next.createInstance();

describe('StoryboardShotDialog', () => {
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
    mocks.approveSource.mockReset();
    mocks.estimateGeneration.mockReset();
    mocks.getContext.mockReset();
    mocks.submitBatch.mockReset();
    mocks.updateDirection.mockReset();
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

  it('saves author direction against the latest server context versions', async () => {
    renderDialog();

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

  it('shows the exact server-compiled prompt as read-only beside editable Shot direction', async () => {
    renderDialog();

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

  it('defaults natural realism on, keeps it outside the prompt and submits the selected profile', async () => {
    renderDialog();

    const toggle = await screen.findByRole('switch', {
      name: 'cinematic.storyboard.naturalRealism'
    });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('textbox', {
      name: 'cinematic.storyboard.compiledPrompt'
    })).not.toHaveValue(expect.stringContaining('Natural camera realism'));

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
});

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const project = projectFixture();
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
