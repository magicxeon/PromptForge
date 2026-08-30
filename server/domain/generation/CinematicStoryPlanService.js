import crypto from 'node:crypto';
import { getCinematicStoryPlanPolicy } from '../../config/cinematic-story-plan-policy.js';
import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';

export class CinematicStoryPlanService {
  constructor({
    policyLoader = getCinematicStoryPlanPolicy,
    storyRecipeLoader = () => loadPromptRecipe('cinematic/story-plan.v1.json'),
    sceneRecipeLoader = () => loadPromptRecipe('cinematic/scene-direction.v1.json'),
    providerFactory = policy => new OpenAITextProvider(policy.apiKey)
  } = {}) {
    this.policyLoader = policyLoader;
    this.storyRecipeLoader = storyRecipeLoader;
    this.sceneRecipeLoader = sceneRecipeLoader;
    this.providerFactory = providerFactory;
  }

  async generatePlan(project) {
    const policy = assertEnabled(this.policyLoader());
    const recipe = assertRecipe(this.storyRecipeLoader());
    const context = buildProjectContext(project);
    const result = await this.providerFactory(policy).generateCinematicStoryPlan({
      context,
      recipe,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    return {
      proposalId: createProposalId(),
      operation: 'cinematic_story_plan_generate',
      expectedProjectVersion: project.version,
      storySourceVersionId: project.activeStorySourceVersionId,
      plan: normalizePlan(result, project),
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
    const context = {
      ...buildProjectContext(project),
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

function buildProjectContext(project) {
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
      storyBrief: project.setup?.storyBrief,
      creativeDirection: project.setup?.creativeDirection,
      storySourceVersionId: project.activeStorySourceVersionId
    },
    roles: (project.setup?.storyRoleSlots || []).map(role => ({
      id: role.id, label: role.label, importance: role.importance,
      storyFunction: role.storyFunction, objective: role.objective,
      emotionalArc: role.emotionalArc, performanceDirection: role.performanceDirection
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
    currentPlan: project.scenes?.length ? {
      storyPlanVersionId: project.activeStoryPlanVersionId,
      scenes: project.scenes
    } : null
  };
}

function normalizePlan(result, project) {
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
      emotionalStart: bounded(beat.emotionalStart, 240),
      emotionalEnd: bounded(beat.emotionalEnd, 240),
      targetDurationMs: Math.max(250, Math.round(Number(beat.targetDurationSeconds || 0) * 1000)),
      sceneIds: []
    };
  });
  const scenesInput = Array.isArray(result.scenes) ? result.scenes.slice(0, 24) : [];
  if (!scenesInput.length) throw createError('cinematic_story_plan_invalid_response', 'Story Plan response contains no Scenes.');
  const sceneWeights = scenesInput.map(scene => sumShotWeights(scene.shots));
  const sceneDurations = allocateDurations(project.durationTargetMs, sceneWeights, 250);
  const scenes = scenesInput.map((scene, index) => {
    const beatId = beatKeyMap.get(String(scene.beatKey || '').trim()) || beats[0].id;
    const normalized = normalizeScene(scene, project, {
      id: createPrefixedId('cinescene'), beatId,
      targetDurationMs: sceneDurations[index], existingShots: [], orderKey: index + 1
    });
    beats.find(beat => beat.id === beatId)?.sceneIds.push(normalized.id);
    return normalized;
  });
  for (const beat of beats) {
    beat.targetDurationMs = beat.sceneIds.reduce((total, id) => total + (scenes.find(scene => scene.id === id)?.durationMs || 0), 0);
  }
  return {
    objective: bounded(result.objective, 1000),
    logline: bounded(result.logline, 500),
    emotionalArc: bounded(result.emotionalArc, 1000),
    beats,
    scenes,
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
    continuityNotes: stringList(input.continuityNotes, 20, 240),
    shots,
    shotOrder: shots.map(shot => shot.id),
    durationMs: shots.reduce((sum, shot) => sum + shot.durationMs, 0)
  };
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
