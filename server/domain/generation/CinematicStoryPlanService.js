import crypto from 'node:crypto';
import { getCinematicStoryPlanPolicy } from '../../config/cinematic-story-plan-policy.js';
import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { CinematicTextProviderRouter } from './CinematicTextProviderRouter.js';
import {
  analyzeStoryPlanSource,
  buildFilmScriptPreview,
  evaluateStoryPlanFilmReadiness
} from '../cinematic/StoryPlanFilmReadiness.js';
import { cinematicFieldManifestService } from '../cinematic/CinematicFieldManifestService.js';
import { cinematicFieldKey, parseFieldKey } from '../cinematic/CinematicAuthoringStateService.js';
import { cinematicVisualPlanQualityService } from '../cinematic/CinematicVisualPlanQualityService.js';

const VISUAL_REPAIR_SCENE_FIELDS = Object.freeze([
  'entryState', 'exitState', 'location', 'time', 'blocking', 'lighting', 'performance',
  'propContinuity', 'screenDirection', 'continuityNotes'
]);
const VISUAL_REPAIR_SHOT_FIELDS = Object.freeze([
  'coverageRole', 'visibleMoment', 'subjectAction', 'emotionalTarget', 'performanceCue',
  'framing', 'cameraAngle', 'cameraMovement', 'lensIntent', 'blocking', 'performance', 'gaze', 'lighting',
  'environment', 'prompt', 'continuityEntry', 'continuityExit', 'transitionToNext',
  'continuityNotes'
]);
const STORY_PLAN_PROGRESS_STAGE_IDS = Object.freeze([
  'source_preflight', 'plan_generation', 'director_review',
  'visual_validation', 'visual_repair', 'storyboard_readiness'
]);

export class CinematicStoryPlanService {
  constructor({
    policyLoader = getCinematicStoryPlanPolicy,
    storyRecipeLoader = () => loadPromptRecipe('cinematic/story-plan.v7.json'),
    sceneRecipeLoader = () => loadPromptRecipe('cinematic/scene-direction.v6.json'),
    providerFactory = policy => new CinematicTextProviderRouter(policy),
    fieldManifestService = cinematicFieldManifestService,
    visualQualityService = cinematicVisualPlanQualityService
  } = {}) {
    this.policyLoader = policyLoader;
    this.storyRecipeLoader = storyRecipeLoader;
    this.sceneRecipeLoader = sceneRecipeLoader;
    this.providerFactory = providerFactory;
    this.fieldManifestService = fieldManifestService;
    this.visualQualityService = visualQualityService;
  }

