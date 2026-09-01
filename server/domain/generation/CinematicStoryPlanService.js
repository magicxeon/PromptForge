import crypto from 'node:crypto';
import { getCinematicStoryPlanPolicy } from '../../config/cinematic-story-plan-policy.js';
import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';
import {
  analyzeStoryPlanSource,
  buildFilmScriptPreview,
  evaluateStoryPlanFilmReadiness
} from '../cinematic/StoryPlanFilmReadiness.js';

export class CinematicStoryPlanService {
  constructor({
    policyLoader = getCinematicStoryPlanPolicy,
    storyRecipeLoader = () => loadPromptRecipe('cinematic/story-plan.v3.json'),
    sceneRecipeLoader = () => loadPromptRecipe('cinematic/scene-direction.v2.json'),
    providerFactory = policy => new OpenAITextProvider(policy.apiKey)
  } = {}) {
    this.policyLoader = policyLoader;
    this.storyRecipeLoader = storyRecipeLoader;
    this.sceneRecipeLoader = sceneRecipeLoader;
    this.providerFactory = providerFactory;
  }

  async generatePlan(project, { mode = 'generate', sourceResolution = null } = {}) {
    const normalizedMode = mode === 'review_current' ? 'review_current' : 'generate';
    const normalizedResolution = ['story_brief', 'creative_direction'].includes(sourceResolution)
      ? sourceResolution
      : null;
    const preflight = analyzeStoryPlanSource(project, { sourceResolution: normalizedResolution });
    if (preflight.status === 'blocked') {
      return {
        proposalId: createProposalId(),
        operation: normalizedMode === 'review_current'
          ? 'cinematic_story_plan_review'
          : 'cinematic_story_plan_generate',
        mode: normalizedMode,
        status: 'blocked',
        expectedProjectVersion: project.version,
        storySourceVersionId: project.activeStorySourceVersionId,
        sourceResolution: normalizedResolution,
        preflight,
        plan: null,
        filmReadiness: null,
        scriptPreview: [],
        provenance: null,
        billingStatus: 'qualification_no_charge'
      };
    }
    const policy = assertEnabled(this.policyLoader());
    const recipe = assertRecipe(this.storyRecipeLoader());
    const context = buildProjectContext(project, { preflight, mode: normalizedMode });
    const result = await this.providerFactory(policy).generateCinematicStoryPlan({
      context,
      recipe,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    const plan = normalizePlan(result, project, {
      sourceResolution: normalizedResolution,
      directorOperation: normalizedMode
    });
    const filmReadiness = evaluateStoryPlanFilmReadiness(project, plan, {
      preflight,
      aiFindings: plan.directorFindings
    });
    const scriptPreview = buildFilmScriptPreview(plan);
    plan.filmReadiness = filmReadiness;
    plan.scriptPreview = scriptPreview;
    return {
      proposalId: createProposalId(),
      operation: normalizedMode === 'review_current'
        ? 'cinematic_story_plan_review'
        : 'cinematic_story_plan_generate',
      mode: normalizedMode,
      status: 'proposal',
      expectedProjectVersion: project.version,
      storySourceVersionId: project.activeStorySourceVersionId,
      sourceResolution: normalizedResolution,
      preflight,
      plan,
      filmReadiness,
      scriptPreview,
      provenance: provenance(result, policy, recipe),
      billingStatus: 'qualification_no_charge'
    };
  }

  async generateScene(project, sceneId, direction = '') {
    const policy = assertEnabled(this.policyLoader());
    const recipe = assertRecipe(this.sceneRecipeLoader());
    const sceneIndex = project.scenes.findIndex(item => item.id === sceneId);
    if (sceneIndex < 0) throw createError('cinematic_scene_not_found', 'Scene not found.', 404);
    const current = project.scenes[sceneIndex];
    const activePlan = project.storyPlanVersions?.find(version => version.id === project.activeStoryPlanVersionId)
      || project.storyPlanVersions?.at(-1);
    const preflight = analyzeStoryPlanSource(project, { sourceResolution: activePlan?.sourceResolution || null });
    if (preflight.status === 'blocked') {
      throw createError('cinematic_story_plan_source_conflict', 'Resolve Story Source conflicts before generating Scene Direction.', 409);
    }
    const context = {
      ...buildProjectContext(project, { preflight, mode: 'review_current' }),
      selectedScene: current,
      previousScene: project.scenes[sceneIndex - 1] || null,
      nextScene: project.scenes[sceneIndex + 1] || null,
      userDirection: bounded(direction, 1200)
    };
    const result = await this.providerFactory(policy).generateCinematicSceneDirection({
      context,
      recipe,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    return {
      proposalId: createProposalId(),
      operation: 'cinematic_scene_direction_generate',
      expectedProjectVersion: project.version,
      storySourceVersionId: project.activeStorySourceVersionId,
      sceneId,
      scene: normalizeScene(result, project, {
        id: current.id,
        beatId: current.beatId || null,
        targetDurationMs: current.durationMs,
        existingShots: current.shots,
        orderKey: current.orderKey
      }),
      warnings: stringList(result.warnings, 20, 240),
      provenance: provenance(result, policy, recipe),
      billingStatus: 'qualification_no_charge'
    };
  }
}

function buildProjectContext(project, { preflight, mode }) {
  const storyText = preflight?.resolvedStoryBrief || project.setup?.storyBrief;
  const creativeDirection = preflight?.resolvedCreativeDirection ?? project.setup?.creativeDirection;
  const staleRoleIds = new Set((preflight?.diagnostics || [])
    .filter(item => item.code === 'story_role_direction_may_be_stale')
    .map(item => item.entityId));
  return {
    project: {
      id: project.id,
      title: project.title,
      platform: project.setup?.platform,
      aspectRatio: project.aspectRatio,
      targetDurationSeconds: project.durationTargetMs / 1000,
      genre: project.setup?.genre,
      audienceFeeling: project.setup?.audienceFeeling,
      pacing: project.setup?.pacing,
      endingIntent: project.setup?.endingIntent,
      storyBrief: storyText,
      creativeDirection,
      storySourceVersionId: project.activeStorySourceVersionId
    },
    videoTimingGuidance: {
      ownership: 'editorial_planning_only',
      preferredShotDurationsSeconds: [4, 6, 8],
      portableShotMaximumSeconds: 8,
      rules: [
        'Preserve the exact Project total duration.',
        'Prefer a supported duration only when it preserves performance, dialogue and continuity.',
        'Do not select a provider, model or price in Story Plan.',
        'A later Generation quote reconciles editorial duration with the selected provider.'
      ]
    },
    directorOperation: mode,
    sourceResolution: preflight ? {
      mode: preflight.sourceResolution,
      ignoredCreativeDirection: Boolean(project.setup?.creativeDirection && !creativeDirection),
      diagnostics: preflight.diagnostics.map(item => ({
        code: item.code, severity: item.severity, summary: item.summary, resolved: item.resolved
      }))
    } : null,
    roles: (project.setup?.storyRoleSlots || []).map(role => ({
      id: role.id, label: role.label, importance: role.importance,
      storyFunction: staleRoleIds.has(role.id) ? '' : role.storyFunction,
      objective: staleRoleIds.has(role.id) ? '' : role.objective,
      emotionalArc: staleRoleIds.has(role.id) ? '' : role.emotionalArc,
      performanceDirection: role.performanceDirection,
      directionStatus: staleRoleIds.has(role.id) ? 'excluded_stale' : 'current'
    })),
    cast: (project.castAssignments || []).filter(item => item.active !== false).map(item => ({
      id: item.id, storyRoleSlotId: item.storyRoleSlotId || null,
      displayName: item.displayName, storyRole: item.storyRole,
      objective: item.objective, motivation: item.motivation, pressure: item.pressure,
      personalityTraits: item.personalityTraits, emotionalBaseline: item.emotionalBaseline,
      dialogueStyle: item.dialogueStyle, performanceDirection: item.performanceDirection,
      identityReady: item.identityReady,
      looks: (item.looks || []).map(look => ({ id: look.id, name: look.name, locked: look.locked }))
    })),
    currentPlan: mode === 'review_current' && project.scenes?.length ? {
      storyPlanVersionId: project.activeStoryPlanVersionId,
      scenes: project.scenes
    } : null
  };
}

function normalizePlan(result, project, { sourceResolution = null, directorOperation = 'generate' } = {}) {
  const beatsInput = Array.isArray(result.beats) && result.beats.length ? result.beats.slice(0, 12) : [{ key: 'story', title: 'Story', type: 'development' }];
  const beatKeyMap = new Map();
  const beats = beatsInput.map((beat, index) => {
    const key = bounded(beat.key, 80) || `beat-${index + 1}`;
    const id = createPrefixedId('cinebeat');
    beatKeyMap.set(key, id);
    return {
      id,
      orderKey: index + 1,
      type: bounded(beat.type, 60) || 'development',
      title: bounded(beat.title, 120) || `Beat ${index + 1}`,
      purpose: bounded(beat.purpose, 500),
      storyChange: bounded(beat.storyChange, 500),
      cause: bounded(beat.cause, 500) || bounded(beat.purpose, 500),
      consequence: bounded(beat.consequence, 500) || bounded(beat.storyChange, 500),
      emotionalStart: bounded(beat.emotionalStart, 240),
      emotionalTurn: bounded(beat.emotionalTurn, 240),
      emotionalEnd: bounded(beat.emotionalEnd, 240),
      requiredElements: stringList(beat.requiredElements, 8, 160),
      targetDurationMs: Math.max(250, Math.round(Number(beat.targetDurationSeconds || 0) * 1000)),
      sceneIds: []
    };
  });
  const scenesInput = Array.isArray(result.scenes) ? result.scenes.slice(0, 24) : [];
  if (!scenesInput.length) throw createError('cinematic_story_plan_invalid_response', 'Story Plan response contains no Scenes.');
  const sceneWeights = scenesInput.map(scene => sumShotWeights(scene.shots));
  const sceneDurations = allocateDurations(project.durationTargetMs, sceneWeights, 250);
  const sceneKeyMap = new Map();
  const scenes = scenesInput.map((scene, index) => {
    const beatId = beatKeyMap.get(String(scene.beatKey || '').trim()) || beats[0].id;
    const normalized = normalizeScene(scene, project, {
      id: createPrefixedId('cinescene'), beatId,
      targetDurationMs: sceneDurations[index], existingShots: [], orderKey: index + 1
    });
    sceneKeyMap.set(String(scene.key || `scene-${index + 1}`).trim(), normalized.id);
    beats.find(beat => beat.id === beatId)?.sceneIds.push(normalized.id);
    return normalized;
  });
  for (const beat of beats) {
    beat.targetDurationMs = beat.sceneIds.reduce((total, id) => total + (scenes.find(scene => scene.id === id)?.durationMs || 0), 0);
  }
  const directorFindings = normalizeDirectorFindings(
    result.directorReview?.findings,
    beatKeyMap,
    sceneKeyMap,
    scenes
  );
  const allowedCast = new Set((project.castAssignments || []).filter(item => item.active !== false).map(item => item.id));
  return {
    objective: bounded(result.objective, 1000),
    logline: bounded(result.logline, 500),
    emotionalArc: bounded(result.emotionalArc, 1000),
    centralDramaticQuestion: bounded(result.centralDramaticQuestion, 500),
    storyPromise: bounded(result.storyPromise, 500),
    finalPayoff: bounded(result.finalPayoff, 500),
    spokenLanguage: bounded(result.spokenLanguage, 80),
    onScreenTextPolicy: bounded(result.onScreenTextPolicy, 240),
    dialoguePolicy: ['none', 'sparse', 'normal', 'dialogue-led'].includes(result.dialoguePolicy)
      ? result.dialoguePolicy
      : 'sparse',
    characterAliases: (Array.isArray(result.characterAliases) ? result.characterAliases : [])
      .slice(0, 6)
      .filter(item => allowedCast.has(String(item.castAssignmentId || '').trim()))
      .map(item => ({
        castAssignmentId: String(item.castAssignmentId).trim(),
        storyCharacterName: bounded(item.storyCharacterName, 100)
      }))
      .filter(item => item.storyCharacterName),
    beats,
    scenes,
    directorOperation,
    directorSummary: bounded(result.directorReview?.summary, 1000),
    directorFindings,
    sourceResolution,
    warnings: stringList(result.warnings, 20, 240),
    source: 'generated',
    approved: false
  };
}

function normalizeScene(input, project, { id, beatId, targetDurationMs, existingShots, orderKey = 1 }) {
  const allowedCast = new Set((project.castAssignments || []).filter(item => item.active !== false).map(item => item.id));
  const lookOwner = new Map();
  for (const assignment of project.castAssignments || []) {
    for (const look of assignment.looks || []) lookOwner.set(look.id, assignment.id);
  }
  const castAssignmentIds = stringList(input.castAssignmentIds, 6, 100).filter(value => allowedCast.has(value));
  const wardrobeLookIds = stringList(input.wardrobeLookIds, 12, 100)
    .filter(value => castAssignmentIds.includes(lookOwner.get(value)));
  const shotsInput = Array.isArray(input.shots) && input.shots.length ? input.shots.slice(0, 20) : [{ title: 'Scene action', durationSeconds: targetDurationMs / 1000 }];
  const durations = allocateDurations(targetDurationMs, shotsInput.map(shot => Number(shot.durationSeconds) || 1), 250);
  const shots = shotsInput.map((shot, index) => {
    const shotCast = stringList(shot.castAssignmentIds, 6, 100).filter(value => castAssignmentIds.includes(value));
    const shotLooks = stringList(shot.wardrobeLookIds, 12, 100).filter(value => shotCast.includes(lookOwner.get(value)));
    return {
      id: existingShots?.[index]?.id || createPrefixedId('cineshot'),
      version: Number(existingShots?.[index]?.version || 1),
      orderKey: index + 1,
      title: bounded(shot.title, 100) || `Shot ${index + 1}`,
      purpose: bounded(shot.purpose, 500),
      durationMs: durations[index],
      visibleMoment: bounded(shot.visibleMoment, 800) || bounded(shot.prompt, 800) || bounded(shot.purpose, 500),
      subjectAction: bounded(shot.subjectAction, 500) || bounded(shot.blocking, 500) || bounded(shot.purpose, 500),
      emotionalTarget: bounded(shot.emotionalTarget, 240) || bounded(input.emotionalStart, 240),
      performanceCue: bounded(shot.performanceCue, 500) || bounded(shot.performance, 500),
      framing: bounded(shot.framing, 120) || 'medium shot',
      cameraAngle: bounded(shot.cameraAngle, 120) || 'eye level',
      cameraMovement: bounded(shot.cameraMovement, 160) || 'locked camera',
      lensIntent: '',
      blocking: bounded(shot.blocking, 500),
      performance: bounded(shot.performance, 500),
      gaze: '',
      lighting: bounded(shot.lighting, 500),
      environment: bounded(shot.environment, 500),
      audioIntent: bounded(shot.audioIntent, 500),
      prompt: bounded(shot.prompt, 4000),
      continuityEntry: bounded(shot.continuityEntry, 500) || stringList(shot.continuityNotes, 20, 240)[0] || 'Continue established Scene state.',
      continuityExit: bounded(shot.continuityExit, 500) || stringList(shot.continuityNotes, 20, 240).at(-1) || 'Hold established Scene state.',
      transitionToNext: bounded(shot.transitionToNext, 240) || bounded(input.transitionIntent, 160) || 'cut',
      estimatedActionDurationMs: Math.max(0, Math.round(Number(shot.estimatedActionDurationSeconds || 0) * 1000)),
      dialogueCues: normalizeDialogueCues(shot.dialogueCues, durations[index]),
      audioCues: normalizeAudioCues(shot.audioCues, durations[index]),
      castAssignmentIds: shotCast,
      wardrobeLookIds: shotLooks,
      continuityNotes: stringList(shot.continuityNotes, 20, 240),
      storyboardStatus: 'draft'
    };
  });
  return {
    id,
    version: 1,
    orderKey,
    beatId,
    title: bounded(input.title, 120) || 'Untitled Scene',
    purpose: bounded(input.purpose, 800),
    storyChange: bounded(input.storyChange, 800),
    entryState: bounded(input.entryState, 800) || bounded(input.emotionalStart, 240) || bounded(input.blocking, 500),
    exitState: bounded(input.exitState, 800) || bounded(input.emotionalEnd, 240) || bounded(input.storyChange, 800),
    objective: bounded(input.objective, 500) || bounded(input.purpose, 500),
    pressure: bounded(input.pressure, 500),
    location: bounded(input.location, 300),
    time: bounded(input.time, 120),
    emotionalStart: bounded(input.emotionalStart, 240),
    emotionalEnd: bounded(input.emotionalEnd, 240),
    transitionIntent: bounded(input.transitionIntent, 160) || 'cut',
    castAssignmentIds,
    wardrobeLookIds,
    blocking: bounded(input.blocking, 500),
    lighting: bounded(input.lighting, 500),
    performance: bounded(input.performance, 500),
    audioIntent: bounded(input.audioIntent, 500),
    propContinuity: bounded(input.propContinuity, 500),
    screenDirection: bounded(input.screenDirection, 500),
    continuityNotes: stringList(input.continuityNotes, 20, 240),
    shots,
    shotOrder: shots.map(shot => shot.id),
    durationMs: shots.reduce((sum, shot) => sum + shot.durationMs, 0)
  };
}

function normalizeDialogueCues(value, shotDurationMs) {
  return (Array.isArray(value) ? value : []).slice(0, 12).map(cue => ({
    speakerCastAssignmentId: bounded(cue.speakerCastAssignmentId, 100),
    offscreenVoiceRole: bounded(cue.offscreenVoiceRole, 100),
    text: bounded(cue.text, 600),
    delivery: bounded(cue.delivery, 240),
    startOffsetMs: clampMs(Number(cue.startOffsetSeconds || 0) * 1000, shotDurationMs),
    estimatedDurationMs: Math.max(0, Math.round(Number(cue.estimatedDurationSeconds || 0) * 1000)),
    speakerVisible: cue.speakerVisible === true
  })).filter(cue => cue.text);
}

function normalizeAudioCues(value, shotDurationMs) {
  return (Array.isArray(value) ? value : []).slice(0, 12).map(cue => ({
    kind: bounded(cue.kind, 60),
    source: bounded(cue.source, 160),
    description: bounded(cue.description, 500),
    startOffsetMs: clampMs(Number(cue.startOffsetSeconds || 0) * 1000, shotDurationMs),
    durationMs: Math.max(0, Math.round(Number(cue.durationSeconds || 0) * 1000))
  })).filter(cue => cue.description || cue.source);
}

function normalizeDirectorFindings(value, beatKeyMap, sceneKeyMap, scenes) {
  return (Array.isArray(value) ? value : []).slice(0, 24).map(item => {
    const sceneId = sceneKeyMap.get(String(item.sceneKey || '').trim()) || null;
    const scene = scenes.find(candidate => candidate.id === sceneId);
    const shotIndex = Number.isInteger(item.shotIndex) ? item.shotIndex : -1;
    const shotId = shotIndex >= 0 ? scene?.shots?.[shotIndex]?.id || null : null;
    return {
      code: bounded(item.code, 100) || 'ai_director_note',
      dimension: bounded(item.dimension, 40) || 'story',
      severity: item.severity === 'info' ? 'info' : 'warning',
      summary: bounded(item.summary, 500),
      recommendation: bounded(item.recommendation, 500),
      beatId: beatKeyMap.get(String(item.beatKey || '').trim()) || null,
      sceneId,
      shotId
    };
  }).filter(item => item.summary);
}

function clampMs(value, maximum) {
  const normalized = Math.max(0, Math.round(Number(value) || 0));
  return Math.min(normalized, Math.max(0, Number(maximum) || 0));
}

function allocateDurations(totalMs, rawWeights, minimumMs) {
  const count = Math.max(1, rawWeights.length);
  const safeTotal = Math.max(count * minimumMs, Math.round(Number(totalMs) || count * 1000));
  const weights = rawWeights.map(value => Math.max(0.1, Number(value) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const result = weights.map(value => Math.max(minimumMs, Math.round((safeTotal * value / weightTotal) / 250) * 250));
  result[result.length - 1] += safeTotal - result.reduce((sum, value) => sum + value, 0);
  if (result[result.length - 1] < minimumMs) {
    const deficit = minimumMs - result[result.length - 1];
    const donor = result.findIndex(value => value - deficit >= minimumMs);
    if (donor >= 0) {
      result[donor] -= deficit;
      result[result.length - 1] = minimumMs;
    }
  }
  return result;
}

function sumShotWeights(shots) {
  return (Array.isArray(shots) ? shots : []).reduce((sum, shot) => sum + Math.max(0.1, Number(shot.durationSeconds) || 1), 0) || 1;
}

function provenance(result, policy, recipe) {
  return {
    provider: policy.provider,
    model: policy.model,
    responseId: result.responseId || null,
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    recipeFingerprint: recipe.fingerprint
  };
}

function assertEnabled(policy) {
  if (!policy.enabled) {
    throw createError(
      policy.requestedEnabled ? 'cinematic_story_plan_provider_unavailable' : 'cinematic_story_plan_disabled',
      'Cinematic Story Plan AI is not enabled.', 503
    );
  }
  return policy;
}

function assertRecipe(recipe) {
  if (!recipe.enabled) throw createError('cinematic_story_plan_recipe_disabled', 'Cinematic Story Plan Prompt Recipe is disabled.', 503);
  return recipe;
}

function createProposalId() {
  return `cineproposal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function stringList(value, maximumItems, maximumLength) {
  return (Array.isArray(value) ? value : []).slice(0, maximumItems).map(item => bounded(item, maximumLength)).filter(Boolean);
}

function bounded(value, maximum) {
  return String(value || '').trim().slice(0, maximum);
}

function createError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const cinematicStoryPlanService = new CinematicStoryPlanService();
