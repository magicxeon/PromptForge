import crypto from 'node:crypto';
import {directingContext,normalizeSceneEvents} from '../../config/storyDirectingSkills.js';
import { resolveWritingPreferences, briefSuggestionChoices, storySpokenLanguage } from '../../config/storyWritingSettings.js';
import { planStoryPromptLanguage, planStoryPromptRefinement } from '../cinematic/StoryPromptLanguage.js';
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

  async suggestDirection(story, settings) {
    const limit = cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters;
    if (typeof story !== 'string' || !story.trim() || story.length > limit) fail('cinematic_chapter_story_required','Supply a script within the authoring limit.');
    const policy = this.#policy(settings);
    const result = await this.providerFactory(policy).suggestStoryDirection({
      story, choices:briefSuggestionChoices, model:policy.model, reasoningEffort:policy.reasoningEffort, timeoutMs:policy.timeoutMs
    });
    if (Object.entries(briefSuggestionChoices).some(([key,choices]) => !choices.includes(result?.[key]))) {
      fail('cinematic_story_direction_invalid','The proposed story direction is incomplete.',502);
    }
    return Object.fromEntries(Object.keys(briefSuggestionChoices).map(key => [key,result[key]]));
  }

  async translateStoryPrompt(text, cues, settings, findings, sceneContext, narrative) {
    const spokenLanguage = storySpokenLanguage(settings);
    const {slots,render} = planStoryPromptLanguage(text,cues,findings,sceneContext?.sequenceFormat === 'director-brief',spokenLanguage);
    const policy = this.#policy(settings,"shots",{text,narrative,sceneContext});
    const result = await this.providerFactory(policy).translateStoryPrompt({
      slots, spokenLanguage, narrative, editorialInstructions:policy.skillContext?.editorialInstructions,
      sceneContext:sceneContext && {...sceneContext, projectDirection:settings?.direction},
      model:policy.model, reasoningEffort:policy.reasoningEffort,
      maxOutputTokens:policy.maxOutputTokens, timeoutMs:policy.longFormTimeoutMs || policy.timeoutMs
    });
    return {text:render(result?.translations,spokenLanguage), reviewNotes:sceneContext ? result?.reviewNotes : undefined, provenance:{...policy.skillProvenance,provider:policy.provider,
      model:policy.model,responseId:result?.responseId || null,usage:normalizeWritingUsage(result?.usage)}};
  }

  async refineStoryPrompt(draft, source, settings, context) {
    const plan = planStoryPromptRefinement(draft);
    const policy = this.#policy(settings,"shots",source);
    const result = await this.providerFactory(policy).refineStoryPrompt({
      lines:plan.lines, source, context:{...context,...policy.skillContext, projectDirection:settings?.direction},
      model:policy.model, reasoningEffort:policy.reasoningEffort, maxOutputTokens:policy.maxOutputTokens,
      timeoutMs:policy.longFormTimeoutMs || policy.timeoutMs
    });
    return {text:plan.apply(result?.edits),reviewNotes:result.reviewNotes,provenance:{...policy.skillProvenance,provider:policy.provider,
      model:policy.model,responseId:result.responseId || null,usage:normalizeWritingUsage(result.usage)}};
  }

  async proposeShotArt({scene,shot,sceneImage,writingSettings,language}) {
    const policy = this.#policy(writingSettings,"shots",{scene,shot});
    const context = {language, ...policy.skillContext,
      directing: directingContext('art',writingSettings),
      scene:{location:scene.location, time:scene.time, lighting:scene.lighting, art:scene.artDirection, environment:scene.environmentPrompt, blockingMap:scene.blockingMap},
      shot:{title:shot.title, purpose:shot.purpose, opening:shot.visibleMoment, action:shot.subjectAction,
        document:shot.shotDocument, camera:shot.framing, movement:shot.cameraMovement, lighting:shot.lighting,
        durationMs:shot.durationMs, currentArt:shot.artDirection, cameraDirectionNotes:shot.cameraDirectionNotes}};
    const result = await this.providerFactory(policy).suggestShotArt({context,sceneImage,model:policy.model,
      reasoningEffort:policy.reasoningEffort,timeoutMs:policy.timeoutMs,maxOutputTokens:policy.maxOutputTokens});
    const artDirection = typeof result?.artDirection === 'string' && result.artDirection.trim();
    if (!artDirection || artDirection.length > 1500) fail('cinematic_art_direction_invalid','The writing model returned an unusable art direction.',502);
    return {artDirection,provenance:{...policy.skillProvenance,provider:policy.provider,model:policy.model,responseId:result.responseId||null,usage:normalizeWritingUsage(result.usage)}};
  }

  async propose(input = {}) {
    const policy = this.#policy(input.writingSettings,"full_story",input);
    const context = normalizeStoryInput(input);
    const result = await this.providerFactory(policy).generateCinematicFullStory({
      context: { ...context, ...policy.skillContext },
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
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage) },
      billingStatus: 'free'
    };
  }

  async proposeCharacters(input = {}) {
    const policy = this.#policy();
    const sources = input.sources;
    const fullStory = String(sources?.[0]?.text || input.currentFullStory || '').trim();
    if (!fullStory || fullStory.length > cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters) {
      fail('cinematic_full_story_required', 'Save the Full Story before extracting Characters.');
    }
    const existingCharacters = normalizeExistingCharacters(input.existingCharacters);
    const result = await this.providerFactory(policy).extractCinematicStoryCharacters({
      context: sources ? { sources: sources.map(({kind,title,text},index) => ({index,kind,title,text})),
        existingCharacters, selectedCharacterIds: input.selectedCharacterIds || [] } : { fullStory, existingCharacters },
      model: policy.model, reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    if (!Array.isArray(result?.characters)) fail('cinematic_full_story_invalid_response', 'Character extraction returned invalid data.', 502);
    const characters = normalizeGeneratedCharacters(result.characters, existingCharacters);
    if (sources) {
      for (const character of characters) {
        character.evidence = character.evidence.flatMap(({sourceIndex, quote}) => {
          const source = sources[sourceIndex];
          return source?.text.includes(quote) ? [{sourceIndex, title:source.title, quote}] : [];
        });
      }
    }
    return {
      proposalId: `cinefull_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      fullStory,
      characters: input.selectedCharacterIds?.length
        ? characters.filter(character => input.selectedCharacterIds.includes(character.existingCharacterId))
        : characters,
      warnings: boundedList(result.warnings, 8, 500),
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result.responseId || null,
        usage: normalizeWritingUsage(result?.usage) },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeChapters(input = {}) {
    const policy = this.#policy(input.writingSettings,"chapters",input);
    const fullStory = boundedText(input.fullStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
    if (!fullStory && !(input.scope === 'selected' && input.continuity?.confirmedCanonAvailable === false && input.currentChapter?.story?.trim())) {
      fail('cinematic_full_story_required', 'Confirm a Full Story before generating Chapters.');
    }
    const maxChapters = Math.min(
      cinematicWorkflowPolicy.authoring.generatedChapterMaximum,
      Math.max(1, Number(input.maxChapters) || cinematicWorkflowPolicy.authoring.defaultChapterCount)
    );
    const expectedChapterCount = input.scope === 'selected' ? 1 : maxChapters;
    const request = {
      context: {
        fullStory,
        format: input.format === 'mini-series' ? 'mini-series' : 'short-film',
        targetDurationSeconds: Math.max(1, Number(input.targetDurationSeconds) || 60),
        maxChapters,
        expectedChapterCount,
        ...policy.skillContext,
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
    };
    const provider = this.providerFactory(policy);
    const result = input.sequentialChapters
      ? await draftChaptersInOrder(provider, request, input.onProgress)
      : await provider.generateCinematicChapters(request);
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
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage), recordedAt: new Date().toISOString() },
      billingStatus: 'qualification_no_charge'
    };
  }

  async estimateChapterPlanning(input = {}) {
    let policy;
    try { policy = this.#policy(input.writingSettings); }
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
    const { writingSettings, ...context } = input;
    const policy = this.#policy(writingSettings,"chapter_outline",context);
    const started = Date.now();
    const result = await this.providerFactory(policy).generateCinematicChapterOutline({
      context: { ...context, ...policy.skillContext, maximumChapters: Math.min(cinematicWorkflowPolicy.authoring.generatedChapterMaximum,
        cinematicWorkflowPolicy.projectCreation.maximumChapterCount),
        synopsisMaximumCharacters: cinematicWorkflowPolicy.authoring.chapterOutlineSynopsisMaximumCharacters },
      model: policy.model, reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: cinematicWorkflowPolicy.authoring.chapterOutlineMaximumOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    });
    return { chapters: normalizeChapterOutlineRows(result?.chapters, input.settings),
      rationale: boundedText(result?.rationale, 1000), warnings: boundedList(result?.warnings, 8, 500),
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage), durationMs: Date.now() - started, recordedAt: new Date().toISOString() }
    };
  }

  async proposeScenes(input = {}) {
    const policy = this.#policy(input.writingSettings,"scenes",input);
    const chapterStory = boundedText(input.chapterStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
    if (!chapterStory) fail('cinematic_chapter_story_required', 'Save Chapter prose before generating Scenes.');
    const maximumScenes = Math.min(
      cinematicWorkflowPolicy.authoring.generatedSceneMaximum,
      Math.max(1, Number(input.maximumScenes) || cinematicWorkflowPolicy.authoring.generatedSceneMaximum)
    );
    const provider = this.providerFactory(policy);
    const sections = planSceneSections(chapterStory, maximumScenes);
    const request = {
      context: {
        chapter: {
          title: boundedText(input.chapterTitle, 120),
          story: chapterStory,
          paragraphStarts: chapterStory.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map((line,i)=>[i+1,line.slice(0,64)]),
          targetDurationSeconds: Math.max(5, Number(input.targetDurationSeconds) || 60)
        },
        project: {
          title: boundedText(input.projectTitle, 120),
          storySettings: input.storySettings && typeof input.storySettings === 'object' ? input.storySettings : {}
        },
        characters: normalizeCharacterList(input.characters, 24),
        currentScenes: normalizeSceneList(input.currentScenes, maximumScenes),
        directing: directingContext('scene',input.writingSettings),
        ...policy.skillContext,
        continuity: input.continuity || null,
        maximumScenes
      },
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.longFormTimeoutMs || policy.timeoutMs
    };
    const result = await generateSceneSections(provider, request, sections, input.onProgress, input.beforeNextSection);
    const scenes = (Array.isArray(result?.scenes) ? result.scenes : []).slice(0, maximumScenes);
    if (!scenes.length) fail('cinematic_scenes_incomplete_response', 'Scene generation returned no complete Scenes. Nothing was saved.', 502);
    return {
      proposalId: `cinescenes_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      scenes,
      warnings: boundedList(result?.warnings, 8, 500),
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage) },
      billingStatus: 'qualification_no_charge'
    };
  }

  async proposeShots(input = {}) {
    const policy = this.#policy(input.writingSettings,"shots",input);
    const scene = normalizeShotScene(input.scene);
    if (!scene.synopsis && !scene.objective) fail('cinematic_scene_direction_required', 'Save the Scene situation before generating Shots.');
    const maximumShots = Math.min(
      cinematicWorkflowPolicy.authoring.generatedShotMaximumPerScene,
      Math.max(1, Number(input.maximumShots) || cinematicWorkflowPolicy.authoring.generatedShotMaximumPerScene)
    );
    const result = await this.shotProviderFactory(policy).generateCinematicSceneShots({
      sceneImage: input.sceneImage,
      context: {
        project: { title: boundedText(input.projectTitle, 120), aspectRatio: boundedText(input.aspectRatio, 20) },
        chapter: { title: boundedText(input.chapterTitle, 120), story: boundedText(input.chapterStory, 10000) },
        scene,
        ...policy.skillContext,
        directing: directingContext('shots',input.writingSettings,scene.sceneEvents),
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
        ...policy.skillProvenance,
        provider: result?.executionProvider || policy.provider,
        model: result?.executionModel || policy.model,
        responseId: result?.responseId || null,
        fallbackUsed: Boolean(result?.fallbackUsed),
        fallbackReason: result?.fallbackReason || null,
        usage: normalizeWritingUsage(result?.usage)
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
        editorialInstructions: resolveWritingPreferences(input.writingSettings,"environment",input).skillInstructions,
        directing: directingContext('environment',input.writingSettings),
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
      provenance: { ...policy.skillProvenance, provider: policy.provider, model: policy.model, responseId: result?.responseId || null,
        usage: normalizeWritingUsage(result?.usage) },
      billingStatus: 'qualification_no_charge'
    };
  }

  #policy(writingSettings, task = "full_story", source = "") {
    const policy = { ...this.policyLoader() };
    if (writingSettings) {
      const { modelId, skillInstructions, selectedSkillVersions, selectionVersion } = resolveWritingPreferences(writingSettings,task,source);
      policy.skillProvenance={selectedSkillVersions,selectionVersion};
      if (modelId) {
        policy.model = modelId;
        policy.fallback = { ...policy.fallback, enabled: false };
        if (modelId.startsWith('gpt-6.2-') && policy.reasoningEffort === 'none') policy.reasoningEffort = 'low';
      }
      if (skillInstructions.length) policy.skillContext = { editorialInstructions: skillInstructions };
    }
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
  const currentFullStory = boundedText(input.currentFullStory, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters);
  const revisionInstruction = boundedText(input.revisionInstruction, cinematicWorkflowPolicy.authoring.fullStoryInstructionMaximumCharacters);
  // A new project may start from a writing brief entered directly in the manuscript editor.
  const brief = boundedText(input.storyBrief, 10000) || (!currentFullStory ? revisionInstruction : '');
  if (!brief && !currentFullStory) fail('cinematic_full_story_source_required', 'Add a Project Brief or current Full Story first.');
  if (currentFullStory && !revisionInstruction) {
    fail('cinematic_full_story_revision_instruction_required', 'Add a revision instruction before revising the Full Story.');
  }
  return {
    storyBrief: brief,
    currentFullStory,
    continuity: input.continuity || null,
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
    personalityTraits: boundedList(item?.personalityTraits, 6, 120),
    aliases: boundedList(item?.storyCharacterDetails?.aliases, 12, 120)
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
    performanceDirection: boundedText(item?.performanceDirection, 1000),
    aliases: boundedList(item?.aliases, 12, 120),
    appearance: boundedText(item?.appearance, 2000),
    suggestedAppearance: boundedText(item?.suggestedAppearance, 1000),
    suggestedAppearance: boundedText(item?.suggestedAppearance, 1000),
    wardrobe: boundedText(item?.wardrobe, 2000),
    development: boundedText(item?.development, 2000),
    mentionedOnly: item?.mentionedOnly === true,
    evidence: (Array.isArray(item?.evidence) ? item.evidence : []).slice(0, 6).flatMap(entry => {
      const quote = boundedText(entry?.quote, 360);
      return Number.isInteger(entry?.sourceIndex) && entry.sourceIndex >= 0 && quote
        ? [{sourceIndex:entry.sourceIndex, quote}] : [];
    })
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
    aliases: boundedList(item?.aliases, 12, 120),
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
    shotCount: Array.isArray(item?.shots) ? item.shots.length : 0,
    sceneEvents: normalizeSceneEvents(item?.sceneEvents),
    blockingMap: boundedText(item?.blockingMap,2000),
    lighting: boundedText(item?.lighting,500),
    audioIntent: boundedText(item?.audioIntent,500)
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
    sceneEvents: normalizeSceneEvents(scene.sceneEvents),
    blockingMap: boundedText(scene.blockingMap,2000),
    lighting: boundedText(scene.lighting,500),
    audioIntent: boundedText(scene.audioIntent,500),
    artDirection: boundedText(scene.artDirection,1000),
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
    blockingMap: boundedText(scene.blockingMap,2000),
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
    cameraDirectionNotes: boundedText(item?.cameraDirectionNotes,2000),
    shotDocument: boundedText(item?.shotDocument || item?.prompt || item?.purpose, cinematicWorkflowPolicy.authoring.shotDocumentMaximumCharacters)
  }));
}
export function planSceneSections(story, maximumScenes = cinematicWorkflowPolicy.authoring.generatedSceneMaximum) {
  const lines = boundedText(story, cinematicWorkflowPolicy.authoring.fullStoryMaximumCharacters)
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const text = lines.join('\n');
  const count = Math.min(maximumScenes, Math.max(1, Math.ceil(text.length / cinematicWorkflowPolicy.authoring.sceneSectionCharacters)));
  const sections = [];
  let start = 0;
  let paragraph = 1;
  for (let index = 0; index < count; index++) {
    const size = Math.ceil((text.length - start) / (count - index));
    let end = start + size;
    if (index < count - 1) {
      const candidates = [text.lastIndexOf('\n', end), text.indexOf('\n', end)]
        .filter(pos => pos > start && Math.abs(pos - end) <= size / 3);
      if (candidates.length) end = candidates.sort((a,b) => Math.abs(a-end) - Math.abs(b-end))[0] + 1;
      else {
        const nearby = text.slice(start + Math.floor(size * .75), end);
        const breaks = [...nearby.matchAll(/[。！？.!?\s]/gu)];
        if (breaks.length) end = start + Math.floor(size * .75) + breaks.at(-1).index + 1;
        else if (/^[\uDC00-\uDFFF]/.test(text.slice(end))) end++;
      }
    }
    const chunk = text.slice(start,end);
    sections.push({story:chunk.trim(), firstParagraph:paragraph});
    paragraph += chunk.split('\n').length - 1;
    start = end;
  }
  return sections;
}