  async generatePlan(project, { mode = 'generate', sourceResolution = null, onProgress = null } = {}) {
    const progress = createStoryPlanProgressReporter(onProgress);
    progress.processing('source_preflight');
    const normalizedMode = mode === 'review_current' ? 'review_current' : 'generate';
    const normalizedResolution = ['story_brief', 'creative_direction'].includes(sourceResolution)
      ? sourceResolution
      : null;
    const preflight = analyzeStoryPlanSource(project, { sourceResolution: normalizedResolution });
    if (preflight.status === 'blocked') {
      progress.blocked('source_preflight');
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
        workflow: buildBlockedWorkflowEvidence(preflight),
        provenance: null,
        billingStatus: 'qualification_no_charge'
      };
    }
    const policy = assertEnabled(this.policyLoader());
    const recipe = assertRecipe(this.storyRecipeLoader());
    const context = buildProjectContext(project, { preflight, mode: normalizedMode });
    const provider = this.providerFactory(policy);
    const generationTimeoutMs = resolveGenerationTimeout(policy);
    const repairTimeoutMs = resolveRepairTimeout(policy);
    let initialResult;
    progress.processing('plan_generation');
    try {
      initialResult = await provider.generateCinematicStoryPlan({
        context,
        recipe,
        model: policy.model,
        reasoningEffort: policy.reasoningEffort,
        maxOutputTokens: policy.maxOutputTokens,
        timeoutMs: generationTimeoutMs
      });
    } catch (error) {
      if (!isStoryPlanTimeout(error)) throw error;
      throw storyPlanStageTimeout({
        code: 'cinematic_story_plan_generation_timeout',
        message: 'Story Plan generation exceeded its time budget. No draft was changed. Please try Generate Plan again.',
        stage: 'plan_generation',
        timeoutMs: generationTimeoutMs
      });
    }
    progress.processing('director_review');
    let currentResult = initialResult;
    let plan = normalizePlan(currentResult, project, {
      sourceResolution: normalizedResolution,
      directorOperation: normalizedMode
    });
    progress.processing('visual_validation');
    const initialVisualQuality = this.visualQualityService.evaluate(project, plan);
    let visualQuality = initialVisualQuality;
    const repairRounds = [];
    const acceptedChanges = [];
    const maximumRepairRounds = Math.min(2, Math.max(0, Number(recipe.limits?.maximumVisualRepairRounds ?? 2)));
    if (visualQuality.repairableCount > 0 && maximumRepairRounds > 0) {
      progress.processing('visual_repair');
    } else {
      progress.skipped('visual_repair');
    }
    for (let round = 1; round <= maximumRepairRounds && visualQuality.repairableCount > 0; round += 1) {
      let repairResult;
      try {
        repairResult = await provider.generateCinematicStoryPlan({
          context: buildVisualRepairContext(context, currentResult, plan, visualQuality, round, maximumRepairRounds),
          recipe,
          model: policy.model,
          reasoningEffort: policy.reasoningEffort,
          maxOutputTokens: policy.maxOutputTokens,
          timeoutMs: repairTimeoutMs
        });
      } catch (error) {
        if (!isStoryPlanTimeout(error)) throw error;
        repairRounds.push(repairRoundEvidence(
          round,
          'provider_timeout',
          visualQuality,
          visualQuality,
          0,
          null,
          {
            code: 'cinematic_story_plan_repair_timeout',
            message: 'Visual repair exceeded its time budget. The generated Plan was retained for review.',
            retryable: true,
            stage: 'visual_repair',
            timeoutMs: repairTimeoutMs
          }
        ));
        break;
      }
      const mergedResult = mergeVisualRepairResult(currentResult, repairResult, plan, visualQuality.findings);
      const candidatePlan = normalizePlan(mergedResult, project, {
        sourceResolution: normalizedResolution,
        directorOperation: normalizedMode
      });
      const changes = collectVisualRepairChanges(plan, candidatePlan, visualQuality.findings, round);
      if (!changes.length) {
        repairRounds.push(repairRoundEvidence(round, 'no_change', visualQuality, visualQuality, 0,
          provenance(repairResult, policy, recipe)));
        break;
      }
      const candidateQuality = this.visualQualityService.evaluate(project, candidatePlan);
      if (candidateQuality.repairableCount >= visualQuality.repairableCount) {
        repairRounds.push(repairRoundEvidence(round, 'no_progress', visualQuality, candidateQuality, 0,
          provenance(repairResult, policy, recipe)));
        break;
      }
      currentResult = mergedResult;
      plan = candidatePlan;
      acceptedChanges.push(...changes);
      repairRounds.push(repairRoundEvidence(round, 'accepted', visualQuality, candidateQuality, changes.length,
        provenance(repairResult, policy, recipe)));
      visualQuality = candidateQuality;
    }
    progress.processing('storyboard_readiness');
    const filmReadiness = evaluateStoryPlanFilmReadiness(project, plan, {
      preflight,
      aiFindings: plan.directorFindings,
      visualFindings: visualQuality.findings
    });
    const scriptPreview = buildFilmScriptPreview(plan);
    plan.filmReadiness = filmReadiness;
    plan.scriptPreview = scriptPreview;
    progress.completed('storyboard_readiness');
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
      workflow: buildWorkflowEvidence({
        preflight,
        plan,
        initialVisualQuality,
        visualQuality,
        repairRounds,
        acceptedChanges,
        filmReadiness
      }),
      provenance: provenance(initialResult, policy, recipe),
      billingStatus: 'qualification_no_charge'
    };
  }

  async generateScene(project, sceneId, options = {}) {
    const request = typeof options === 'string' ? { direction: options } : (options || {});
    const policy = assertEnabled(this.policyLoader());
    const recipe = assertRecipe(this.sceneRecipeLoader());
    const sceneIndex = project.scenes.findIndex(item => item.id === sceneId);
    if (sceneIndex < 0) throw createError('cinematic_scene_not_found', 'Scene not found.', 404);
    const persisted = project.scenes[sceneIndex];
    const current = request.sceneDraft?.id === persisted.id
      ? normalizeScene(request.sceneDraft, project, {
        id: persisted.id,
        beatId: persisted.beatId || null,
        targetDurationMs: persisted.durationMs,
        existingShots: persisted.shots,
        orderKey: persisted.orderKey
      })
      : persisted;
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
      userDirection: bounded(request.direction, 1200)
    };
    const selection = buildFieldSelection({
      project,
      scene: current,
      requestedFieldPaths: request.requestedFieldPaths,
      lockedFieldPaths: request.lockedFieldPaths,
      fieldManifestService: this.fieldManifestService
    });
    context.fieldSelection = {
      requestedFieldKeys: selection.requestedKeys,
      lockedFieldKeys: selection.lockedKeys,
      rule: 'Return a complete Scene contract. Requested keys are proposed changes; locked keys must remain unchanged.'
    };
    const result = await this.providerFactory(policy).generateCinematicSceneDirection({
      context,
      recipe,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    const candidate = alignCandidateShotStructure(current, normalizeScene(result, project, {
      id: current.id,
      beatId: current.beatId || null,
      targetDurationMs: current.durationMs,
      existingShots: current.shots,
      orderKey: current.orderKey
    }));
    const fieldProposals = buildFieldProposals({
      project,
      current,
      candidate,
      selection,
      direction: request.direction,
      fieldManifestService: this.fieldManifestService
    });
    return {
      proposalId: createProposalId(),
      operation: 'cinematic_scene_direction_generate',
      expectedProjectVersion: project.version,
      storySourceVersionId: project.activeStorySourceVersionId,
      sceneId,
      scene: preserveLockedFields(current, candidate, selection.lockedKeys),
      fieldProposals,
      mergeSummary: summarizeFieldProposals(fieldProposals),
      warnings: stringList(result.warnings, 20, 240),
      provenance: provenance(result, policy, recipe),
      billingStatus: 'qualification_no_charge'
    };
  }
}

