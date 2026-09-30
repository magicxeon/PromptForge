import crypto from 'node:crypto';
import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';
import { getCinematicStoryEnhancementPolicy } from '../../config/cinematic-story-enhancement-policy.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';
import { CinematicTextProviderRouter } from './CinematicTextProviderRouter.js';
import { creditPricingPolicyService } from '../credits/CreditPricingPolicyService.js';
import { normalizeWritingUsage } from '../credits/CinematicWritingPricing.js';
import { normalizeChapterOutlineRows } from '../cinematic/CinematicChapterOutline.js';

const createOpenAIProvider = policy => new OpenAITextProvider(policy.apiKey);
const createShotProvider = policy => new CinematicTextProviderRouter(policy);

export class CinematicFullStoryService {
  constructor({
    policyLoader = getCinematicStoryEnhancementPolicy,
    providerFactory = createOpenAIProvider,
    shotProviderFactory = null,
    availabilityPolicy = providerAvailabilityPolicyService,
    pricingService = creditPricingPolicyService
  } = {}) {
    Object.assign(this, {
      policyLoader,
      providerFactory,
      shotProviderFactory: shotProviderFactory
        || (providerFactory === createOpenAIProvider ? createShotProvider : providerFactory),
      availabilityPolicy, pricingService
    });
  }