async function generateSceneSections(provider, request, sections, onProgress, beforeNextSection) {
  const total = sections.length;
  const chapter = request.context.chapter;
  onProgress?.({completed:0,total,title:chapter.title});
  if (total === 1) {
    const result = await provider.generateCinematicChapterScenes(request);
    if (result?.scenes?.length) onProgress?.({completed:1,total,title:chapter.title});
    return result;
  }
  const scenes = [], warnings = [];
  const usage = {input_tokens:0,output_tokens:0,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}};
  let usageComplete = true, responseId = null, consumedCharacters = 0, allocatedSeconds = 0;
  const characters = sections.reduce((sum,part)=>sum+part.story.length,0);
  for (const [index,part] of sections.entries()) {
    if (index > 0) await beforeNextSection?.();
    const maximumScenes = Math.floor((request.context.maximumScenes - scenes.length)/(total-index));
    consumedCharacters += part.story.length;
    const endSeconds = Math.round(chapter.targetDurationSeconds * consumedCharacters / characters);
    const result = await provider.generateCinematicChapterScenes({...request,context:{...request.context,maximumScenes,
      section:{number:index+1,total,previousEnding:String(scenes.at(-1)?.exitState || scenes.at(-1)?.synopsis || '').slice(0,cinematicWorkflowPolicy.authoring.continuityExcerptCharacters)},
      chapter:{...chapter,story:part.story,paragraphStarts:part.story.split('\n').map((line,i)=>[i+1,line.slice(0,64)]),targetDurationSeconds:Math.max(1,endSeconds-allocatedSeconds)}
    }});
    if (!Array.isArray(result?.scenes) || !result.scenes.length || result.scenes.length > maximumScenes)
      fail('cinematic_scenes_incomplete_response', `Scene section ${index+1}/${total} returned an incomplete proposal. Nothing was saved.`,502);
    allocatedSeconds = endSeconds;
    for (const scene of result.scenes) scenes.push({...scene,sourceStartParagraph:part.firstParagraph + scene.sourceStartParagraph - 1});
    warnings.push(...boundedList(result.warnings,8,500));
    responseId = result.responseId;
    const tokens = normalizeWritingUsage(result.usage);
    if (tokens) {
      usage.input_tokens += tokens.inputTokens;
      usage.output_tokens += tokens.outputTokens;
      usage.input_tokens_details.cached_tokens += tokens.cachedInputTokens;
      usage.output_tokens_details.reasoning_tokens += tokens.reasoningTokens;
    } else usageComplete = false;
    onProgress?.({completed:index+1,total,title:chapter.title});
  }
  return {scenes,warnings,responseId,usage:usageComplete ? usage : null};
}