function buildFieldSelection({ project, scene, requestedFieldPaths, lockedFieldPaths, fieldManifestService }) {
  const definitions = fieldManifestService.getPublicManifest().fields
    .filter(field => ['scene', 'shot'].includes(field.path.split('.')[0]) && field.authorities.includes('ai'));
  const definitionByPath = new Map(definitions.map(field => [field.path, field]));
  const allKeys = definitions.flatMap(field => {
    const [entity, name] = field.path.split('.');
    if (entity === 'scene') return [cinematicFieldKey({ entity, id: scene.id, field: name })];
    return scene.shots.map(shot => cinematicFieldKey({ entity, sceneId: scene.id, id: shot.id, field: name }));
  });
  const allowedKeys = new Set(allKeys);
  const expand = value => {
    const normalized = String(value || '').trim();
    if (allowedKeys.has(normalized)) return [normalized];
    if (!definitionByPath.has(normalized)) return [];
    const [entity, field] = normalized.split('.');
    if (entity === 'scene') return [cinematicFieldKey({ entity, id: scene.id, field })];
    return scene.shots.map(shot => cinematicFieldKey({ entity, sceneId: scene.id, id: shot.id, field }));
  };
  const explicitSelection = Array.isArray(requestedFieldPaths) && requestedFieldPaths.length > 0;
  const requestedKeys = explicitSelection
    ? [...new Set(requestedFieldPaths.flatMap(expand))]
    : allKeys;
  if (explicitSelection && !requestedKeys.length) {
    throw createError('cinematic_scene_field_selection_invalid', 'No requested Scene fields are valid for this Scene.', 400);
  }
  const persistedLocks = allKeys.filter(key => project.authoringState?.fieldStates?.[key]?.locked === true);
  const lockedKeys = [...new Set([
    ...persistedLocks,
    ...(Array.isArray(lockedFieldPaths) ? lockedFieldPaths.flatMap(expand) : [])
  ])];
  return { requestedKeys, lockedKeys, explicitSelection, definitionByPath };
}

