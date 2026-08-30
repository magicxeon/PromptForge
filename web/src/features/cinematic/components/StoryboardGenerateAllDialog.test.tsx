import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { writeStoryboardBatchEnginePreference } from '../state/storyboardBatchPreferences';
import { StoryboardGenerateAllDialog } from './StoryboardGenerateAllDialog';

const mocks = vi.hoisted(() => ({
  getProviderCatalog: vi.fn(),
  estimateGeneration: vi.fn(),
  getContext: vi.fn(),
  submitBatch: vi.fn()
}));

vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_alice', username: 'alice', role: 'user' } })
}));

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

    fireEvent.click(screen.getByRole('button', {
      name: 'cinematic.storyboard.batch.generate'
    }));
    await waitFor(() => expect(mocks.submitBatch).toHaveBeenCalledTimes(1));
    const submitted = mocks.submitBatch.mock.calls[0]?.[1];
    expect(submitted?.operations).toHaveLength(1);
    expect(submitted?.operations[0]).toEqual(expect.objectContaining({
      sceneId: 'scene_1',
      shotId: 'shot_pending',
      estimateId: 'estimate_storyboard',
      draft: expect.objectContaining({
        prompt: expect.stringContaining('STORYBOARD STILL CONTRACT')
      })
    }));
    expect(await screen.findByText('cinematic.storyboard.batch.queued')).toBeVisible();
  });

  it('restores the actor-scoped provider and model before quoting', async () => {
    writeStoryboardBatchEnginePreference('usr_alice', {
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
    writeStoryboardBatchEnginePreference('usr_alice', {
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
    writeStoryboardBatchEnginePreference('usr_alice', {
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
});

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