  async propose(input = {}) {
    const policy = this.#policy();
    const context = normalizeStoryInput(input);
    const result = await this.providerFactory(policy).generateCinematicFullStory({
      context,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    const fullStory = boundedText(result?.fullStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
    if (!fullStory) fail('cinematic_full_story_invalid_response', 'Full Story generation returned no usable story.', 502);
    return {
      proposalId: `cinefull_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      fullStory,
      characters: normalizeGeneratedCharacters(result?.characters, context.existingCharacters),
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result?.responseId || null },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeCharacters(input = {}) {
    const policy = this.#policy();
    const fullStory = String(input.currentFullStory || '').trim();
    if (!fullStory || fullStory.length > cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters) {
      fail('cinematic_full_story_required', 'Save the Full Story before extracting Characters.');
    }
    const existingCharacters = normalizeExistingCharacters(input.existingCharacters);
    const result = await this.providerFactory(policy).extractCinematicStoryCharacters({
      context: { fullStory, existingCharacters },
      model: policy.model, reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    if (!Array.isArray(result?.characters)) fail('cinematic_full_story_invalid_response', 'Character extraction returned invalid data.', 502);
    return {
      proposalId: `cinefull_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      fullStory,
      characters: normalizeGeneratedCharacters(result.characters, existingCharacters),
      warnings: boundedList(result.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result.responseId || null },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeChapters(input = {}) {
    const policy = this.#policy();
    const fullStory = boundedText(input.fullStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
    if (!fullStory) fail('cinematic_full_story_required', 'Confirm a Full Story before generating Chapters.');
    const maxChapters = Math.min(
      cinematicWorkflowPolicy.authoring.generatedChapterMaximum,
      Math.max(1, Number(input.maxChapters) || cinematicWorkflowPolicy.authoring.defaultChapterCount)
    );
    const expectedChapterCount = input.scope === 'selected' ? 1 : maxChapters;
    const result = await this.providerFactory(policy).generateCinematicChapters({
      context: {
        fullStory,
        format: input.format === 'mini-series' ? 'mini-series' : 'short-film',
        targetDurationSeconds: Math.max(1, Number(input.targetDurationSeconds) || 60),
        maxChapters,
        expectedChapterCount,
        chapterPlan: normalizeChapterPlan(input.chapterPlan, maxChapters),
        scope: input.scope === 'selected' ? 'selected' : 'all',
        instruction: boundedText(input.instruction, cinematicWorkflowPolicy.authoring.fullStoryInstructionMaximumCharacters),
        currentChapter: normalizeChapterContext(input.currentChapter),
        existingChapters: normalizeChapterList(input.existingChapters, 24),
        continuity: input.continuity || null,
        characters: normalizeCharacterList(input.characters, 24)
      },
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    const chapters = (Array.isArray(result?.chapters) ? result.chapters : []).slice(0, maxChapters).map((chapter, index) => ({
      title: boundedText(chapter?.title, 120) || `Chapter ${index + 1}`,
      story: boundedText(chapter?.story, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters)
    })).filter(chapter => chapter.story);
    if (chapters.length !== expectedChapterCount) fail(
      'cinematic_chapters_incomplete_response',
      `Chapter generation returned ${chapters.length} of ${expectedChapterCount} required Chapters. Nothing was saved.`,
      502
    );
    return {
      proposalId: `cinechapters_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      chapters,
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage), recordedAt: new Date().toISOString() },
      billingStatus: 'qualification_no_charge'
    };
  }

  async estimateChapterPlanning(input = {}) {
    let policy;
    try { policy = this.#policy(); }
    catch { return { estimates: { chapter_outline: null, chapters: null }, billingStatus: 'qualification_no_charge' }; }
    const inputBytes = Buffer.byteLength(JSON.stringify(input), 'utf8');
    const estimates = {};
    for (const operation of ['chapter_outline', 'chapters']) {
      try {
        const result = await this.pricingService.estimateWritingPreview({ model: policy.model, operation, inputBytes,
          maxOutputTokens: operation === 'chapter_outline' ? cinematicWorkflowPolicy.authoring.chapterOutlineMaximumOutputTokens : policy.maxOutputTokens });
        estimates[operation] = result?.publicEstimate || null;
      } catch { estimates[operation] = null; }
    }
    return { estimates, billingStatus: 'qualification_no_charge' };
  }

  async proposeChapterOutline(input = {}) {
    const policy = this.#policy();
    const started = Date.now();
    const result = await this.providerFactory(policy).generateCinematicChapterOutline({
      context: { ...input, maximumChapters: Math.min(cinematicWorkflowPolicy.authoring.generatedChapterMaximum,
        cinematicWorkflowPolicy.projectCreation.maximumChapterCount),
        synopsisMaximumCharacters: cinematicWorkflowPolicy.authoring.chapterOutlineSynopsisMaximumCharacters },
      model: policy.model, reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: cinematicWorkflowPolicy.authoring.chapterOutlineMaximumOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    return { chapters: normalizeChapterOutlineRows(result?.chapters, input.settings),
      rationale: boundedText(result?.rationale, 1000), warnings: boundedList(result?.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage), durationMs: Date.now() - started, recordedAt: new Date().toISOString() }
    };
  }

  async proposeScenes(input = {}) {
    const policy = this.#policy();
    const chapterStory = boundedText(input.chapterStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
    if (!chapterStory) fail('cinematic_chapter_story_required', 'Save Chapter prose before generating Scenes.');
    const maximumScenes = Math.min(
      cinematicWorkflowPolicy.authoring.generatedSceneMaximum,
      Math.max(1, Number(input.maximumScenes) || cinematicWorkflowPolicy.authoring.generatedSceneMaximum)
    );
    const result = await this.providerFactory(policy).generateCinematicChapterScenes({
      context: {
        chapter: {
          title: boundedText(input.chapterTitle, 120),
          story: chapterStory,
          targetDurationSeconds: Math.max(5, Number(input.targetDurationSeconds) || 60)
        },
        project: {
          title: boundedText(input.projectTitle, 120),
          storySettings: input.storySettings && typeof input.storySettings === 'object' ? input.storySettings : {}
        },
        characters: normalizeCharacterList(input.characters, 24),
        currentScenes: normalizeSceneList(input.currentScenes, maximumScenes),
        continuity: input.continuity || null,
        maximumScenes
      },
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    const scenes = (Array.isArray(result?.scenes) ? result.scenes : []).slice(0, maximumScenes);
    if (!scenes.length) fail('cinematic_scenes_incomplete_response', 'Scene generation returned no complete Scenes. Nothing was saved.', 502);
    return {
      proposalId: `cinescenes_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      scenes,
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result?.responseId || null },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeShots(input = {}) {
    const policy = this.#policy();
    const scene = normalizeShotScene(input.scene);
    if (!scene.synopsis && !scene.objective) fail('cinematic_scene_direction_required', 'Save the Scene situation before generating Shots.');
    const maximumShots = Math.min(
      cinematicWorkflowPolicy.authoring.generatedShotMaximumPerScene,
      Math.max(1, Number(input.maximumShots) || cinematicWorkflowPolicy.authoring.generatedShotMaximumPerScene)
    );
    const result = await this.shotProviderFactory(policy).generateCinematicSceneShots({
      context: {
        project: { title: boundedText(input.projectTitle, 120), aspectRatio: boundedText(input.aspectRatio, 20) },
        chapter: { title: boundedText(input.chapterTitle, 120), story: boundedText(input.chapterStory, 10000) },
        scene,
        adjacentScenes: {
          previous: normalizeAdjacentScene(input.previousScene),
          next: normalizeAdjacentScene(input.nextScene)
        },
        characters: normalizeCharacterList(input.characters, 24),
        currentShots: normalizeShotList(input.currentShots, maximumShots),
        continuity: input.continuity || null,
        revisionInstruction: boundedText(input.revisionInstruction, cinematicWorkflowPolicy.authoring.fullStoryInstructionMaximumCharacters),
        maximumShots
      },
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    const shots = (Array.isArray(result?.shots) ? result.shots : []).slice(0, maximumShots);
    if (!shots.length) fail('cinematic_shots_incomplete_response', 'Shot generation returned no complete Shots. Nothing was saved.', 502);
    return {
      proposalId: `cineshots_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      shots,
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: {
        provider: result?.executionProvider || policy.provider,
        model: result?.executionModel || policy.model,
        responseId: result?.responseId || null,
        fallbackUsed: Boolean(result?.fallbackUsed),
        fallbackReason: result?.fallbackReason || null
      },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeSceneEnvironment(input = {}) {
    const policy = this.#policy();
    const scene = normalizeEnvironmentScene(input.scene);
    if (!scene.synopsis && !scene.location && !scene.shotContext.length) {
      fail('cinematic_scene_environment_context_required', 'Save Scene context before generating its description.');
    }
    const result = await this.providerFactory(policy).generateCinematicSceneEnvironment({
      context: {
        project: {
          title: boundedText(input.projectTitle, 120),
          aspectRatio: boundedText(input.aspectRatio, 20),
          storyBrief: boundedText(input.storyBrief, 10000),
          fullStory: boundedText(input.fullStory, 12000),
          storySettings: input.storySettings && typeof input.storySettings === 'object' ? input.storySettings : {}
        },
        chapter: {
          title: boundedText(input.chapterTitle, 120),
          story: boundedText(input.chapterStory, 10000)
        },
        scene,
        adjacentScenes: {
          previous: normalizeAdjacentScene(input.previousScene),
          next: normalizeAdjacentScene(input.nextScene)
        },
        currentDirection: boundedText(input.currentDirection, 2500),
        outputContract: {
          language: 'English',
          maximumCharacters: 2500,
          people: 'none',
          readableText: 'none'
        }
      },
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: Math.min(policy.maxOutputTokens, 2500),
      timeoutMs: policy.timeoutMs
    });
    const environmentPrompt = boundedText(result?.environmentPrompt, 2500);
    if (!environmentPrompt) {
      fail('cinematic_scene_environment_invalid_response', 'Scene description generation returned no usable prompt.', 502);
    }
    return {
      proposalId: `cineenvironment_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      environmentPrompt,
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: { provider: policy.provider, model: policy.model, responseId: result?.responseId || null },
      billingStatus: 'qualification_no_charge'
    };
  }

  #policy() {
    const policy = this.policyLoader();
    if (!policy.enabled) fail(
      policy.requestedEnabled ? 'cinematic_story_enhancement_provider_unavailable' : 'cinematic_story_enhancement_disabled',
      'Cinematic story generation is not enabled.',
      503
    );
    this.availabilityPolicy.assertAvailable({ providerId: policy.provider, modelId: policy.model, workflow: 'ai.story_enhancement' });
    return policy;
  }
}

function normalizeStoryInput(input) {
  const brief = boundedText(input.storyBrief, 10000);
  const currentFullStory = boundedText(input.currentFullStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
  const revisionInstruction = boundedText(input.revisionInstruction, cinematicWorkflowPolicy.authoring.fullStoryInstructionMaximumCharacters);
  if (!brief && !currentFullStory) fail('cinematic_full_story_source_required', 'Add a Project Brief or current Full Story first.');
  if (currentFullStory && !revisionInstruction) {
    fail('cinematic_full_story_revision_instruction_required', 'Add a revision instruction before revising the Full Story.');
  }
  return {
    storyBrief: brief,
    currentFullStory,
    revisionInstruction,
    projectTitle: boundedText(input.projectTitle, 120),
    format: input.format === 'mini-series' ? 'mini-series' : 'short-film',
    targetDurationSeconds: Math.max(1, Number(input.targetDurationSeconds) || 60),
    storySettings: input.storySettings && typeof input.storySettings === 'object' ? input.storySettings : {},
    existingCharacters: normalizeExistingCharacters(input.existingCharacters)
  };
}

function normalizeExistingCharacters(value) {
  return (Array.isArray(value) ? value : []).slice(0, 24).map(item => ({
    id: boundedText(item?.id, 160),
    displayName: boundedText(item?.displayName, 120),
    storyRole: boundedText(item?.storyRole, 240),
    objective: boundedText(item?.objective, 1000),
    personalityTraits: boundedList(item?.personalityTraits, 6, 120)
  })).filter(item => item.id && item.displayName);
}

function normalizeGeneratedCharacters(value, existing = []) {
  const existingIds = new Set(existing.map(item => item.id));
  return (Array.isArray(value) ? value : []).slice(0, 24).map(item => ({
    existingCharacterId: existingIds.has(String(item?.existingCharacterId || '')) ? String(item.existingCharacterId) : null,
    displayName: boundedText(item?.displayName, 120),
    storyRole: boundedText(item?.storyRole, 240),
    storyImportance: item?.storyImportance === 'protagonist' ? 'protagonist' : 'supporting',
    objective: boundedText(item?.objective, 1000),
    motivation: boundedText(item?.motivation, 1000),
    pressure: boundedText(item?.pressure, 1000),
    personalityTraits: boundedList(item?.personalityTraits, 6, 120),
    emotionalBaseline: boundedText(item?.emotionalBaseline, 500),
    dialogueStyle: boundedText(item?.dialogueStyle, 500),
    performanceDirection: boundedText(item?.performanceDirection, 1000)
  })).filter(item => item.displayName);
}

function boundedText(value, maximum) { return String(value || '').trim().slice(0, maximum); }
function normalizeChapterContext(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    projectId: boundedText(value.projectId, 160),
    title: boundedText(value.title, 120),
    story: boundedText(value.story, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters)
  };
}
function normalizeChapterList(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map(item => ({
    projectId: boundedText(item?.projectId, 160),
    order: Math.max(1, Number(item?.order) || 1),
    title: boundedText(item?.title, 120),
    story: boundedText(item?.story, 6000)
  }));
}
function normalizeCharacterList(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map(item => ({
    id: boundedText(item?.id, 160),
    name: boundedText(item?.name, 120),
    role: boundedText(item?.role, 240),
    dossier: boundedText(item?.dossier, 1200),
    dialogueStyle: boundedText(item?.dialogueStyle, 500)
  }));
}
function normalizeSceneList(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map((item, index) => ({
    order: index + 1,
    id: boundedText(item?.id, 180),
    title: boundedText(item?.title, 120),
    synopsis: boundedText(item?.synopsis || item?.storyChange, 4000),
    location: boundedText(item?.location, 240),
    time: boundedText(item?.time, 160),
    durationSeconds: Math.max(0, Math.round(Number(item?.durationMs || 0) / 1000)),
    shotCount: Array.isArray(item?.shots) ? item.shots.length : 0
  }));
}
function normalizeShotScene(value) {
  const scene = value && typeof value === 'object' ? value : {};
  return {
    id: boundedText(scene.id, 180),
    title: boundedText(scene.title, 120),
    synopsis: boundedText(scene.synopsis || scene.storyChange, 4000),
    purpose: boundedText(scene.purpose, 80),
    objective: boundedText(scene.objective, 1000),
    location: boundedText(scene.location, 240),
    time: boundedText(scene.time, 160),
    weather: boundedText(scene.weather, 160),
    environment: boundedText(scene.environmentPrompt, 2500),
    entryState: boundedText(scene.entryState, 1000),
    exitState: boundedText(scene.exitState, 1000),
    emotionalStart: boundedText(scene.emotionalStart, 500),
    emotionalEnd: boundedText(scene.emotionalEnd, 500),
    transitionIntent: boundedText(scene.transitionIntent, 500),
    targetDurationMs: Math.max(1000, Number(scene.durationMs) || 15000),
    dialogueTargetPercent: Math.max(0, Math.min(100, Number(scene.dialogueTargetPercent) || 0)),
    characterIds: (Array.isArray(scene.castAssignmentIds) ? scene.castAssignmentIds : []).slice(0, 24)
  };
}
function normalizeAdjacentScene(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    title: boundedText(value.title, 120),
    entryState: boundedText(value.entryState, 1000),
    exitState: boundedText(value.exitState, 1000),
    transitionIntent: boundedText(value.transitionIntent, 500)
  };
}
function normalizeEnvironmentScene(value) {
  const scene = value && typeof value === 'object' ? value : {};
  return {
    id: boundedText(scene.id, 180),
    title: boundedText(scene.title, 120),
    synopsis: boundedText(scene.synopsis || scene.storyChange, 4000),
    purpose: boundedText(scene.purpose, 1000),
    objective: boundedText(scene.objective, 1000),
    pressure: boundedText(scene.pressure, 1000),
    location: boundedText(scene.location, 500),
    time: boundedText(scene.time, 300),
    weather: boundedText(scene.weather, 300),
    artDirection: boundedText(scene.artDirection, 1500),
    lighting: boundedText(scene.lighting, 1500),
    entryState: boundedText(scene.entryState, 1000),
    exitState: boundedText(scene.exitState, 1000),
    propContinuity: boundedText(scene.propContinuity, 1500),
    continuityNotes: boundedList(scene.continuityNotes, 12, 500),
    shotContext: normalizeShotList(scene.shots, 20)
  };
}
function normalizeShotList(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map((item, index) => ({
    order: index + 1,
    title: boundedText(item?.title, 120),
    durationMs: Math.max(500, Math.min(20000, Number(item?.durationMs) || 5000)),
    shotDocument: boundedText(item?.shotDocument || item?.prompt || item?.purpose, cinematicWorkflowPolicy.authoring.shotDocumentMaximumCharacters)
  }));
}
function normalizeChapterPlan(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map((item, index) => ({
    order: index + 1,
    seasonNumber: Math.max(1, Number(item?.seasonNumber) || 1),
    chapterNumber: Math.max(1, Number(item?.chapterNumber) || index + 1),
    ...(item?.synopsis ? { title: boundedText(item.title, 120), synopsis: boundedText(item.synopsis, cinematicWorkflowPolicy.authoring.chapterOutlineSynopsisMaximumCharacters) } : {})
  }));
}
function boundedList(value, maximum, length) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map(item => boundedText(item, length)).filter(Boolean);
}
function fail(code, message, statusCode = 400) {
  const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error;
}

export const cinematicFullStoryService = new CinematicFullStoryService();