function buildFieldProposals({ project, current, candidate, selection, direction, fieldManifestService }) {
  const locked = new Set(selection.lockedKeys);
  const hasDirection = Boolean(String(direction || '').trim());
  return selection.requestedKeys.flatMap(fieldKey => {
    const parsed = parseFieldKey(fieldKey);
    const definition = fieldManifestService.getField(parsed.manifestPath);
    if (!definition) return [];
    const currentValue = readSceneField(current, parsed);
    const proposedValue = readSceneField(candidate, parsed);
    if (proposedValue === undefined) return [];
    const unchanged = equalValue(currentValue, proposedValue);
    const isLocked = locked.has(fieldKey);
    const fieldState = project.authoringState?.fieldStates?.[fieldKey] || null;
    const recommended = !isLocked && !unchanged && (
      selection.explicitSelection
      || hasDirection
      || !meaningful(currentValue)
      || ['missing', 'stale', 'conflict'].includes(fieldState?.status)
    );
    return [{
      fieldKey,
      manifestPath: parsed.manifestPath,
      group: definition.group,
      visibility: definition.visibility,
      localizationKey: definition.localizationKey,
      currentValue: currentValue ?? null,
      proposedValue,
      outcome: isLocked ? 'locked' : unchanged ? 'unchanged' : 'proposed',
      recommended
    }];
  });
}

function summarizeFieldProposals(proposals) {
  return {
    requested: proposals.length,
    proposed: proposals.filter(item => item.outcome === 'proposed').length,
    recommended: proposals.filter(item => item.recommended).length,
    locked: proposals.filter(item => item.outcome === 'locked').length,
    unchanged: proposals.filter(item => item.outcome === 'unchanged').length
  };
}

function alignCandidateShotStructure(current, candidate) {
  const shots = current.shots.map((currentShot, index) => {
    const proposed = candidate.shots[index];
    return proposed ? {
      ...proposed,
      id: currentShot.id,
      version: currentShot.version,
      orderKey: currentShot.orderKey
    } : structuredClone(currentShot);
  });
  return {
    ...candidate,
    id: current.id,
    version: current.version,
    shots,
    shotOrder: current.shotOrder.filter(id => shots.some(shot => shot.id === id)),
    durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0)
  };
}

function preserveLockedFields(current, candidate, lockedKeys) {
  const result = structuredClone(candidate);
  for (const fieldKey of lockedKeys) {
    const parsed = parseFieldKey(fieldKey);
    writeSceneField(result, parsed, readSceneField(current, parsed));
  }
  return result;
}

function readSceneField(scene, parsed) {
  if (parsed.entity === 'scene' && parsed.id === scene.id) return scene[parsed.field];
  if (parsed.entity === 'shot' && parsed.sceneId === scene.id) {
    return scene.shots.find(shot => shot.id === parsed.id)?.[parsed.field];
  }
  return undefined;
}

function writeSceneField(scene, parsed, value) {
  if (parsed.entity === 'scene' && parsed.id === scene.id) scene[parsed.field] = structuredClone(value);
  if (parsed.entity === 'shot' && parsed.sceneId === scene.id) {
    const shot = scene.shots.find(item => item.id === parsed.id);
    if (shot) shot[parsed.field] = structuredClone(value);
  }
}

function equalValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function meaningful(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
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
      coverageRole: normalizeCoverageRole(shot.coverageRole, index),
      durationMs: durations[index],
      visibleMoment: bounded(shot.visibleMoment, 800) || bounded(shot.prompt, 800) || bounded(shot.purpose, 500),
      subjectAction: bounded(shot.subjectAction, 500) || bounded(shot.blocking, 500) || bounded(shot.purpose, 500),
      emotionalTarget: bounded(shot.emotionalTarget, 240) || bounded(input.emotionalStart, 240),
      performanceCue: bounded(shot.performanceCue, 500) || bounded(shot.performance, 500),
      framing: bounded(shot.framing, 120) || 'medium shot',
      cameraAngle: bounded(shot.cameraAngle, 120) || 'eye level',
      cameraMovement: bounded(shot.cameraMovement, 160) || 'locked camera',
      lensIntent: bounded(shot.lensIntent, 120),
      blocking: bounded(shot.blocking, 500),
      performance: bounded(shot.performance, 500),
      gaze: bounded(shot.gaze, 240),
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

function normalizeCoverageRole(value, shotIndex) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff'].includes(normalized)
    ? normalized
    : shotIndex === 0 ? 'establishing' : 'action';
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

function buildVisualRepairContext(baseContext, currentResult, plan, quality, round, maximumRounds) {
  return {
    ...baseContext,
    directorOperation: 'repair_visual',
    currentPlan: stripProviderMetadata(currentResult),
    visualRepair: {
      contractVersion: quality.contractVersion,
      round,
      maximumRounds,
      rule: 'Repair only listed findings. Protected structure and authority will be enforced server-side.',
      protectedAuthority: [
        'Beat, Scene and Shot count, order and keys',
        'all durations',
        'Cast Assignment IDs and Character Look IDs',
        'Character aliases',
        'dialogue and audio cues'
      ],
      findings: quality.findings.filter(item => item.repairable).map(item => {
        const sceneIndex = plan.scenes.findIndex(scene => scene.id === item.sceneId);
        const shotIndex = sceneIndex >= 0
          ? plan.scenes[sceneIndex].shots.findIndex(shot => shot.id === item.shotId)
          : -1;
        return {
          code: item.code,
          severity: item.severity,
          sceneIndex,
          shotIndex,
          sceneTitle: item.sceneTitle,
          shotTitle: item.shotTitle,
          fieldPaths: item.fieldPaths,
          summary: item.summary,
          recommendation: item.recommendation
        };
      })
    }
  };
}

function stripProviderMetadata(result) {
  const copy = structuredClone(result || {});
  delete copy.responseId;
  delete copy.usage;
  return copy;
}

function mergeVisualRepairResult(current, candidate, plan, findings) {
  const merged = stripProviderMetadata(current);
  const repairableFindings = findings.filter(item => item.repairable);
  if (repairableFindings.some(item => item.fieldPaths.includes('plan.onScreenTextPolicy'))
    && typeof candidate?.onScreenTextPolicy === 'string') {
    merged.onScreenTextPolicy = candidate.onScreenTextPolicy;
  }
  for (const [sceneIndex, scene] of (merged.scenes || []).entries()) {
    const candidateScene = candidate?.scenes?.[sceneIndex];
    if (!candidateScene) continue;
    const planScene = plan.scenes[sceneIndex];
    const sceneFields = repairFieldsFor(repairableFindings, {
      prefix: 'scene.', sceneId: planScene?.id, shotId: null, allowlist: VISUAL_REPAIR_SCENE_FIELDS
    });
    copyAllowlistedFields(scene, candidateScene, sceneFields);
    for (const [shotIndex, shot] of (scene.shots || []).entries()) {
      const candidateShot = candidateScene.shots?.[shotIndex];
      const planShot = planScene?.shots?.[shotIndex];
      const shotFields = repairFieldsFor(repairableFindings, {
        prefix: 'shot.', sceneId: planScene?.id, shotId: planShot?.id, allowlist: VISUAL_REPAIR_SHOT_FIELDS
      });
      if (candidateShot) copyAllowlistedFields(shot, candidateShot, shotFields);
    }
  }
  return merged;
}

function repairFieldsFor(findings, { prefix, sceneId, shotId, allowlist }) {
  const requested = new Set(findings
    .filter(item => item.sceneId === sceneId && (shotId == null || item.shotId === shotId))
    .flatMap(item => item.fieldPaths)
    .filter(path => path.startsWith(prefix))
    .map(path => path.slice(prefix.length)));
  return allowlist.filter(field => requested.has(field));
}

function copyAllowlistedFields(target, source, fields) {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) target[field] = structuredClone(source[field]);
  }
}

