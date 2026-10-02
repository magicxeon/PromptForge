import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { enhanceCinematicStory, generateCinematicFullStoryChapters, generateCinematicSceneDirection, generateCinematicStoryPlan, proposeCinematicChapterOutline, proposeCinematicFullStory, proposeCinematicSceneEnvironment, suggestCinematicWardrobe } from './cinematicApi';
import { proposeCinematicChapters, proposeCinematicScenes, proposeCinematicShots } from './cinematicSeriesApi';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import { cinematicProjectSchema, cinematicStoryPlanProposalSchema } from '../schemas/cinematicSchemas';
import { cinematicSeriesMutationSchema, cinematicSceneProposalMutationSchema, cinematicShotProposalMutationSchema } from '../schemas/cinematicSeriesSchemas';

const client = vi.hoisted(() => ({ request: vi.fn(), quote: vi.fn(), stream: vi.fn() }));
vi.mock('../../../lib/api/apiClient', () => ({ apiRequest: (...args: unknown[]) => client.request(...args), apiRequestWithProgress: (...args: unknown[]) => client.stream(...args) }));
vi.mock('./cinematicWritingBilling', () => ({ withCinematicWritingQuote: (...args: unknown[]) => client.quote(...args) }));
beforeEach(() => {
  client.request.mockReset().mockResolvedValue('result');
  client.stream.mockReset().mockResolvedValue('stream-result');
  client.quote.mockReset().mockImplementation((options: { input: Record<string, unknown> }, execute: (body: unknown) => unknown) => execute({ ...options.input, writingQuoteId: 'cw_quote' }));
});

describe('Writing API quote coverage', () => {
  it.each([cinematicProjectSchema, cinematicSeriesMutationSchema, cinematicSceneProposalMutationSchema, cinematicShotProposalMutationSchema])('preserves settlement metadata on writing mutations', schema => {
    const receipt = { billingStatus: 'settlement_pending', writingOperationId: 'cw_one', chargedCredits: 0 };
    expect(z.object({ billingStatus: schema.shape.billingStatus, writingOperationId: schema.shape.writingOperationId,
      chargedCredits: schema.shape.chargedCredits }).parse(receipt)).toEqual(receipt);
  });
  it('accepts free legacy preflight without claiming a paid result', () => {
    expect(cinematicStoryPlanProposalSchema.parse({ proposalId: 'blocked', operation: 'cinematic_story_plan_generate', mode: 'generate', status: 'blocked',
      expectedProjectVersion: 1, storySourceVersionId: 'source', plan: null, provenance: null, billingStatus: 'free', chargedCredits: 0 }).billingStatus).toBe('free');
  });
  it.each([
    { operation: 'characters', input: { expectedVersion: 2, revisionInstruction: '', purpose: 'characters' }, run: () => proposeCinematicFullStory('p', 2, '', 'characters'), endpoint: '/full-story/proposals' },
    { operation: 'full_story', input: { expectedVersion: 2, revisionInstruction: 'Quiet ending' }, run: () => proposeCinematicFullStory('p', 2, 'Quiet ending'), endpoint: '/full-story/proposals' },
    { operation: 'chapter_outline', input: { expectedVersion: 2 }, run: () => proposeCinematicChapterOutline('p', 2), endpoint: '/chapter-outline/proposals', mandatory: true },
    { operation: 'chapters', input: { expectedVersion: 2, scope: 'all' }, run: () => generateCinematicFullStoryChapters('p', 2), endpoint: '/full-story/chapters', mandatory: true },
    { operation: 'chapters', input: { expectedVersion: 2, scope: 'selected', instruction: 'Quiet ending' }, run: () => proposeCinematicChapters('p', { expectedVersion: 2, scope: 'selected', instruction: 'Quiet ending' }), endpoint: '/chapter-proposals', mandatory: false },
    { operation: 'scenes', input: { expectedVersion: 2 }, run: () => proposeCinematicScenes('p', 2), endpoint: '/scene-proposals', mandatory: true },
    { operation: 'shots', input: { expectedVersion: 2 }, run: () => proposeCinematicShots('p', 'scene', 2), endpoint: '/scenes/scene/shot-proposals', mandatory: true, sceneId: 'scene' },
    { operation: 'shots', input: { expectedVersion: 2, targetShotId: 'shot', instruction: 'Quiet ending' }, run: () => proposeCinematicShots('p', 'scene', 2, { targetShotId: 'shot', instruction: 'Quiet ending' }), endpoint: '/scenes/scene/shot-proposals', mandatory: false, sceneId: 'scene' },
    { operation: 'environment', input: { expectedVersion: 2, expectedSceneVersion: 1, currentDirection: 'Rain' }, run: () => proposeCinematicSceneEnvironment('p', 'scene', { expectedVersion: 2, expectedSceneVersion: 1, currentDirection: 'Rain' }), endpoint: '/scenes/scene/environment/proposals', sceneId: 'scene' },
    { operation: 'wardrobe', input: {}, run: () => suggestCinematicWardrobe('p', 'cast'), endpoint: '/cast/cast/wardrobe-suggestion', assignmentId: 'cast' },
    { operation: 'story_plan', input: { mode: 'generate' }, run: () => generateCinematicStoryPlan('p', { mode: 'generate' }), endpoint: '/story-plan/proposals', mandatory: true },
    { operation: 'scene_direction', input: { expectedVersion: 2, direction: 'Quiet' }, run: () => generateCinematicSceneDirection('p', 'scene', { expectedVersion: 2, direction: 'Quiet' }), endpoint: '/scenes/scene/direction-proposals', sceneId: 'scene' }
  ])('quotes $operation with the exact execute payload ($endpoint)', async ({ operation, input, run, endpoint, ...scope }) => {
    expect(await run()).toBe('result');
    expect(client.quote).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p', operation, input, ...scope }), expect.any(Function));
    expect(client.request).toHaveBeenCalledOnce();
    expect(client.request).toHaveBeenCalledWith(`/api/cinematic/projects/p${endpoint}`, expect.objectContaining({ body: { ...input, writingQuoteId: 'cw_quote' } }));
  });
  it('quotes before streaming Story Plan and preserves its progress callback', async () => {
    const onProgress = vi.fn();
    expect(await generateCinematicStoryPlan('p', { mode: 'review_current' }, onProgress)).toBe('stream-result');
    expect(client.quote).toHaveBeenCalledWith(expect.objectContaining({ operation: 'story_plan', mandatory: true, input: { mode: 'review_current' } }), expect.any(Function));
    expect(client.stream).toHaveBeenCalledWith('/api/cinematic/projects/p/story-plan/proposals', expect.objectContaining({ body: { mode: 'review_current', writingQuoteId: 'cw_quote' }, onProgress }));
    expect(client.request).not.toHaveBeenCalled();
  });
  it.each(['story', 'roles'] as const)('quotes projectless Brief %s with the full original input', async purpose => {
    const draft = createCinematicSetupDraft();
    await enhanceCinematicStory(draft, purpose);
    expect(client.quote).toHaveBeenCalledWith(expect.objectContaining({ projectId: null, operation: 'brief', input: { ...draft, purpose } }), expect.any(Function));
    expect(client.request).toHaveBeenCalledWith('/api/cinematic/story-enhancements', expect.objectContaining({ body: { ...draft, purpose, writingQuoteId: 'cw_quote' } }));
  });
});