async function draftChaptersInOrder(provider, request, onProgress) {
  const plan = request.context.chapterPlan;
  if (plan.length !== request.context.expectedChapterCount) {
    fail('cinematic_chapter_target_invalid', 'Review the chapter outline before drafting.');
  }
  const chapters = [];
  const warnings = [];
  const usage = {input_tokens: 0, output_tokens: 0, input_tokens_details: {cached_tokens: 0}, output_tokens_details: {reasoning_tokens: 0}};
  let usageComplete = true;
  let responseId = null;
  onProgress?.({completed: 0, total: plan.length, title: plan[0].title || ''});
  for (const target of plan) {
    const result = await provider.generateCinematicChapters({
      ...request,
      context: {...request.context, scope: 'planned_chapter', chapterPlan: [target], reviewedOutline: plan,
        previousChapterEnding: chapters.at(-1)?.story.slice(-cinematicWorkflowPolicy.authoring.continuityExcerptCharacters) || '',
        maxChapters: 1, expectedChapterCount: 1}
    });
    const chapter = result?.chapters?.[0];
    if (result?.chapters?.length !== 1 || typeof chapter?.story !== 'string' || !chapter.story.trim()) {
      fail('cinematic_chapters_incomplete_response', `Chapter ${target.chapterNumber} returned an incomplete draft. Nothing was saved.`, 502);
    }
    const title = target.title || boundedText(chapter.title, 120) || `Chapter ${target.chapterNumber}`;
    chapters.push({title, story: chapter.story});
    warnings.push(...boundedList(result.warnings, 8, 500));
    responseId = result.responseId;
    const tokens = normalizeWritingUsage(result.usage);
    if (tokens) {
      usage.input_tokens += tokens.inputTokens;
      usage.output_tokens += tokens.outputTokens;
      usage.input_tokens_details.cached_tokens += tokens.cachedInputTokens;
      usage.output_tokens_details.reasoning_tokens += tokens.reasoningTokens;
    } else usageComplete = false;
    onProgress?.({completed: chapters.length, total: plan.length, title});
  }
  return {chapters, warnings, responseId, usage: usageComplete ? usage : null};
}

function normalizeChapterPlan(value, maximum) {
  return (Array.isArray(value) ? value : []).slice(0, maximum).map((item, index) => ({
    order: index + 1,
    seasonNumber: Math.max(1, Number(item?.seasonNumber) || 1),
    chapterNumber: item?.chapterNumber ?? index + 1,
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