function collectVisualRepairChanges(before, after, findings, round) {
  const changes = [];
  if (!equalValue(before.onScreenTextPolicy, after.onScreenTextPolicy)) {
    changes.push(repairChange({
      round,
      fieldPath: 'plan.onScreenTextPolicy',
      before: before.onScreenTextPolicy,
      after: after.onScreenTextPolicy,
      findings
    }));
  }
  for (const [sceneIndex, scene] of before.scenes.entries()) {
    const nextScene = after.scenes[sceneIndex];
    if (!nextScene) continue;
    for (const field of VISUAL_REPAIR_SCENE_FIELDS) {
      if (!equalValue(scene[field], nextScene[field])) {
        changes.push(repairChange({
          round,
          sceneIndex,
          scene,
          fieldPath: `scene.${field}`,
          before: scene[field],
          after: nextScene[field],
          findings
        }));
      }
    }
    for (const [shotIndex, shot] of scene.shots.entries()) {
      const nextShot = nextScene.shots[shotIndex];
      if (!nextShot) continue;
      for (const field of VISUAL_REPAIR_SHOT_FIELDS) {
        if (!equalValue(shot[field], nextShot[field])) {
          changes.push(repairChange({
            round,
            sceneIndex,
            shotIndex,
            scene,
            shot,
            fieldPath: `shot.${field}`,
            before: shot[field],
            after: nextShot[field],
            findings
          }));
        }
      }
    }
  }
  return changes.slice(0, 120);
}

function repairChange({ round, sceneIndex = null, shotIndex = null, scene = null, shot = null,
  fieldPath, before, after, findings }) {
  const related = findings.filter(item => item.repairable
    && item.fieldPaths.includes(fieldPath)
    && (!scene || item.sceneId === scene.id)
    && (!shot || item.shotId === shot.id));
  return {
    round,
    sceneIndex,
    shotIndex,
    sceneTitle: scene?.title || '',
    shotTitle: shot?.title || '',
    fieldPath,
    before: previewValue(before),
    after: previewValue(after),
    reasonCodes: [...new Set(related.map(item => item.code))]
  };
}

function previewValue(value) {
  const rendered = Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean).join('; ')
    : String(value ?? '').trim();
  return rendered.length <= 600 ? rendered : `${rendered.slice(0, 597).trim()}...`;
}

function repairRoundEvidence(round, status, before, after, acceptedChangeCount, repairProvenance, failure = null) {
  return {
    round,
    status,
    findingCountBefore: before.findingCount,
    findingCountAfter: after.findingCount,
    repairableCountBefore: before.repairableCount,
    repairableCountAfter: after.repairableCount,
    acceptedChangeCount,
    provenance: repairProvenance,
    ...(failure ? { failure } : {})
  };
}

function buildWorkflowEvidence({ preflight, plan, initialVisualQuality, visualQuality, repairRounds,
  acceptedChanges, filmReadiness }) {
  const repaired = repairRounds.some(item => item.status === 'accepted');
  const blocked = filmReadiness.status === 'not_ready' || visualQuality.status === 'blocked';
  return {
    contractVersion: 'cinematic-story-plan-workflow-v1',
    status: blocked
      ? 'blocked'
      : filmReadiness.status === 'ready_with_warnings' || visualQuality.status === 'ready_with_warnings'
        ? 'ready_with_warnings'
        : 'ready',
    stages: [
      workflowStage('source_preflight', preflight.status === 'blocked' ? 'blocked' : 'completed', preflight.diagnostics.length, 0),
      workflowStage('plan_generation', 'completed', 0, 0),
      workflowStage('director_review', 'completed', plan.directorFindings?.length || 0, 0),
      workflowStage('visual_validation', 'completed', initialVisualQuality.findingCount, 0),
      workflowStage('visual_repair', initialVisualQuality.repairableCount
        ? repaired ? 'completed' : 'stopped'
        : 'skipped', initialVisualQuality.repairableCount, acceptedChanges.length),
      workflowStage('storyboard_readiness', blocked ? 'blocked' : 'completed', visualQuality.findingCount, 0)
    ],
    repairRoundCount: repairRounds.length,
    initialFindings: initialVisualQuality.findings,
    repairs: acceptedChanges,
    repairRounds,
    remainingFindings: visualQuality.findings
  };
}

function buildBlockedWorkflowEvidence(preflight) {
  const unresolvedCount = preflight.diagnostics.filter(item => !item.resolved).length;
  return {
    contractVersion: 'cinematic-story-plan-workflow-v1',
    status: 'blocked',
    stages: [
      workflowStage('source_preflight', 'blocked', unresolvedCount, 0),
      workflowStage('plan_generation', 'queued', 0, 0),
      workflowStage('director_review', 'queued', 0, 0),
      workflowStage('visual_validation', 'queued', 0, 0),
      workflowStage('visual_repair', 'queued', 0, 0),
      workflowStage('storyboard_readiness', 'queued', 0, 0)
    ],
    repairRoundCount: 0,
    initialFindings: [],
    repairs: [],
    repairRounds: [],
    remainingFindings: []
  };
}

function workflowStage(id, status, issueCount, repairCount) {
  return { id, status, issueCount, repairCount };
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
    provider: result.executionProvider || policy.provider,
    model: result.executionModel || policy.model,
    fallbackUsed: result.fallbackUsed === true,
    fallbackReason: result.fallbackReason || null,
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

function createStoryPlanProgressReporter(callback) {
  const stages = STORY_PLAN_PROGRESS_STAGE_IDS.map(id => ({
    id,
    status: 'queued',
    issueCount: 0,
    repairCount: 0
  }));
  const emit = (stageId, status) => {
    const activeIndex = stages.findIndex(stage => stage.id === stageId);
    if (activeIndex < 0) return;
    for (let index = 0; index < activeIndex; index += 1) {
      if (['queued', 'processing'].includes(stages[index].status)) stages[index].status = 'completed';
    }
    stages[activeIndex].status = status;
    if (typeof callback !== 'function') return;
    try {
      callback({
        contractVersion: 'cinematic-story-plan-live-progress-v1',
        activeStageId: status === 'processing' ? stageId : null,
        stages: structuredClone(stages),
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Progress delivery is observational and must never interrupt the AI operation.
    }
  };
  return {
    processing: stageId => emit(stageId, 'processing'),
    completed: stageId => emit(stageId, 'completed'),
    skipped: stageId => emit(stageId, 'skipped'),
    blocked: stageId => emit(stageId, 'blocked')
  };
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

function resolveGenerationTimeout(policy) {
  return positiveInteger(policy.generationTimeoutMs ?? policy.timeoutMs, 120_000);
}

function resolveRepairTimeout(policy) {
  return positiveInteger(policy.repairTimeoutMs ?? policy.timeoutMs, 90_000);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function isStoryPlanTimeout(error) {
  return error?.name === 'AbortError' || /(?:^|_)timeout$/i.test(String(error?.code || ''));
}

function storyPlanStageTimeout({ code, message, stage, timeoutMs }) {
  const error = createError(code, message, 504);
  error.details = { stage, retryable: true, timeoutMs };
  return error;
}

export const cinematicStoryPlanService = new CinematicStoryPlanService();
