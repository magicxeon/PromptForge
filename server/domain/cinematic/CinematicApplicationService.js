import crypto from 'crypto';
import { normalizeStoryIntent, storyAuthoringConfiguration } from '../../config/cinematicStoryConfiguration.js';
import { normalizeCastMode, resolveShotCastIds, resolveShotLookIds } from './CinematicCastCoverage.js';
import { cinematicProjectRepository } from '../../repositories/cinematic/CinematicProjectRepository.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { cinematicStoryboardAssetService } from '../assets/CinematicStoryboardAssetService.js';
import { cinematicWardrobeAuthorityService } from '../assets/CinematicWardrobeAuthorityService.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { characterLookService } from '../character-profiles/CharacterLookService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { videoCapabilityRegistry } from '../generation/VideoCapabilityRegistry.js';
import { videoGenerationApplicationService } from '../generation/VideoGenerationApplicationService.js';
import { cinematicStoryEnhancementService } from '../generation/CinematicStoryEnhancementService.js';
import { cinematicWardrobeSuggestionService } from '../generation/CinematicWardrobeSuggestionService.js';
import { cinematicStoryPlanService } from '../generation/CinematicStoryPlanService.js';
import {
  analyzeStoryPlanSource,
  buildFilmScriptPreview,
  evaluateStoryPlanFilmReadiness,
  filmReadinessNotEvaluated
} from './StoryPlanFilmReadiness.js';
import { cinematicDataLineageService } from './CinematicDataLineageService.js';
import { cinematicFieldManifestService } from './CinematicFieldManifestService.js';
import { cinematicAuthoringStateService, cinematicFieldKey } from './CinematicAuthoringStateService.js';
import { cinematicSimpleAuthoringService } from './CinematicSimpleAuthoringService.js';
import { storyboardKeyframeContractCompiler } from './StoryboardKeyframeContractCompiler.js';
import { cinematicVideoPacketCompiler } from './CinematicVideoPacketCompiler.js';
import { cinematicTimelineCompiler } from './CinematicTimelineCompiler.js';
import { deriveStoryboardVideoCompatibility } from './CinematicStoryboardSourceCompatibility.js';
import { fingerprintVideoReferencePlan } from '../generation/VideoReferencePlan.js';
import { CinematicVideoReferencePlanService, cinematicVideoReferenceMode } from './CinematicVideoReferencePlanService.js';
import { cinematicGeneratedCastService } from './CinematicGeneratedCastService.js';
import { videoClipBundleService } from '../assets/VideoClipBundleService.js';
import { CinematicSeriesService } from './CinematicSeriesService.js';

const STAGES = ['setup', 'cast', 'story-plan', 'storyboard', 'produce', 'finish'];
const DURATIONS = new Set([20, 30, 45, 60]);

export class CinematicApplicationService {
  constructor({
    repository = cinematicProjectRepository,
    storyboardAssetService = cinematicStoryboardAssetService,
    wardrobeAuthorityService = cinematicWardrobeAuthorityService,
    characterAuthorizationService = characterUsageService,
    lookService = characterLookService,
    generatedCastService = cinematicGeneratedCastService,
    backofficePolicy = adminPolicyService,
    providerTaskRepository = videoProviderTaskRepository,
    videoCapabilities = videoCapabilityRegistry,
    videoGenerationService = videoGenerationApplicationService,
    storyEnhancementService = cinematicStoryEnhancementService,
    wardrobeSuggestionService = cinematicWardrobeSuggestionService,
    storyPlanService = cinematicStoryPlanService,
    assetRepository = assetRepo,
    clipBundleService = videoClipBundleService,
    dataLineageService = cinematicDataLineageService,
    fieldManifestService = cinematicFieldManifestService,
    authoringStateService = cinematicAuthoringStateService,
    simpleAuthoringService = cinematicSimpleAuthoringService,
    keyframeContractCompiler = storyboardKeyframeContractCompiler,
    videoPacketCompiler = cinematicVideoPacketCompiler,
    timelineCompiler = cinematicTimelineCompiler
  } = {}) {
    this.repository = repository;
    this.seriesService = new CinematicSeriesService({ repository, normalizeSetup });
    this.storyboardAssetService = storyboardAssetService;
    this.wardrobeAuthorityService = wardrobeAuthorityService;
    this.characterAuthorizationService = characterAuthorizationService;
    this.lookService = lookService;
    this.generatedCastService = generatedCastService;
    this.videoReferencePlanService = new CinematicVideoReferencePlanService({ lookService, generatedCastService });
    this.backofficePolicy = backofficePolicy;
    this.providerTaskRepository = providerTaskRepository;
    this.videoCapabilities = videoCapabilities;
    this.videoGenerationService = videoGenerationService;
    this.storyEnhancementService = storyEnhancementService;
    this.wardrobeSuggestionService = wardrobeSuggestionService;
    this.storyPlanService = storyPlanService;
    this.assetRepository = assetRepository;
    this.clipBundleService = clipBundleService;
    this.dataLineageService = dataLineageService;
    this.fieldManifestService = fieldManifestService;
    this.authoringStateService = authoringStateService;
    this.simpleAuthoringService = simpleAuthoringService;
    this.keyframeContractCompiler = keyframeContractCompiler;
    this.videoPacketCompiler = videoPacketCompiler;
    this.timelineCompiler = timelineCompiler;
  }

  listProjects(actorContext, query) {
    return this.repository.listForActor(actorContext, query);
  }

  getSeriesWorkspace(projectId, actor) { return this.seriesService.getWorkspace(projectId, actor); }
  async createSeries(projectId, input, actor) {
    const result = await this.seriesService.createFromProject(projectId, input, actor);
    return { ...result, project: await this.getProject(result.project.id, actor) };
  }
  updateSeries(seriesId, input, actor) { return this.seriesService.update(seriesId, input, actor); }
  addSeriesSeason(seriesId, input, actor) { return this.seriesService.addSeason(seriesId, input, actor); }
  async addSeriesChapter(seriesId, input, actor) {
    const result = await this.seriesService.addChapter(seriesId, input, actor);
    return { ...result, project: await this.getProject(result.project.id, actor) };
  }

  getVideoCapabilities() {
    return this.videoGenerationService.getCatalog({ capability: 'cinematic' });
  }

  getAuthoringManifest() {
    return this.fieldManifestService.getPublicManifest();
  }

  async getDataLineage(projectId, scope, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    return this.dataLineageService.build(project, scope || {});
  }

  async getProject(projectId, actorContext) {
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    const summaries = this.videoGenerationService.getStoredTaskSummaries
      ? await this.videoGenerationService.getStoredTaskSummaries(
        project.generationAttempts.map(item => item.generationJobId).filter(id => id?.startsWith('videotask_')), actorContext) : [];
    const tasks = new Map(summaries.map(task => [task.id, task]));
    project.generationAttempts = project.generationAttempts.map(attempt => {
      const task = tasks.get(attempt.generationJobId);
      return task ? { ...attempt, status: ['approved', 'superseded'].includes(attempt.status) ? attempt.status : task.status,
        outputAsset: task.outputAsset, settlementStatus: task.billingStatus || attempt.settlementStatus } : attempt;
    });
    return reconcileCastIdentityReadiness(project);
  }

  createProject(input, actorContext) {
    return this.repository.create(normalizeSetup(input), actorContext);
  }

  enhanceStory(input, actorContext) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    return this.storyEnhancementService.enhance(input);
  }

  async suggestWardrobe(projectId, assignmentId, actorContext) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    const assignment = project.castAssignments.find(item => item.id === assignmentId && item.active !== false);
    if (!assignment) throw new CinematicError('cinematic_cast_assignment_not_found', 'Cast Assignment not found.', 404);
    return this.wardrobeSuggestionService.suggest({
      project: {
        title: project.title,
        durationSeconds: project.durationTargetMs / 1000,
        aspectRatio: project.aspectRatio,
        platform: project.setup?.platform,
        storyBrief: project.setup?.storyBrief,
        creativeDirection: project.setup?.creativeDirection
      },
      assignment,
      scenes: project.scenes
    });
  }

  async generateStoryPlan(projectId, input, actorContext, { onProgress = null } = {}) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    assertStoryPlanInputReady(project);
    return this.storyPlanService.generatePlan(project, {
      mode: input?.mode,
      sourceResolution: input?.sourceResolution,
      onProgress
    });
  }

  async generateSceneDirection(projectId, sceneId, input, actorContext) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    assertExpectedVersion(project, input?.expectedVersion);
    assertStoryPlanInputReady(project);
    return this.storyPlanService.generateScene(project, sceneId, {
      direction: input?.direction,
      sceneDraft: input?.sceneDraft,
      requestedFieldPaths: input?.requestedFieldPaths,
      lockedFieldPaths: input?.lockedFieldPaths
    });
  }

  updateSetup(projectId, input, actorContext) {
    const patch = normalizeSetup(input);
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const storyChanged = project.setup.storyBrief !== patch.storyBrief
        || project.setup.creativeDirection !== patch.creativeDirection
        || JSON.stringify(normalizeStoryIntent(project.setup)) !== JSON.stringify(normalizeStoryIntent(patch));
      project.title = patch.title;
      project.platformTargets = [patch.platform];
      project.durationTargetMs = patch.durationSeconds * 1000;
      project.setup = patch;
      if (storyChanged) {
        const now = new Date().toISOString();
        project.storySourceVersions.forEach(version => {
          if (version.status === 'applied') version.status = 'superseded';
        });
        const source = {
          id: createPrefixedId('cinesrc'),
          version: project.storySourceVersions.length + 1,
          parentVersionId: project.activeStorySourceVersionId,
          storyBrief: patch.storyBrief,
          creativeDirection: patch.creativeDirection,
          status: 'applied',
          source: 'manual',
          createdAt: now
        };
        project.storySourceVersions.push(source);
        project.activeStorySourceVersionId = source.id;
        project.storyPlanVersions.forEach(version => {
          if (version.status === 'approved') version.status = 'source_changed';
        });
        project.activeStoryPlanVersionId = null;
        if (project.scenes.length) project.status = 'planning';
      }
      project.version += 1;
      return project;
    });
  }

  setActiveStage(projectId, stage, expectedVersion, actorContext) {
    if (!STAGES.includes(stage)) throw new CinematicError('cinematic_stage_invalid', 'Cinematic stage is invalid.');
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, expectedVersion);
      assertEditable(project);
      if (STAGES.indexOf(stage) >= STAGES.indexOf('storyboard') && !hasCurrentApprovedStoryPlan(project)) {
        throw new CinematicError(
          'cinematic_story_plan_approval_required',
          'Approve the current Story Plan before continuing to Storyboard.',
          409
        );
      }
      project.activeStage = stage;
      project.version += 1;
      return project;
    });
  }

  async upsertCastAssignment(projectId, input, actorContext) {
    const sourceType = input.sourceType || 'character';
    if (!['character', 'generated_sheet'].includes(sourceType) || (sourceType === 'character' && input.generationId)) {
      throw new CinematicError('cinematic_cast_source_invalid', 'Choose one Cast source.');
    }
    if (sourceType === 'character' && Array.isArray(input.looks) && input.looks.some(look => look?.mode === 'generated_sheet')) {
      throw new CinematicError('cinematic_cast_source_invalid', 'Generated sheets belong to a direct Cast source.');
    }
    let generatedSheet = null;
    if (sourceType === 'generated_sheet') {
      const project = await this.getProject(projectId, actorContext);
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      generatedSheet = await this.generatedCastService.prepare(input, actorContext,
        project.castAssignments.find(item => item.id === input.assignmentId));
    }
    const authorizedCharacter = generatedSheet ? null : await this.characterAuthorizationService.validateGenerationContext({
      purpose: 'character_usage',
      characterProfileId: input.characterProfileId,
      characterProfileVersionId: input.characterProfileVersionId,
      useCase: 'cinematic',
      sourceType: 'cinematic_project',
      sourceId: projectId
    }, actorContext);
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const normalized = normalizeCast(input, authorizedCharacter, generatedSheet);
      let index = project.castAssignments.findIndex(item => item.id === normalized.id);
      if (index < 0) {
        index = project.castAssignments.findIndex(item => (
          item.active !== false && castSourceKey(item) === castSourceKey(normalized)
        ));
        if (index >= 0) normalized.id = project.castAssignments[index].id;
      }
      if (index >= 0) {
        const existing = project.castAssignments[index];
        const identityChanged = castSourceKey(existing) !== castSourceKey(normalized)
          || existing.characterProfileVersionId !== normalized.characterProfileVersionId;
        if (identityChanged && project.castAssignments.some(item => (
          item.id !== existing.id
          && item.active !== false
          && castSourceKey(item) === castSourceKey(normalized)
        ))) {
          throw new CinematicError(
            'cinematic_character_already_cast',
            'This Character is already assigned to the Project Cast.',
            409
          );
        }
        const authorizedPortraitUrl = normalized.portraitUrl;
        preserveOmittedCastFields(normalized, existing, input);
        if (identityChanged) {
          normalized.portraitUrl = authorizedPortraitUrl;
          normalized.looks = generatedSheet ? generatedCastLooks(normalized.id, generatedSheet, normalized.displayName) : [];
          invalidateReplacedCastSources(project, existing);
        }
        project.castAssignments[index] = { ...existing, ...normalized };
      }
      else project.castAssignments.push(normalized);
      if (normalized.storyImportance === 'protagonist') {
        project.castAssignments.forEach(item => {
          if (item.id !== normalized.id && item.storyImportance === 'protagonist') item.storyImportance = 'supporting';
        });
      }
      project.version += 1;
      return project;
    });
  }

  removeCastAssignment(projectId, assignmentId, input, actorContext) {
    const normalizedAssignmentId = String(assignmentId || '').trim();
    if (!normalizedAssignmentId) {
      throw new CinematicError('cinematic_cast_assignment_not_found', 'Cast Assignment not found.', 404);
    }
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input?.expectedVersion);
      assertEditable(project);
      const index = project.castAssignments.findIndex(item => item.id === normalizedAssignmentId);
      if (index < 0) {
        throw new CinematicError('cinematic_cast_assignment_not_found', 'Cast Assignment not found.', 404);
      }
      const assignment = project.castAssignments[index];
      const sceneIds = [];
      const shotIds = [];
      const lookIds = new Set(assignment.looks.map(look => look.id));
      for (const scene of project.scenes) {
        const sceneUsesAssignment = scene.castAssignmentIds?.includes(normalizedAssignmentId);
        if (sceneUsesAssignment) sceneIds.push(scene.id);
        for (const shot of scene.shots) {
          if (shot.castAssignmentIds?.includes(normalizedAssignmentId)
            || shot.wardrobeLookIds?.some(lookId => lookIds.has(lookId))) {
            shotIds.push(shot.id);
          }
        }
      }
      if (sceneIds.length || shotIds.length) {
        throw new CinematicError(
          'cinematic_cast_assignment_in_use',
          'This Cast Assignment is used by the Story Plan and cannot be removed yet.',
          409,
          { sceneIds: [...new Set(sceneIds)], shotIds: [...new Set(shotIds)] }
        );
      }
      project.castAssignments.splice(index, 1);
      project.version += 1;
      return project;
    });
  }

  async upsertWardrobeLook(projectId, assignmentId, input, actorContext) {
    const ownerProject = await this.getProject(projectId, actorContext);
    if (ownerProject.castAssignments.find(item => item.id === assignmentId)?.sourceType === 'generated_sheet') {
      throw new CinematicError('cinematic_generated_cast_look_locked', 'Replace the Cast sheet to change this Look.', 409);
    }
    let resolvedCharacterLook = null;
    let authority;
    if (input.mode === 'character_look') {
      const project = await this.repository.findForActor(projectId, actorContext);
      const assignment = project?.castAssignments.find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) throw new CinematicError('cinematic_cast_assignment_not_found', 'Cast Assignment not found.', 404);
      resolvedCharacterLook = await this.lookService.resolveApprovedVersion(
        assignment.characterProfileId,
        String(input.characterLookId || '').trim(),
        String(input.characterLookVersionId || '').trim(),
        actorContext
      );
      const approvedAssets = Object.values(resolvedCharacterLook.version.approvedViewAssets || {});
      const uniqueApprovedAssets = [...new Map(
        approvedAssets.map(item => [item.assetId, item])
      ).values()];
      authority = {
        mode: 'character_look',
        assets: uniqueApprovedAssets.map(item => ({ id: item.assetId, contentHash: item.contentHash || null }))
      };
    } else {
      authority = await this.wardrobeAuthorityService.authorizeLook(input, actorContext);
    }
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const assignment = project.castAssignments.find(item => item.id === assignmentId && item.active !== false);
      if (!assignment) throw new CinematicError('cinematic_cast_assignment_not_found', 'Cast Assignment not found.', 404);
      const lookId = String(input.lookId || '').trim() || createPrefixedId('cinelook');
      const sceneIds = normalizeStringList(input.sceneIds, 24);
      if (sceneIds.some(sceneId => !project.scenes.some(scene => scene.id === sceneId))) {
        throw new CinematicError('cinematic_wardrobe_scene_invalid', 'Wardrobe Look references an unknown Scene.');
      }
      const look = {
        id: lookId,
        version: Number((assignment.looks.find(item => item.id === lookId)?.version || 0) + 1),
        name: bounded(input.name, 100, 'Primary Look'),
        mode: authority.mode,
        characterLookId: resolvedCharacterLook?.look.id || null,
        characterLookVersionId: resolvedCharacterLook?.version.id || null,
        characterLookProvenance: structuredClone(resolvedCharacterLook?.version.provenance || null),
        characterLookIdentityAssurance: structuredClone(
          resolvedCharacterLook?.version.identityAssurance || null
        ),
        assetIds: authority.assets.map(asset => asset.id),
        authoritySnapshot: authority.assets,
        garmentSummary: bounded(input.garmentSummary, 500, ''),
        accessorySummary: bounded(input.accessorySummary, 300, ''),
        coverage: pick(input.coverage, ['front', 'front_back', 'multi_view'], 'front'),
        sceneIds,
        locked: input.locked !== false,
        updatedAt: new Date().toISOString()
      };
      const index = assignment.looks.findIndex(item => item.id === lookId);
      if (index >= 0) assignment.looks[index] = look;
      else assignment.looks.push(look);
      for (const scene of project.scenes) {
        for (const shot of scene.shots) {
          if (!resolveShotLookIds(scene, shot).includes(lookId)) continue;
          const previousSource = shot.approvedStoryboardSource;
          shot.approvedStoryboardSource = undefined;
          shot.storyboardStatus = 'draft';
          shot.version = Number(shot.version || 1) + 1;
          if (previousSource) markSourceChanged(project, shot, previousSource.sourceFingerprint);
          markVideoPacketChanged(project, shot);
          markVideoPacketChanged(project, shot);
        }
      }
      assignment.updatedAt = new Date().toISOString();
      project.version += 1;
      return project;
    });
  }

  saveStoryPlan(projectId, input, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const contractVersion = normalizeStoryPlanContractVersion(input.contractVersion);
      const simpleCompletion = input.authoringMode === 'simple'
        ? this.simpleAuthoringService.completeStoryPlanInput(input)
        : { input, completions: [] };
      const plan = normalizeStoryPlan(simpleCompletion.input, project, contractVersion);
      if (input.approved === true && ['story-plan-v2', 'story-plan-v3'].includes(contractVersion)) {
        assertStoryPlanApprovalReady(plan, project, contractVersion);
      }
      const now = new Date().toISOString();
      const requestedParentId = String(input.parentVersionId || '').trim();
      const parentVersion = project.storyPlanVersions.find(version => version.id === requestedParentId)
        || project.storyPlanVersions.at(-1)
        || null;
      const planVersion = {
        id: createPrefixedId('cineplan'),
        version: project.storyPlanVersions.length + 1,
        parentVersionId: parentVersion?.id || project.activeStoryPlanVersionId || null,
        storySourceVersionId: project.activeStorySourceVersionId,
        objective: plan.objective,
        logline: plan.logline,
        beats: plan.beats,
        emotionalArc: plan.emotionalArc,
        centralDramaticQuestion: plan.centralDramaticQuestion,
        storyPromise: plan.storyPromise,
        finalPayoff: plan.finalPayoff,
        spokenLanguage: plan.spokenLanguage,
        onScreenTextPolicy: plan.onScreenTextPolicy,
        dialoguePolicy: plan.dialoguePolicy,
        characterAliases: plan.characterAliases,
        directorOperation: plan.directorOperation,
        directorSummary: plan.directorSummary,
        directorFindings: plan.directorFindings,
        sourceResolution: plan.sourceResolution,
        warningsAcknowledged: plan.warningsAcknowledged,
        filmReadiness: plan.filmReadiness,
        scriptPreview: plan.scriptPreview,
        sceneIds: plan.scenes.map(scene => scene.id),
        estimatedDurationMs: plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0),
        estimatedShotCount: plan.scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
        warnings: plan.warnings,
        contractVersion,
        source: input.source === 'generated' ? 'generated' : 'manual',
        status: input.approved === false ? 'draft' : 'approved',
        createdAt: now
      };
      if (planVersion.status === 'approved') {
        project.storyPlanVersions.forEach(version => {
          if (version.status === 'approved') version.status = 'superseded';
        });
        project.activeStoryPlanVersionId = planVersion.id;
        project.status = 'planned';
      } else if (!project.activeStoryPlanVersionId) {
        project.status = 'planning';
      }
      project.storyPlanVersions.push(planVersion);
      project.scenes = plan.scenes;
      recordStoryPlanAuthoringState({
        project,
        planVersion,
        input: simpleCompletion.input,
        completions: simpleCompletion.completions,
        actorId: actorContext?.userId,
        source: input.source === 'generated' && !Array.isArray(input.aiFieldKeys) ? 'ai' : 'user',
        aiFieldKeys: input.aiFieldKeys
      }, this.authoringStateService, this.fieldManifestService);
      project.version += 1;
      return project;
    });
  }

  async approveStoryboardSource(projectId, shotId, input, actorContext) {
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const approvedAsset = await this.storyboardAssetService.approveGenerationResult(
      { jobId: input.jobId },
      actorContext
    );
    return this.repository.mutateForActor(projectId, actorContext, project => {
      project.commandReceipts ||= [];
      const replay = project.commandReceipts.find(receipt => (
        receipt.idempotencyKey === idempotencyKey && receipt.operation === 'approve_storyboard_source'
      ));
      if (replay) return replay.result;
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const located = findShot(project, shotId);
      if (!located) throw new CinematicError('cinematic_shot_not_found', 'Storyboard Shot not found.', 404);
      const { scene, shot } = located;
      if (Number(input.expectedShotVersion) !== Number(shot.version || 1)) {
        throw new CinematicError('cinematic_shot_version_conflict', 'The Shot changed in another session.', 409, {
          currentShotVersion: shot.version || 1,
          approvedStoryboardSource: shot.approvedStoryboardSource || null
        });
      }
      const previous = shot.approvedStoryboardSource || null;
      let attempt = project.generationAttempts.find(item => (
        item.operation === 'cinematic_storyboard_still'
        && item.shotId === shot.id
        && item.generationJobId === approvedAsset.sourceJobId
      ));
      if (attempt) {
        attempt.outputAssetIds = [approvedAsset.assetId];
        attempt.approvedStoryboardAssetVersionId = approvedAsset.assetVersionId;
        attempt.sourceFingerprint = approvedAsset.sourceFingerprint;
        attempt.status = 'approved';
        attempt.reviewDecision = 'approved';
        attempt.reviewedAt = new Date().toISOString();
      } else {
        attempt = {
          id: createPrefixedId('cineattempt'),
          operation: 'cinematic_storyboard_still',
          sceneId: scene.id,
          shotId: shot.id,
          attemptNumber: project.generationAttempts.filter(item => (
            item.shotId === shot.id && item.operation === 'cinematic_storyboard_still'
          )).length + 1,
          parentAttemptId: shot.approvedStoryboardAttemptId || null,
          generationJobId: approvedAsset.sourceJobId,
          outputAssetIds: [approvedAsset.assetId],
          approvedStoryboardAssetVersionId: approvedAsset.assetVersionId,
          sourceFingerprint: approvedAsset.sourceFingerprint,
          status: 'approved',
          reviewDecision: 'approved',
          createdAt: new Date().toISOString()
        };
        project.generationAttempts.push(attempt);
      }
      if (previous && previous.sourceFingerprint !== approvedAsset.sourceFingerprint) {
        for (const item of project.generationAttempts) {
          if (item.id !== attempt.id
            && item.operation === 'cinematic_storyboard_still'
            && item.shotId === shot.id
            && item.status === 'approved') {
            item.status = 'superseded';
            item.reviewDecision = 'superseded';
            item.supersededAt = new Date().toISOString();
          }
        }
      }
      shot.approvedStoryboardSource = approvedAsset;
      shot.approvedStoryboardAttemptId = attempt.id;
      if (approvedAsset.storyboardRenderStyle === 'concept_sketch_v1'
        && (!shot.videoReferenceMode || shot.videoReferenceMode === 'storyboard_only')) {
        shot.videoReferenceMode = 'storyboard_and_looks';
      }
      shot.storyboardStatus = 'approved';
      shot.version = Number(shot.version || 1) + 1;
      if (previous && previous.sourceFingerprint !== approvedAsset.sourceFingerprint) {
        markSourceChanged(project, shot, previous.sourceFingerprint);
      }
      project.status = allStoryboardShotsApproved(project) ? 'storyboard_ready' : 'planned';
      project.version += 1;
      const result = buildProduceContext(project, scene, shot, this.videoPacketCompiler);
      project.commandReceipts.push({
        idempotencyKey,
        operation: 'approve_storyboard_source',
        result: structuredClone(result),
        createdAt: new Date().toISOString()
      });
      project.commandReceipts = project.commandReceipts.slice(-100);
      return result;
    });
  }

  async getProduceShotContext(projectId, sceneId, shotId, actorContext, referenceMode) {
    const project = await this.getProject(projectId, actorContext);
    const located = findShot(project, shotId);
    if (!located || (sceneId && located.scene.id !== sceneId)) {
      throw new CinematicError('cinematic_shot_not_found', 'Produce Shot not found.', 404);
    }
    return buildProduceContext(project, located.scene, located.shot, this.videoPacketCompiler, referenceMode);
  }

  async getStoryboardGenerationContext(projectId, sceneId, shotId, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    const located = findShot(project, shotId);
    if (!located || located.scene.id !== sceneId) {
      throw new CinematicError('cinematic_shot_not_found', 'Storyboard Shot not found.', 404);
    }
    const { scene, shot } = located;
    const castIds = resolveShotCastIds(scene, shot);
    const assignments = castIds.flatMap(assignmentId => {
      const assignment = project.castAssignments.find(item => item.id === assignmentId && item.active !== false);
      return assignment ? [assignment] : [];
    });
    const selectedLookIds = new Set(resolveShotLookIds(scene, shot));
    const selectedLooks = assignments.flatMap(assignment => (assignment.looks || [])
      .filter(look => selectedLookIds.has(look.id))
      .map(look => ({ ...look, assignmentId: assignment.id })));
    const assetIds = [...new Set(selectedLooks.flatMap(look => look.assetIds || []))].slice(0, assignments.length > 1 ? 12 : 2);
    const wardrobeUrls = [];
    for (const assetId of assetIds) {
      const asset = await this.assetRepository.findByIdForOwner(assetId, project.ownerUserId);
      if (asset?.status !== 'deleted' && asset?.publicUrl) wardrobeUrls.push(asset.publicUrl);
    }
    const orderedShots = scene.shotOrder
      .map(id => scene.shots.find(item => item.id === id))
      .filter(Boolean);
    const shotIndex = orderedShots.findIndex(item => item.id === shot.id);
    const previousSource = shotIndex > 0 ? orderedShots[shotIndex - 1]?.approvedStoryboardSource || null : null;
    const multiCast = assignments.length > 1;
    const primary = multiCast ? null : assignments[0] || null;
    const cinematicCastReferences = [];
    if (multiCast) {
      for (const assignment of assignments) {
        const looks = selectedLooks.filter(look => look.assignmentId === assignment.id);
        if (looks.length !== 1 || looks[0].locked !== true) break;
        const base = { castAssignmentId: assignment.id, displayName: assignment.displayName };
        if (assignment.sourceType === 'generated_sheet') {
          const sheet = await this.generatedCastService.resolve(assignment, actorContext);
          cinematicCastReferences.push({ ...base, sourceType: 'generated_sheet', generationId: sheet.generationId, contentHash: sheet.contentHash });
        } else if (looks[0].mode === 'character_look' && looks[0].characterLookId && looks[0].characterLookVersionId) {
          const look = looks[0];
          const resolved = await this.lookService.resolveApprovedSheetReference(assignment.characterProfileId, look.characterLookId, look.characterLookVersionId, actorContext);
          cinematicCastReferences.push({ ...base, sourceType: 'character_look', characterProfileId: assignment.characterProfileId,
            characterLookId: look.characterLookId, characterLookVersionId: look.characterLookVersionId, contentHash: resolved.asset.contentHash });
        }
      }
    }
    const generatedSheet = primary?.sourceType === 'generated_sheet'
      ? await this.generatedCastService.resolve(primary, actorContext) : null;
    const missingLookReference = selectedLooks.some(look => (look.assetIds || []).length > 0)
      && wardrobeUrls.length === 0;
    const keyframeContract = this.keyframeContractCompiler.compile({
      project,
      scene,
      shot,
      referencePlan: {
        characterProfileVersionIds: assignments.map(item => item.characterProfileVersionId).filter(Boolean),
        lookAssetIds: assetIds,
        previousApprovedShotId: previousSource ? orderedShots[shotIndex - 1]?.id : null,
        previousApprovedSourceFingerprint: previousSource?.sourceFingerprint || null
      }
    });
    const blockingCompilerFinding = keyframeContract.findings.find(item => item.severity === 'blocking');
    const multiCastReady = !multiCast || cinematicCastReferences.length === assignments.length;
    const castComplete = assignments.length === castIds.length
      && castIds.every(id => scene.castAssignmentIds.includes(id));
    const generationEligible = multiCastReady && castComplete
      && assignments.every(assignment => assignment.identityReady === true)
      && selectedLooks.every(look => look.locked === true)
      && !missingLookReference
      && !blockingCompilerFinding;
    return {
      schemaVersion: 1,
      projectId: project.id,
      projectVersion: project.version,
      sceneId: scene.id,
      shotId: shot.id,
      shotVersion: shot.version,
      cinematicCastReferences,
      cinematicContainsPeople: castIds.length > 0,
      characterProfileContext: primary && !generatedSheet ? {
        purpose: 'character_usage',
        characterProfileId: primary.characterProfileId,
        characterProfileVersionId: primary.characterProfileVersionId,
        useCase: 'cinematic',
        sourceType: 'scene_builder',
        sourceId: project.id
      } : null,
      references: {
        ...(generatedSheet ? { character_reference: generatedSheet.previewUrl } : {}),
        outfit_front: generatedSheet || multiCast ? null : wardrobeUrls[0] || null,
        outfit_back: generatedSheet || multiCast ? null : wardrobeUrls[1] || null,
        style_reference: previousSource?.imageUrl || null
      },
      cast: assignments.map(assignment => ({
        assignmentId: assignment.id,
        displayName: assignment.displayName,
        storyRole: assignment.storyRole,
        identityReady: assignment.identityReady === true
      })),
      looks: selectedLooks.map(look => ({
        lookId: look.id,
        assignmentId: look.assignmentId,
        name: look.name,
        locked: look.locked === true
      })),
      continuitySource: previousSource ? {
        shotId: orderedShots[shotIndex - 1].id,
        sourceFingerprint: previousSource.sourceFingerprint
      } : null,
      keyframeContract,
      generationEligible,
      blockingReason: !multiCastReady
        ? 'cinematic_storyboard_multi_character_unqualified'
        : !castComplete || assignments.some(assignment => assignment.identityReady !== true)
          ? 'cinematic_storyboard_character_not_ready'
          : selectedLooks.some(look => look.locked !== true)
            ? 'cinematic_storyboard_look_not_ready'
            : missingLookReference
              ? 'cinematic_storyboard_look_asset_unavailable'
              : blockingCompilerFinding
                ? 'cinematic_storyboard_direction_incomplete'
                : null
    };
  }

  async registerStoryboardBatchAttempts(projectId, input, actorContext) {
    const batchId = String(input.batchId || '').trim();
    const children = Array.isArray(input.children) ? input.children : [];
    if (!batchId || !children.length) {
      throw new CinematicError(
        'cinematic_storyboard_batch_binding_invalid',
        'Storyboard batch bindings require a batch ID and child Jobs.',
        400
      );
    }
    return this.repository.mutateForActor(projectId, actorContext, project => {
      project.generationAttempts ||= [];
      const existing = project.generationAttempts.filter(attempt => attempt.batchId === batchId);
      if (existing.length === children.length) return project;
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const now = new Date().toISOString();
      for (const child of children) {
        if (project.generationAttempts.some(attempt => attempt.generationJobId === child.jobId)) continue;
        const located = findShot(project, child.shotId);
        if (!located || located.scene.id !== child.sceneId) {
          throw new CinematicError(
            'cinematic_shot_not_found',
            'A Storyboard batch Shot no longer exists.',
            404
          );
        }
        const { scene, shot } = located;
        if (Number(child.expectedShotVersion) !== Number(shot.version || 1)) {
          throw new CinematicError(
            'cinematic_shot_version_conflict',
            'A Storyboard Shot changed before the batch was registered.',
            409,
            { currentShotVersion: shot.version || 1 }
          );
        }
        // Generating creates a review candidate. The approved source remains
        // authoritative until the creator explicitly approves the new output.
        const replacingApprovedSource = Boolean(shot.approvedStoryboardSource);
        project.generationAttempts.push({
          id: createPrefixedId('cineattempt'),
          operation: 'cinematic_storyboard_still',
          batchId,
          sceneId: scene.id,
          shotId: shot.id,
          attemptNumber: project.generationAttempts.filter(item => (
            item.shotId === shot.id && item.operation === 'cinematic_storyboard_still'
          )).length + 1,
          parentAttemptId: shot.approvedStoryboardAttemptId || null,
          replacementOfSourceFingerprint: replacingApprovedSource
            ? shot.approvedStoryboardSource?.sourceFingerprint || null
            : null,
          generationJobId: child.jobId,
          quoteId: child.estimateId || null,
          keyframeContractFingerprint: child.metadata?.keyframeContractFingerprint || null,
          outputAssetIds: [],
          status: 'queued',
          reviewDecision: 'pending',
          createdAt: now
        });
        shot.storyboardStatus = 'generating';
      }
      project.status = allStoryboardShotsApproved(project) ? 'storyboard_ready' : 'planned';
      project.version += 1;
      return project;
    });
  }

  async quoteVideoAttempt(projectId, sceneId, shotId, input, actorContext) {
    const { project, scene, shot, source, videoPacket } = await this.#getCurrentProduceSource(
      projectId, sceneId, shotId, input, actorContext
    );
    try {
      const referencePlan = await this.videoReferencePlanService.prepare({ project, scene, shot, source,
        mode: input.referenceMode, model: this.videoCapabilities.resolve(input.providerId, input.modelId), actorContext });
      const providerPrompt = renderProviderVideoPrompt(this.videoPacketCompiler, videoPacket, input, referencePlan);
      const preparedRequest = buildCinematicVideoRequest(input, project, shot, source, videoPacket, providerPrompt, referencePlan);
      const quote = await this.videoGenerationService.quote(
        preparedRequest,
        actorContext,
        buildCinematicWorkflow(project, scene, shot, null)
      );
      return {
        ...quote,
        referenceMode: referencePlan.mode,
        renderedPrompt: providerPrompt.prompt,
        referenceSummary: referencePlan.references.map((reference, index) => ({
          imageNumber: index + 1, assetId: reference.assetId,
          purpose: reference.purpose || 'storyboard_opening',
          roleName: reference.roleName || null, lookName: reference.lookName || null,
          previewUrl: reference.previewUrl || source?.imageUrl || null
        })),
        projectId: project.id,
        sceneId: scene.id,
        shotId: shot.id,
        shotVersion: shot.version || 1,
        sourceFingerprint: source?.sourceFingerprint || null,
        videoPacketFingerprint: videoPacket.packetFingerprint,
        promptStrategy: preparedRequest.promptStrategy,
        renderedPromptFingerprint: preparedRequest.renderedPromptFingerprint,
        approvedStoryboardAssetVersionId: source?.assetVersionId || null
      };
    } catch (error) {
      throw asCinematicError(error);
    }
  }

  async createVideoAttempt(projectId, sceneId, shotId, input, actorContext) {
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const existingProject = await this.getProject(projectId, actorContext);
    const attemptId = deterministicCinematicAttemptId(actorContext.userId, existingProject.id, shotId, idempotencyKey);
    const existingAttempt = existingProject.generationAttempts.find(item => item.id === attemptId);
    if (existingAttempt?.generationJobId) {
      const task = await this.providerTaskRepository.findForActor(existingAttempt.generationJobId, actorContext);
      if (task) return { attemptId, task };
    }
    const { project, scene, shot, source, videoPacket } = await this.#getCurrentProduceSource(
      projectId, sceneId, shotId,
      existingAttempt ? { ...input, expectedVersion: existingProject.version } : input,
      actorContext
    );
    const referencePlan = await this.videoReferencePlanService.prepare({ project, scene, shot, source,
      mode: input.referenceMode, model: this.videoCapabilities.resolve(input.providerId, input.modelId), actorContext });
    const providerPrompt = renderProviderVideoPrompt(this.videoPacketCompiler, videoPacket, input, referencePlan);
    const preparedRequest = buildCinematicVideoRequest(input, project, shot, source, videoPacket, providerPrompt, referencePlan);
    await this.repository.mutateForActor(project.id, actorContext, draft => {
      const replay = draft.generationAttempts.find(item => item.id === attemptId);
      if (replay) return draft;
      assertExpectedVersion(draft, input.expectedVersion);
      const located = findShot(draft, shot.id);
      if (!located || located.scene.id !== scene.id
        || (!['looks_only', 'text_only'].includes(referencePlan.mode)
          && located.shot.approvedStoryboardSource?.sourceFingerprint !== source?.sourceFingerprint)) {
        throw new CinematicError('cinematic_storyboard_source_changed', 'The approved Storyboard source changed before generation.', 409);
      }
      draft.generationAttempts.push({
        id: attemptId,
        operation: 'cinematic_draft_clip',
        commercialOperation: preparedRequest.commercialOperation,
        inputMode: preparedRequest.inputMode,
        sceneId: scene.id,
        shotId: shot.id,
        attemptNumber: draft.generationAttempts.filter(item => item.shotId === shot.id
          && item.operation === 'cinematic_draft_clip').length + 1,
        idempotencyKey,
        generationJobId: null,
        providerTaskId: null,
        quoteId: input.estimateId,
        reservationId: null,
        qualificationAuthorizationId: null,
        settlementStatus: null,
        developmentPocUnverified: false,
        developmentPocCredits: null,
        developmentPocWarningCode: null,
        outputAssetIds: [],
        approvedStoryboardAssetVersionId: source?.assetVersionId || null,
        sourceFingerprint: source?.sourceFingerprint || null,
        keyframeContractFingerprint: videoPacket.keyframeContractFingerprint,
        videoPacketFingerprint: videoPacket.packetFingerprint,
        promptStrategyId: providerPrompt.strategyId,
        promptStrategyVersion: providerPrompt.strategyVersion,
        renderedPromptFingerprint: providerPrompt.promptFingerprint,
        referencePlanFingerprint: preparedRequest.referencePlanFingerprint || null,
        referenceMode: referencePlan.mode,
        downstreamSourceStatus: 'current',
        status: 'preparing',
        reviewDecision: 'pending',
        createdAt: new Date().toISOString()
      });
      located.shot.videoReferenceMode = referencePlan.mode;
      if (!['looks_only', 'text_only'].includes(referencePlan.mode)) located.shot.lastFirstFrameMode = referencePlan.mode;
      draft.status = 'producing';
      draft.version += 1;
      return draft;
    });
    let task;
    try {
      task = await this.videoGenerationService.submit(
        {
          ...preparedRequest,
          idempotencyKey,
          estimateId: input.estimateId
        },
        actorContext,
        buildCinematicWorkflow(project, scene, shot, attemptId)
      );
    } catch (error) {
      await this.repository.mutateForActor(project.id, actorContext, draft => {
        const attempt = draft.generationAttempts.find(item => item.id === attemptId);
        if (attempt) {
          attempt.status = 'failed';
          attempt.failureCode = error?.code || 'cinematic_video_submit_failed';
        }
        draft.status = 'failed_recoverable';
        draft.version += 1;
        return draft;
      });
      throw asCinematicError(error);
    }
    await this.repository.mutateForActor(project.id, actorContext, draft => {
      const attempt = draft.generationAttempts.find(item => item.id === attemptId);
      if (!attempt) throw new CinematicError('cinematic_video_attempt_not_found', 'Video Attempt not found.', 404);
      attempt.generationJobId = task.id;
      attempt.providerTaskId = task.providerTaskId || null;
      attempt.reservationId = task.reservationId || null;
      attempt.qualificationAuthorizationId = task.qualificationAuthorizationId || null;
      attempt.developmentPocUnverified = task.developmentPocUnverified === true;
      attempt.developmentPocCredits = task.developmentPocCredits || null;
      attempt.developmentPocWarningCode = task.developmentPocWarningCode || null;
      attempt.quoteId = task.estimateId || input.estimateId;
      attempt.providerId = task.providerId;
      attempt.modelId = task.modelId;
      attempt.commercialOperation = task.commercialOperation || attempt.commercialOperation;
      attempt.inputMode = task.inputMode || attempt.inputMode;
      attempt.renderDurationMs = Math.round(Number(task.durationSeconds || input.durationSeconds || 0) * 1000);
      attempt.status = task.status;
      attempt.settlementStatus = task.billingStatus || null;
      if (task.outputAsset?.id) attempt.outputAssetIds = [task.outputAsset.id];
      if (['failed', 'reconciliation_required'].includes(task.status)) draft.status = 'failed_recoverable';
      draft.version += 1;
      return draft;
    });
    return { attemptId, task };
  }

  async prepareClipBundle(projectId, input, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    if (input.expectedVersion !== undefined) assertExpectedVersion(project, input.expectedVersion);
    const items = [], missing = [];
    for (const [sceneIndex, scene] of project.scenes.entries()) {
      const shots = (scene.shotOrder?.length ? scene.shotOrder.map(id => scene.shots.find(shot => shot.id === id)).filter(Boolean) : scene.shots);
      for (const [shotIndex, shot] of shots.entries()) {
        const takes = project.generationAttempts.filter(item => item.shotId === shot.id && ['cinematic_draft_clip', 'cinematic_final_clip', 'cinematic_motion_preview'].includes(item.operation));
        const attempt = takes.find(item => item.id === shot.approvedVideoAttemptId);
        if (!attempt || attempt.status !== 'approved' || ['packet_changed', 'source_changed'].includes(attempt.downstreamSourceStatus) || !attempt.outputAsset?.id) {
          missing.push({ sceneNumber: sceneIndex + 1, shotNumber: shotIndex + 1, shotId: shot.id });
          continue;
        }
        items.push({ sceneNumber: sceneIndex + 1, shotNumber: shotIndex + 1, takeNumber: takes.indexOf(attempt) + 1,
          shotId: shot.id, attemptId: attempt.id, assetId: attempt.outputAsset.id });
      }
    }
    const plan = await this.clipBundleService.prepare(items, actorContext);
    const manifest = { projectId: project.id, projectVersion: project.version, missing,
      sizeBytes: plan.sizeBytes, clips: plan.files.map(({ filePath: _path, ...file }) => file) };
    return { plan, manifest };
  }

  async downloadClipBundle(projectId, input, actorContext, destination, onReady = () => {}) {
    if (!Number.isInteger(input.expectedVersion)) throw new CinematicError('cinematic_project_version_required', 'Refresh the clip list before downloading.');
    const { plan, manifest } = await this.prepareClipBundle(projectId, input, actorContext);
    if (!manifest.clips.length || (manifest.missing.length && input.allowPartial !== true)) throw new CinematicError('cinematic_clip_bundle_incomplete', 'Confirm downloading the ready subset of selected clips.', 409);
    onReady();
    this.clipBundleService.stream(plan, manifest, destination);
  }

  async approveVideoAttempt(projectId, sceneId, shotId, attemptId, input, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    const located = findShot(project, shotId);
    const attempt = project.generationAttempts.find(item => item.id === attemptId && item.shotId === shotId);
    if (!located || located.scene.id !== sceneId || !attempt) {
      throw new CinematicError('cinematic_video_attempt_not_found', 'Video Attempt not found.', 404);
    }
    let task;
    try {
      task = await this.videoGenerationService.getAndPoll(attempt.generationJobId, actorContext);
    } catch (error) {
      throw asCinematicError(error);
    }
    const settled = ['captured', 'qualification_no_charge'].includes(task.billingStatus);
    if (task.status !== 'completed' || !settled || !task.outputAsset) {
      throw new CinematicError('cinematic_video_attempt_not_ready', 'The Video Attempt is not completed and settled.', 409);
    }
    if (attempt.referenceMode && attempt.referenceMode !== 'storyboard_only') {
      const referencePlan = await this.videoReferencePlanService.prepare({ project, ...located,
        source: located.shot.approvedStoryboardSource, mode: attempt.referenceMode,
        model: this.videoCapabilities.resolve(attempt.providerId, attempt.modelId), actorContext });
      if (fingerprintVideoReferencePlan(referencePlan.references, referencePlan.inputMode) !== attempt.referencePlanFingerprint) {
        throw new CinematicError('cinematic_video_source_stale', 'The selected Cast sheets changed after this Video Attempt.', 409);
      }
    }
    return this.repository.mutateForActor(projectId, actorContext, draft => {
      assertExpectedVersion(draft, input.expectedVersion);
      const current = findShot(draft, shotId);
      const target = draft.generationAttempts.find(item => item.id === attemptId && item.shotId === shotId);
      if (!current || current.scene.id !== sceneId || !target) {
        throw new CinematicError('cinematic_video_attempt_not_found', 'Video Attempt not found.', 404);
      }
      if ((!['looks_only', 'text_only'].includes(target.referenceMode)
          && target.sourceFingerprint !== current.shot.approvedStoryboardSource?.sourceFingerprint)
        || target.downstreamSourceStatus === 'source_changed') {
        throw new CinematicError('cinematic_video_source_stale', 'The Storyboard source changed after this Video Attempt.', 409);
      }
      const storyboardAttempt = (draft.generationAttempts || []).find(item => (
        item.id === current.shot.approvedStoryboardAttemptId
        && item.operation === 'cinematic_storyboard_still'
      )) || null;
      const currentPacket = this.videoPacketCompiler.compile({
        project: draft,
        scene: current.scene,
        shot: current.shot,
        approvedStoryboardSource: current.shot.approvedStoryboardSource,
        storyboardAttempt
      });
      if (target.videoPacketFingerprint !== currentPacket.packetFingerprint
        || target.downstreamSourceStatus === 'packet_changed') {
        throw new CinematicError(
          'cinematic_video_packet_stale',
          'The Shot motion direction changed after this Video Attempt.',
          409
        );
      }
      if (task.outputAsset.technicalProbe?.status !== 'passed') {
        throw new CinematicError(
          'cinematic_video_probe_required',
          'The Video Attempt has not passed technical media verification.',
          409
        );
      }
      for (const item of draft.generationAttempts) {
        if (item.shotId === shotId && item.operation === 'cinematic_draft_clip' && item.status === 'approved') {
          item.status = 'superseded';
          item.reviewDecision = 'superseded';
        }
      }
      target.status = 'approved';
      target.reviewDecision = 'approved';
      target.outputAssetIds = [task.outputAsset.id || task.outputAsset.assetId || task.id];
      target.outputAsset = task.outputAsset;
      target.settlementStatus = task.billingStatus;
      target.renderDurationMs = Number(task.durationSeconds) > 0
        ? Math.round(Number(task.durationSeconds) * 1000)
        : Math.round(Number(target.renderDurationMs || current.shot.durationMs));
      target.videoSourceFingerprint = cinematicVideoSourceFingerprint(target);
      if (current.shot.approvedVideoAttemptId !== target.id) {
        for (const timeline of draft.timelineVersions || []) {
          for (const entry of timeline.entries || []) {
            if (entry.shotId !== shotId) continue;
            entry.downstreamSourceStatus = 'source_changed';
            timeline.status = 'stale';
            timeline.exportEligible = false;
          }
        }
      }
      current.shot.approvedVideoAttemptId = target.id;
      current.shot.approvedVideoSourceFingerprint = target.sourceFingerprint;
      draft.status = 'review';
      draft.version += 1;
      return buildProduceContext(draft, current.scene, current.shot, this.videoPacketCompiler);
    });
  }

  async #getCurrentProduceSource(projectId, sceneId, shotId, input, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    assertExpectedVersion(project, input.expectedVersion);
    const located = findShot(project, shotId);
    if (!located || located.scene.id !== sceneId) {
      throw new CinematicError('cinematic_shot_not_found', 'Produce Shot not found.', 404);
    }
    const mode = cinematicVideoReferenceMode(input.referenceMode);
    const policyModel = this.videoCapabilities.resolve(input.providerId, input.modelId);
    const sketchComposition = mode === 'storyboard_and_looks'
      && located.shot.approvedStoryboardSource?.storyboardRenderStyle === 'concept_sketch_v1';
    const policyMode = policyModel?.firstFrameEnabled === false && !sketchComposition
      ? (resolveShotCastIds(located.scene, located.shot).length ? 'looks_only' : 'text_only') : null;
    if (located.shot.videoReferenceMode && mode !== located.shot.videoReferenceMode && mode !== policyMode) {
      throw new CinematicError('cinematic_video_reference_mode_changed', 'The Shot reference mode changed. Refresh the quote.', 409);
    }
    const source = ['looks_only', 'text_only'].includes(mode) ? null : located.shot.approvedStoryboardSource;
    if (!source && !['looks_only', 'text_only'].includes(mode)) throw new CinematicError('cinematic_storyboard_source_required', 'Approve a Storyboard source before generating video.', 409);
    if (Number(input.expectedShotVersion) !== Number(located.shot.version || 1)
      || String(input.sourceFingerprint || '') !== (source?.sourceFingerprint || '')) {
      throw new CinematicError('cinematic_storyboard_source_changed', 'The approved Storyboard source changed before generation.', 409);
    }
    const storyboardAttempt = (project.generationAttempts || []).find(item => (
      item.id === located.shot.approvedStoryboardAttemptId
      && item.operation === 'cinematic_storyboard_still'
    )) || null;
    const videoPacket = this.videoPacketCompiler.compile({
      project,
      scene: located.scene,
      shot: located.shot,
      approvedStoryboardSource: source,
      storyboardAttempt,
      referenceMode: mode
    });
    const blockingFinding = videoPacket.findings.find(finding => finding.severity === 'blocking');
    if (blockingFinding) {
      throw new CinematicError(
        blockingFinding.code,
        'The approved Storyboard source no longer matches the current video handoff.',
        409,
        { fieldPath: blockingFinding.fieldPath }
      );
    }
    if (String(input.videoPacketFingerprint || '') !== videoPacket.packetFingerprint) {
      throw new CinematicError(
        'cinematic_video_packet_changed',
        'The Shot video packet changed before pricing or generation.',
        409,
        { currentVideoPacketFingerprint: videoPacket.packetFingerprint }
      );
    }
    if (String(input.prompt || '').trim() !== videoPacket.providerIndependentPrompt) {
      throw new CinematicError(
        'cinematic_video_prompt_authority_mismatch',
        'The submitted video prompt does not match the current server video packet.',
        409
      );
    }
    return { project, scene: located.scene, shot: located.shot, source, videoPacket };
  }

  updateShotDirection(projectId, sceneId, shotId, input, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const located = findShot(project, shotId);
      if (!located || located.scene.id !== sceneId) {
        throw new CinematicError('cinematic_shot_not_found', 'Storyboard Shot not found.', 404);
      }
      const { scene, shot } = located;
      if (Number(input.expectedShotVersion) !== Number(shot.version || 1)) {
        throw new CinematicError('cinematic_shot_version_conflict', 'The Shot changed in another session.', 409, {
          currentShotVersion: shot.version || 1
        });
      }
      const next = normalizeShotDirection(input, shot);
      const changed = SHOT_DIRECTION_FIELDS.some(field => next[field] !== shot[field]);
      if (!changed) return project;
      const previousSource = shot.approvedStoryboardSource || null;
      Object.assign(shot, next);
      shot.version = Number(shot.version || 1) + 1;
      shot.storyboardStatus = 'draft';
      if (previousSource) markSourceChanged(project, shot, previousSource.sourceFingerprint);
      markVideoPacketChanged(project, shot);
      scene.durationMs = scene.shots.reduce((total, item) => total + item.durationMs, 0);
      project.status = 'planned';
      project.version += 1;
      return project;
    });
  }

  updateShotMotionDirection(projectId, sceneId, shotId, input, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const located = findShot(project, shotId);
      if (!located || located.scene.id !== sceneId) {
        throw new CinematicError('cinematic_shot_not_found', 'Produce Shot not found.', 404);
      }
      const { shot } = located;
      if (Number(input.expectedShotVersion) !== Number(shot.version || 1)) {
        throw new CinematicError('cinematic_shot_version_conflict', 'The Shot changed in another session.', 409, {
          currentShotVersion: shot.version || 1
        });
      }
      const additionalMotionDirection = normalizeAdditionalMotionDirection(input.additionalMotionDirection);
      if (additionalMotionDirection === String(shot.additionalMotionDirection || '')) return project;
      shot.additionalMotionDirection = additionalMotionDirection;
      shot.version = Number(shot.version || 1) + 1;
      markVideoPacketChanged(project, shot);
      project.version += 1;
      return project;
    });
  }

  async updateShotVideoReferences(projectId, sceneId, shotId, input, actorContext) {
    const mode = cinematicVideoReferenceMode(input.referenceMode);
    const snapshot = await this.getProject(projectId, actorContext);
    const terminalTasks = new Set();
    // Attempt projections can lag polling; the durable task owns terminal status.
    for (const attempt of snapshot.generationAttempts || []) {
      if (attempt.shotId !== shotId || attempt.operation !== 'cinematic_draft_clip'
        || !attempt.generationJobId || !isActiveVideoAttempt(attempt)) continue;
      const task = await this.providerTaskRepository.findForActor(attempt.generationJobId, actorContext);
      if (['completed', 'failed', 'cancelled', 'expired'].includes(task?.status)) terminalTasks.add(attempt.id);
    }
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const located = findShot(project, shotId);
      if (!located || located.scene.id !== sceneId) throw new CinematicError('cinematic_shot_not_found', 'Shot not found.', 404);
      const { shot } = located;
      if (Number(input.expectedShotVersion) !== Number(shot.version || 1)) {
        throw new CinematicError('cinematic_shot_version_conflict', 'The Shot changed in another session.', 409);
      }
      if ((project.generationAttempts || []).some(attempt => attempt.shotId === shotId
        && attempt.operation === 'cinematic_draft_clip'
        && isActiveVideoAttempt(attempt) && !terminalTasks.has(attempt.id))) {
        throw new CinematicError('cinematic_video_attempt_active', 'Wait for the active Video Attempt before changing references.', 409);
      }
      if (shot.videoReferenceMode === mode) return project;
      shot.lastFirstFrameMode = ['looks_only', 'text_only'].includes(mode)
        ? (shot.videoReferenceMode && !['looks_only', 'text_only'].includes(shot.videoReferenceMode) ? shot.videoReferenceMode : shot.lastFirstFrameMode || 'storyboard_only')
        : mode;
      shot.videoReferenceMode = mode;
      markVideoPacketChanged(project, shot);
      project.version += 1;
      return project;
    });
  }

  reorderSceneShots(projectId, sceneId, input, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const scene = project.scenes.find(item => item.id === sceneId);
      if (!scene) throw new CinematicError('cinematic_scene_not_found', 'Storyboard Scene not found.', 404);
      const requestedOrder = Array.isArray(input.shotIds) ? input.shotIds.map(String) : [];
      const currentIds = scene.shots.map(shot => shot.id);
      if (requestedOrder.length !== currentIds.length
        || new Set(requestedOrder).size !== currentIds.length
        || requestedOrder.some(id => !currentIds.includes(id))) {
        throw new CinematicError('cinematic_shot_order_invalid', 'Shot order must contain every Scene Shot exactly once.');
      }
      const byId = new Map(scene.shots.map(shot => [shot.id, shot]));
      scene.shots = requestedOrder.map((id, index) => ({ ...byId.get(id), orderKey: index + 1 }));
      scene.shotOrder = [...requestedOrder];
      scene.version = Number(scene.version || 1) + 1;
      scene.durationMs = scene.shots.reduce((total, shot) => total + shot.durationMs, 0);
      project.version += 1;
      return project;
    });
  }

  saveTimeline(projectId, input, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const timeline = this.timelineCompiler.compile(input, project, { createId: createPrefixedId });
      project.timelineVersions.forEach(version => {
        if (version.status === 'active') version.status = 'superseded';
      });
      project.timelineVersions.push(timeline);
      project.activeTimelineVersionId = timeline.id;
      // An incomplete edit timeline is normal authoring state, not a runtime failure.
      project.status = 'review';
      project.version += 1;
      return project;
    });
  }

  async getExportManifest(projectId, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    const timeline = project.timelineVersions.find(item => item.id === project.activeTimelineVersionId);
    if (!timeline) throw new CinematicError('cinematic_timeline_required', 'An active Timeline is required.', 409);
    const readiness = this.timelineCompiler.reconcile(project, timeline);
    if (!readiness.exportEligible) {
      throw new CinematicError('cinematic_export_sources_incomplete', 'Every Timeline entry requires a current approved video source.', 409, {
        blockingEntries: readiness.entries.filter(entry => entry.downstreamSourceStatus !== 'current').map(entry => entry.shotId)
      });
    }
    return {
      exportId: createPrefixedId('cineexport'),
      projectId: project.id,
      projectVersion: project.version,
      timelineVersionId: readiness.id,
      timelineFingerprint: readiness.timelineFingerprint,
      aspectRatio: project.aspectRatio,
      durationMs: readiness.durationMs,
      targetDurationMs: readiness.targetDurationMs,
      durationDeltaMs: readiness.durationDeltaMs,
      entries: structuredClone(readiness.entries),
      assemblyStatus: 'qualification_blocked',
      blockingReason: 'cinematic_final_assembly_not_qualified',
      createdAt: new Date().toISOString()
    };
  }

  listOperationalProjects(query, actorContext) {
    this.backofficePolicy.assertCanAccessBackoffice(actorContext);
    return this.repository.searchOperational(query);
  }

  async getOperationalProject(projectId, actorContext) {
    this.backofficePolicy.assertCanAccessBackoffice(actorContext);
    const project = await this.repository.findOperational(projectId);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    return sanitizeOperationalProject(project);
  }

  listOperationalVideoTasks(query, actorContext) {
    this.backofficePolicy.assertCanAccessBackoffice(actorContext);
    return this.providerTaskRepository.listOperationalPage(query);
  }

  getOperationalVideoCapabilities(actorContext) {
    this.backofficePolicy.assertCanAccessBackoffice(actorContext);
    return this.videoCapabilities.getPublicCatalog({
      includeResearch: true,
      workflow: 'cinematic.produce_video'
    });
  }

  archiveProject(projectId, expectedVersion, actorContext) {
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, expectedVersion);
      project.status = 'archived';
      project.archivedAt = new Date().toISOString();
      project.version += 1;
      return { success: true, projectId };
    });
  }
}

function hasCurrentApprovedStoryPlan(project) {
  const active = (project.storyPlanVersions || []).find(version => version.id === project.activeStoryPlanVersionId);
  return Boolean(active && active.status === 'approved' && active.storySourceVersionId === project.activeStorySourceVersionId);
}

export class CinematicError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'CinematicError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizeSetup(input = {}) {
  const title = String(input.title ?? input.projectName ?? '').trim();
  const storyBrief = String(input.storyBrief ?? '').trim();
  const creativeDirection = String(input.creativeDirection ?? '').trim();
  const durationSeconds = Number(input.durationSeconds);
  if (!title || title.length > 120) throw new CinematicError('cinematic_title_invalid', 'Project title is required and must not exceed 120 characters.');
  if (!storyBrief || storyBrief.length > storyAuthoringConfiguration.limits.storyBrief) throw new CinematicError('cinematic_story_brief_invalid', `Story brief is required and must not exceed ${storyAuthoringConfiguration.limits.storyBrief} characters.`);
  if (creativeDirection.length > storyAuthoringConfiguration.limits.creativeDirection) throw new CinematicError('cinematic_creative_direction_invalid', `Creative direction must not exceed ${storyAuthoringConfiguration.limits.creativeDirection} characters.`);
  if (!DURATIONS.has(durationSeconds)) throw new CinematicError('cinematic_duration_invalid', 'Duration must be 20, 30, 45 or 60 seconds.');
  const castPlanningMode = pick(input.castPlanningMode, ['ai-recommended', 'solo', 'duo', 'manual'], 'ai-recommended');
  return {
    title,
    format: 'short-film',
    platform: pick(input.platform, ['tiktok', 'youtube-shorts', 'reels', 'multi-platform'], 'tiktok'),
    durationSeconds,
    storyBrief,
    creativeDirection,
    ...normalizeStoryIntent(input),
    endingIntent: pick(input.endingIntent, ['resolved', 'hopeful', 'twist', 'cliffhanger'], 'resolved'),
    mode: pick(input.mode, ['simple', 'advanced'], 'simple'),
    castPlanningMode,
    storyRoleSlots: normalizeStoryRoleSlots(input.storyRoleSlots, castPlanningMode)
  };
}

function normalizeStoryRoleSlots(value, mode) {
  const supplied = Array.isArray(value) ? value.slice(0, 4) : [];
  const normalized = supplied.map((role, index) => ({
    id: String(role?.id || `role_${index + 1}`).trim().slice(0, 80),
    label: String(role?.label || `Role ${index + 1}`).trim().slice(0, 80),
    importance: role?.importance === 'optional' ? 'optional' : 'required',
    storyFunction: String(role?.storyFunction || '').trim().slice(0, 240),
    relationshipHint: String(role?.relationshipHint || '').trim().slice(0, 160),
    objective: String(role?.objective || '').trim().slice(0, 240),
    emotionalArc: String(role?.emotionalArc || '').trim().slice(0, 240),
    personalityTraits: (Array.isArray(role?.personalityTraits) ? role.personalityTraits : []).slice(0, 6).map(value => String(value).trim().slice(0, 80)).filter(Boolean),
    performanceDirection: String(role?.performanceDirection || '').trim().slice(0, 320)
  })).filter(role => role.id && role.label);
  if (normalized.length) return normalized;
  if (mode === 'solo') return [emptyStoryRole('role_lead', 'Lead')];
  if (mode === 'duo') return [
    emptyStoryRole('role_lead', 'Lead'),
    emptyStoryRole('role_second', 'Second Character')
  ];
  return [];
}

function emptyStoryRole(id, label) {
  return {
    id, label, importance: 'required', storyFunction: '', relationshipHint: '',
    objective: '', emotionalArc: '', personalityTraits: [], performanceDirection: ''
  };
}

function preserveOmittedCastFields(normalized, existing, input) {
  for (const field of [
    'objective', 'motivation', 'pressure', 'personalityTraits', 'emotionalBaseline',
    'dialogueStyle', 'performanceDirection', 'apparentAgeRange', 'portraitUrl',
    'looks', 'active', 'storyRoleSlotId'
  ]) {
    if (!Object.hasOwn(input, field)) normalized[field] = structuredClone(existing[field]);
  }
}

function castSourceKey(assignment) {
  return assignment.sourceType === 'generated_sheet'
    ? `generated:${assignment.generatedSheet?.generationId}` : `character:${assignment.characterProfileId}`;
}

function generatedCastLooks(id, sheet, name) {
  return [{ id: `${id}_sheet`, version: 1, name, mode: 'generated_sheet',
    trustedGenerationId: sheet.generationId, contentHash: sheet.contentHash,
    assetIds: [sheet.assetId], sourceAssetIds: [sheet.assetId],
    coverage: 'multi_view', locked: true, approved: true, assurance: 'user_confirmed' }];
}

function normalizeCast(input = {}, authorizedCharacter = null, generatedSheet = null) {
  const characterProfileId = generatedSheet ? null : String(input.characterProfileId || '').trim();
  const characterProfileVersionId = generatedSheet ? null : String(input.characterProfileVersionId || '').trim();
  if (!generatedSheet && (!characterProfileId || !characterProfileVersionId)) {
    throw new CinematicError('cinematic_character_version_required', 'A pinned Character Profile Version is required.');
  }
  const id = String(input.assignmentId || '').trim() || `cinecast_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return {
    id,
    sourceType: generatedSheet ? 'generated_sheet' : 'character',
    generatedSheet,
    characterProfileId,
    characterProfileVersionId,
    portraitUrl: generatedSheet?.previewUrl || authorizedCharacter?.authorizedCharacterFaceReferenceUrl
      || authorizedCharacter?.authorizedCharacterFrontReferenceUrl
      || null,
    displayName: String(input.displayName || authorizedCharacter?.displayNameSnapshot || '').trim() || 'Character',
    storyRole: String(input.storyRole || '').trim() || 'Supporting',
    storyRoleSlotId: String(input.storyRoleSlotId || '').trim() || null,
    storyImportance: pick(input.storyImportance, ['protagonist', 'supporting'], 'supporting'),
    objective: String(input.objective || '').trim(),
    motivation: String(input.motivation || '').trim(),
    pressure: String(input.pressure || '').trim(),
    personalityTraits: normalizeStringList(input.personalityTraits, 6),
    emotionalBaseline: String(input.emotionalBaseline || '').trim(),
    dialogueStyle: String(input.dialogueStyle || '').trim(),
    performanceDirection: String(input.performanceDirection || '').trim(),
    identityReady: Boolean(generatedSheet) || authorizedCharacter?.identityPack?.status === 'identity_pack_ready',
    apparentAgeRange: input.apparentAgeRange || null,
    identityReadinessSnapshot: authorizedCharacter?.identityPack ? {
      status: authorizedCharacter.identityPack.status,
      ageRange: authorizedCharacter.identityPack.ageRange || null,
      presentationGender: authorizedCharacter.identityPack.presentationGender || null,
      characterType: authorizedCharacter.identityPack.characterType,
      outfitBehavior: authorizedCharacter.identityPack.outfitBehavior,
      identityPolicyVersion: authorizedCharacter.identityPack.identityPolicyVersion
    } : null,
    reuseAuthorization: authorizedCharacter?.attribution ? {
      ownerUserId: authorizedCharacter.attribution.ownerUserId,
      ownerUsername: authorizedCharacter.attribution.ownerUsername,
      validatedAt: new Date().toISOString()
    } : null,
    looks: generatedSheet ? generatedCastLooks(id, generatedSheet, input.displayName)
      : Array.isArray(input.looks) ? structuredClone(input.looks).slice(0, 12) : [],
    active: input.active !== false,
    updatedAt: new Date().toISOString()
  };
}

function reconcileCastIdentityReadiness(project) {
  const normalized = structuredClone(project);
  for (const assignment of normalized.castAssignments || []) {
    if (assignment.sourceType === 'generated_sheet') {
      assignment.identityReady = Boolean(assignment.generatedSheet?.contentHash);
      continue;
    }
    if (assignment.identityReadinessSnapshot?.status === 'identity_pack_ready') {
      assignment.identityReady = true;
    }
  }
  return normalized;
}

function normalizeStoryPlan(input = {}, project, contractVersion = normalizeStoryPlanContractVersion(input.contractVersion)) {
  const scenesInput = Array.isArray(input.scenes) ? input.scenes : [];
  if (!scenesInput.length || scenesInput.length > 24) {
    throw new CinematicError('cinematic_story_plan_invalid', 'A Story Plan requires between 1 and 24 Scenes.');
  }
  const existingScenes = new Map((project.scenes || []).map(scene => [scene.id, scene]));
  const beats = normalizeStoryBeats(input.beats);
  if (!beats.length) {
    beats.push({
      id: createPrefixedId('cinebeat'), orderKey: 1, type: 'development',
      title: 'Story', purpose: '', storyChange: '', emotionalStart: '', emotionalEnd: '',
      targetDurationMs: 0, sceneIds: []
    });
  }
  const beatIds = new Set(beats.map(beat => beat.id));
  const usedSceneIds = new Set();
  const usedShotIds = new Set();
  const scenes = scenesInput.map((sceneInput, sceneIndex) => {
    if (sceneInput.cinematicOpening === true && sceneIndex !== 0) throw new CinematicError('cinematic_opening_scene_order', 'The cinematic opening must remain the first Scene. Disable it before reordering.');
    const requestedSceneId = String(sceneInput.id || '').trim();
    const sceneId = requestedSceneId || createPrefixedId('cinescene');
    if (usedSceneIds.has(sceneId)) throw new CinematicError('cinematic_story_plan_invalid', 'Scene IDs must be unique.');
    usedSceneIds.add(sceneId);
    const existingScene = existingScenes.get(sceneId);
    const existingShots = new Map((existingScene?.shots || []).map(shot => [shot.id, shot]));
    const shotsInput = Array.isArray(sceneInput.shots) ? sceneInput.shots : [];
    if (!shotsInput.length || shotsInput.length > 40) {
      throw new CinematicError('cinematic_story_plan_invalid', 'Every Scene requires between 1 and 40 Shots.');
    }
    const shots = shotsInput.map((shotInput, shotIndex) => {
      const requestedShotId = String(shotInput.id || '').trim();
      const shotId = requestedShotId || createPrefixedId('cineshot');
      if (usedShotIds.has(shotId)) throw new CinematicError('cinematic_story_plan_invalid', 'Shot IDs must be unique.');
      usedShotIds.add(shotId);
      const existing = existingShots.get(shotId);
      const durationMs = normalizeDurationMs(shotInput.durationMs ?? Number(shotInput.durationSeconds) * 1000);
      if (shotInput.audioDirectionVersion === 1) validateAuthoredCues(shotInput, durationMs, project.castAssignments, resolveShotCastIds(sceneInput, shotInput));
      return {
        ...(existing ? structuredClone(existing) : {}),
        id: shotId,
        version: Number(existing?.version || 1),
        orderKey: shotIndex + 1,
        title: bounded(shotInput.title, 100, `Shot ${shotIndex + 1}`),
        purpose: bounded(shotInput.purpose, 500, ''),
        coverageRole: normalizeCoverageRole(shotInput.coverageRole, shotIndex),
        ...(shotInput.openingFrameVersion === 1 ? { openingFrameVersion: 1 } : {}),
        ...(shotInput.castMode !== undefined ? { castMode: normalizeCastMode(shotInput.castMode) } : {}),
        durationMs,
        visibleMoment: bounded(shotInput.visibleMoment, 800, ''),
        subjectAction: bounded(shotInput.subjectAction, 500, ''),
        emotionalTarget: bounded(shotInput.emotionalTarget, 240, ''),
        performanceCue: bounded(shotInput.performanceCue, 500, ''),
        framing: bounded(shotInput.framing, 120, 'medium shot'),
        cameraAngle: bounded(shotInput.cameraAngle, 120, 'eye level'),
        cameraMovement: bounded(shotInput.cameraMovement, 160, 'locked camera'),
        lensIntent: bounded(shotInput.lensIntent, 120, ''),
        blocking: bounded(shotInput.blocking, 500, ''),
        performance: bounded(shotInput.performance, 500, ''),
        gaze: bounded(shotInput.gaze, 240, ''),
        lighting: bounded(shotInput.lighting, 500, ''),
        environment: bounded(shotInput.environment, 500, ''),
        audioIntent: bounded(shotInput.audioIntent, 500, ''),
        prompt: bounded(shotInput.prompt, 4000, ''),
        additionalMotionDirection: normalizeAdditionalMotionDirection(
          shotInput.additionalMotionDirection ?? existing?.additionalMotionDirection
        ),
        continuityEntry: bounded(shotInput.continuityEntry, 500, ''),
        continuityExit: bounded(shotInput.continuityExit, 500, ''),
        transitionToNext: bounded(shotInput.transitionToNext, 240, ''),
        estimatedActionDurationMs: Math.max(0, Math.round(Number(shotInput.estimatedActionDurationMs) || 0)),
        ...(shotInput.audioDirectionVersion === 1 ? { audioDirectionVersion: 1 } : {}),
        dialogueCues: normalizeDialogueCues(shotInput.dialogueCues),
        audioCues: normalizeAudioCues(shotInput.audioCues),
        castAssignmentIds: shotInput.castMode === 'none' || sceneInput.castMode === 'none' ? [] : normalizeStringList(shotInput.castAssignmentIds, 6),
        wardrobeLookIds: shotInput.castMode === 'none' || sceneInput.castMode === 'none' ? [] : normalizeStringList(shotInput.wardrobeLookIds, 12),
        continuityNotes: normalizeStringList(shotInput.continuityNotes, 20),
        storyboardStatus: existing?.storyboardStatus || 'draft'
      };
    });
    return {
      id: sceneId,
      version: Number(existingScene?.version || 1),
      orderKey: sceneIndex + 1,
      ...(sceneInput.cinematicOpening !== undefined ? { cinematicOpening: sceneInput.cinematicOpening === true } : {}),
      beatId: bounded(sceneInput.beatId, 100, beats[0]?.id || ''),
      title: bounded(sceneInput.title, 120, `Scene ${sceneIndex + 1}`),
      purpose: bounded(sceneInput.purpose, 800, ''),
      storyChange: bounded(sceneInput.storyChange, 800, ''),
      entryState: bounded(sceneInput.entryState, 800, ''),
      exitState: bounded(sceneInput.exitState, 800, ''),
      objective: bounded(sceneInput.objective, 500, ''),
      pressure: bounded(sceneInput.pressure, 500, ''),
      location: bounded(sceneInput.location, 300, ''),
      time: bounded(sceneInput.time, 120, ''),
      emotionalStart: bounded(sceneInput.emotionalStart, 240, ''),
      emotionalEnd: bounded(sceneInput.emotionalEnd, 240, ''),
      transitionIntent: bounded(sceneInput.transitionIntent, 160, 'cut'),
      ...(sceneInput.castMode !== undefined ? { castMode: normalizeCastMode(sceneInput.castMode) } : {}),
      ...(sceneInput.artDirection !== undefined ? { artDirection: bounded(sceneInput.artDirection, 1000, '') } : {}),
      castAssignmentIds: sceneInput.castMode === 'none' ? [] : normalizeStringList(sceneInput.castAssignmentIds, 6),
      wardrobeLookIds: sceneInput.castMode === 'none' ? [] : normalizeStringList(sceneInput.wardrobeLookIds, 12),
      blocking: bounded(sceneInput.blocking, 500, ''),
      lighting: bounded(sceneInput.lighting, 500, ''),
      performance: bounded(sceneInput.performance, 500, ''),
      audioIntent: bounded(sceneInput.audioIntent, 500, ''),
      propContinuity: bounded(sceneInput.propContinuity, 500, ''),
      screenDirection: bounded(sceneInput.screenDirection, 500, ''),
      continuityNotes: normalizeStringList(sceneInput.continuityNotes, 20),
      shots,
      shotOrder: shots.map(shot => shot.id),
      durationMs: shots.reduce((sum, shot) => sum + shot.durationMs, 0)
    };
  });
  for (const beat of beats) {
    beat.sceneIds = scenes.filter(scene => scene.beatId === beat.id).map(scene => scene.id);
    beat.targetDurationMs = beat.sceneIds.reduce(
      (sum, sceneId) => sum + (scenes.find(scene => scene.id === sceneId)?.durationMs || 0), 0
    );
  }
  if (beats.length && scenes.some(scene => !beatIds.has(scene.beatId))) {
    throw new CinematicError('cinematic_story_plan_invalid', 'Every Scene must reference a valid Beat.');
  }
  const plan = {
    objective: bounded(input.objective, 1000, ''),
    logline: bounded(input.logline, 500, ''),
    beats,
    emotionalArc: bounded(input.emotionalArc, 1000, ''),
    centralDramaticQuestion: bounded(input.centralDramaticQuestion, 500, ''),
    storyPromise: bounded(input.storyPromise, 500, ''),
    finalPayoff: bounded(input.finalPayoff, 500, ''),
    spokenLanguage: bounded(input.spokenLanguage, 80, ''),
    onScreenTextPolicy: bounded(input.onScreenTextPolicy, 240, ''),
    dialoguePolicy: pick(input.dialoguePolicy, ['none', 'sparse', 'normal', 'dialogue-led'], 'sparse'),
    characterAliases: normalizeCharacterAliases(input.characterAliases, project),
    directorOperation: pick(input.directorOperation, ['generate', 'review_current', 'manual'], input.source === 'generated' ? 'generate' : 'manual'),
    directorSummary: bounded(input.directorSummary, 1000, ''),
    directorFindings: normalizeDirectorFindings(input.directorFindings),
    sourceResolution: pick(input.sourceResolution, ['story_brief', 'creative_direction'], null),
    warningsAcknowledged: input.warningsAcknowledged === true,
    warnings: normalizeStringList(input.warnings, 20),
    scenes
  };
  if (contractVersion === 'story-plan-v3') {
    const preflight = analyzeStoryPlanSource(project, { sourceResolution: plan.sourceResolution });
    plan.filmReadiness = evaluateStoryPlanFilmReadiness(project, plan, {
      preflight,
      aiFindings: plan.directorFindings
    });
    plan.scriptPreview = buildFilmScriptPreview(plan);
  } else {
    plan.filmReadiness = structuredClone(input.filmReadiness || filmReadinessNotEvaluated());
    plan.scriptPreview = Array.isArray(input.scriptPreview) ? structuredClone(input.scriptPreview) : [];
  }
  return plan;
}

function recordStoryPlanAuthoringState(
  { project, planVersion, input, completions, actorId, source, aiFieldKeys },
  authoringStateService,
  fieldManifestService
) {
  const fields = fieldManifestService.getPublicManifest().fields;
  const updatedAt = new Date().toISOString();
  const aiKeys = new Set(Array.isArray(aiFieldKeys) ? aiFieldKeys : []);
  const record = ({ entity, field, id = null, planId = null, sceneId = null, value, fieldSource = null }) => {
    if (!meaningfulAuthoringValue(value)) return;
    const key = cinematicFieldKey({ entity, field, id, planId, sceneId });
    const resolvedSource = fieldSource || (aiKeys.has(key) ? 'ai' : source);
    const definition = fieldManifestService.getField(`${entity}.${field}`);
    if (!definition?.authorities.includes(resolvedSource)) return;
    const current = authoringStateService.resolveFieldState(project, key);
    authoringStateService.recordFieldUpdate(
      project,
      key,
      {
        source: resolvedSource,
        locked: current.locked,
        sourceRevision: planVersion.id,
        updatedAt,
        updatedByActorId: actorId || null
      }
    );
  };

  for (const definition of fields.filter(item => item.path.startsWith('plan.'))) {
    const field = definition.path.slice('plan.'.length);
    record({ entity: 'plan', id: planVersion.id, field, value: input[field] });
  }
  (input.beats || []).forEach((beat, index) => {
    const normalized = planVersion.beats[index];
    if (!normalized) return;
    for (const definition of fields.filter(item => item.path.startsWith('beat.'))) {
      const field = definition.path.slice('beat.'.length);
      record({ entity: 'beat', planId: planVersion.id, id: normalized.id, field, value: beat?.[field] });
    }
  });
  (input.scenes || []).forEach((scene, sceneIndex) => {
    const normalizedScene = project.scenes[sceneIndex];
    if (!normalizedScene) return;
    for (const definition of fields.filter(item => item.path.startsWith('scene.'))) {
      const field = definition.path.slice('scene.'.length);
      record({ entity: 'scene', id: normalizedScene.id, field, value: scene?.[field] });
    }
    (scene?.shots || []).forEach((shot, shotIndex) => {
      const normalizedShot = normalizedScene.shots[shotIndex];
      if (!normalizedShot) return;
      for (const definition of fields.filter(item => item.path.startsWith('shot.'))) {
        const field = definition.path.slice('shot.'.length);
        record({
          entity: 'shot', sceneId: normalizedScene.id, id: normalizedShot.id,
          field, value: shot?.[field]
        });
      }
    });
  });

  for (const completion of completions || []) {
    const scene = project.scenes[completion.sceneIndex];
    const shot = completion.entity === 'shot' ? scene?.shots?.[completion.shotIndex] : null;
    if (!scene || (completion.entity === 'shot' && !shot)) continue;
    record({
      entity: completion.entity,
      id: completion.entity === 'scene' ? scene.id : shot.id,
      sceneId: completion.entity === 'shot' ? scene.id : null,
      field: completion.field,
      value: completion.entity === 'scene' ? scene[completion.field] : shot[completion.field],
      fieldSource: completion.source
    });
  }
}

function meaningfulAuthoringValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function normalizeStoryBeats(value) {
  const usedIds = new Set();
  return (Array.isArray(value) ? value : []).slice(0, 24).map((beat, index) => {
    const id = bounded(beat?.id, 100, '') || createPrefixedId('cinebeat');
    if (usedIds.has(id)) throw new CinematicError('cinematic_story_plan_invalid', 'Beat IDs must be unique.');
    usedIds.add(id);
    return {
      id,
      orderKey: index + 1,
      type: bounded(beat?.type, 60, 'development'),
      title: bounded(beat?.title, 120, `Beat ${index + 1}`),
      purpose: bounded(beat?.purpose ?? beat?.description, 500, ''),
      storyChange: bounded(beat?.storyChange, 500, ''),
      cause: bounded(beat?.cause, 500, ''),
      consequence: bounded(beat?.consequence, 500, ''),
      emotionalStart: bounded(beat?.emotionalStart, 240, ''),
      emotionalTurn: bounded(beat?.emotionalTurn, 240, ''),
      emotionalEnd: bounded(beat?.emotionalEnd, 240, ''),
      requiredElements: normalizeStringList(beat?.requiredElements, 8),
      targetDurationMs: Math.max(0, Math.round(Number(beat?.targetDurationMs) || 0)),
      sceneIds: normalizeStringList(beat?.sceneIds, 24)
    };
  });
}

function normalizeStoryPlanContractVersion(value) {
  return ['story-plan-v2', 'story-plan-v3'].includes(value) ? value : 'legacy';
}

function normalizeCharacterAliases(value, project) {
  const activeCastIds = new Set((project.castAssignments || [])
    .filter(item => item.active !== false)
    .map(item => item.id));
  const used = new Set();
  return (Array.isArray(value) ? value : []).slice(0, 6).flatMap(item => {
    const castAssignmentId = bounded(item?.castAssignmentId, 100, '');
    const storyCharacterName = bounded(item?.storyCharacterName, 100, '');
    if (!activeCastIds.has(castAssignmentId) || !storyCharacterName || used.has(castAssignmentId)) return [];
    used.add(castAssignmentId);
    return [{ castAssignmentId, storyCharacterName }];
  });
}

function validateAuthoredCues(shot, durationMs, cast = [], visibleCastIds = []) {
  const dialogue = shot.dialogueCues || [], audio = shot.audioCues || [];
  const validStart = cue => Number.isFinite(cue.startOffsetMs) && cue.startOffsetMs >= 0 && cue.startOffsetMs <= durationMs;
  if (!Array.isArray(dialogue) || !Array.isArray(audio) || dialogue.length > 12 || audio.length > 12
    || dialogue.some(cue => !cue || !String(cue.text || '').trim() || !validStart(cue)
      || (cue.speakerVisible === true && !visibleCastIds.includes(cue.speakerCastAssignmentId))
      || (cue.speakerCastAssignmentId ? !cast.some(item => item.active !== false && item.id === cue.speakerCastAssignmentId) : !String(cue.offscreenVoiceRole || '').trim()))
    || audio.some(cue => !cue || !String(cue.description || '').trim() || !validStart(cue))) {
    throw new CinematicError('cinematic_audio_cue_invalid', 'Complete each cue, its speaker and timing before saving.');
  }
}

function normalizeDialogueCues(value) {
  return (Array.isArray(value) ? value : []).slice(0, 12).map(cue => ({
    speakerCastAssignmentId: bounded(cue?.speakerCastAssignmentId, 100, ''),
    offscreenVoiceRole: bounded(cue?.offscreenVoiceRole, 100, ''),
    text: bounded(cue?.text, 600, ''),
    delivery: bounded(cue?.delivery, 240, ''),
    startOffsetMs: Math.max(0, Math.round(Number(cue?.startOffsetMs) || 0)),
    estimatedDurationMs: Math.max(0, Math.round(Number(cue?.estimatedDurationMs) || 0)),
    speakerVisible: cue?.speakerVisible === true
  })).filter(cue => cue.text);
}

function normalizeCoverageRole(value, shotIndex) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff'].includes(normalized)
    ? normalized
    : shotIndex === 0 ? 'establishing' : 'action';
}

function normalizeAudioCues(value) {
  return (Array.isArray(value) ? value : []).slice(0, 12).map(cue => ({
    kind: bounded(cue?.kind, 60, ''),
    source: bounded(cue?.source, 160, ''),
    description: bounded(cue?.description, 500, ''),
    startOffsetMs: Math.max(0, Math.round(Number(cue?.startOffsetMs) || 0)),
    durationMs: Math.max(0, Math.round(Number(cue?.durationMs) || 0))
  })).filter(cue => cue.description || cue.source);
}

function normalizeDirectorFindings(value) {
  return (Array.isArray(value) ? value : []).slice(0, 24).map(item => ({
    code: bounded(item?.code, 100, 'ai_director_note'),
    dimension: pick(item?.dimension, ['story', 'script', 'performance', 'visual', 'editorial', 'audio', 'continuity', 'production'], 'story'),
    severity: pick(item?.severity, ['warning', 'info'], 'warning'),
    summary: bounded(item?.summary, 500, ''),
    recommendation: bounded(item?.recommendation, 500, ''),
    beatId: bounded(item?.beatId, 100, '') || null,
    sceneId: bounded(item?.sceneId, 100, '') || null,
    shotId: bounded(item?.shotId, 100, '') || null
  })).filter(item => item.summary);
}

function assertStoryPlanInputReady(project) {
  if (!project.activeStorySourceVersionId || !String(project.setup?.storyBrief || '').trim()) {
    throw new CinematicError('cinematic_story_source_required', 'Complete the Story source before generating a Story Plan.', 409);
  }
  const required = (project.setup?.storyRoleSlots || []).filter(role => role.importance === 'required');
  const assigned = new Set((project.castAssignments || [])
    .filter(item => item.active !== false && item.storyRoleSlotId)
    .map(item => item.storyRoleSlotId));
  const missingRoleIds = required.filter(role => !assigned.has(role.id)).map(role => role.id);
  if (missingRoleIds.length) {
    throw new CinematicError(
      'cinematic_required_cast_incomplete',
      'Assign a Character to every required story role before generating a Story Plan.',
      409,
      { missingRoleIds }
    );
  }
  const assignmentsByRole = new Map((project.castAssignments || [])
    .filter(item => item.active !== false && item.storyRoleSlotId)
    .map(item => [item.storyRoleSlotId, item]));
  const unreadyRoleIds = required.filter(role => {
    const assignment = assignmentsByRole.get(role.id);
    return assignment?.identityReady !== true || !(assignment.looks || []).some(isProductionReadyLook);
  }).map(role => role.id);
  if (unreadyRoleIds.length) {
    throw new CinematicError(
      'cinematic_required_cast_look_incomplete',
      'Prepare and bind an approved multi-view Character Look for every required story role.',
      409,
      { unreadyRoleIds }
    );
  }
}

function isProductionReadyLook(look) {
  if (look?.mode === 'generated_sheet') return Boolean(look.trustedGenerationId && look.contentHash
    && look.locked === true && look.assetIds?.length === 1);
  return look?.mode === 'character_look'
    && Boolean(look.characterLookId)
    && Boolean(look.characterLookVersionId)
    && look.coverage === 'multi_view'
    && look.locked === true
    && Array.isArray(look.assetIds)
    && look.assetIds.length > 0;
}

function assertStoryPlanApprovalReady(plan, project, contractVersion = 'story-plan-v2') {
  assertStoryPlanInputReady(project);
  if (!plan.beats.length) {
    throw new CinematicError('cinematic_story_plan_beats_required', 'At least one Story Beat is required before approval.', 409);
  }
  const linkedSceneIds = new Set(plan.beats.flatMap(beat => beat.sceneIds));
  const unlinkedSceneIds = plan.scenes.filter(scene => !linkedSceneIds.has(scene.id)).map(scene => scene.id);
  const emptyBeatIds = plan.beats.filter(beat => !beat.sceneIds.length).map(beat => beat.id);
  if (unlinkedSceneIds.length || emptyBeatIds.length) {
    throw new CinematicError(
      'cinematic_story_plan_links_incomplete',
      'Every Beat and Scene must be linked before Story Plan approval.',
      409,
      { unlinkedSceneIds, emptyBeatIds }
    );
  }
  const incompleteBeatIds = plan.beats
    .filter(beat => !beat.title || !beat.purpose || !beat.storyChange)
    .map(beat => beat.id);
  const incompleteSceneIds = plan.scenes
    .filter(scene => !scene.title || !scene.purpose || !scene.storyChange)
    .map(scene => scene.id);
  const incompleteShotIds = plan.scenes.flatMap(scene => scene.shots
    .filter(shot => !shot.title || !shot.purpose)
    .map(shot => shot.id));
  if (incompleteBeatIds.length || incompleteSceneIds.length || incompleteShotIds.length) {
    throw new CinematicError(
      'cinematic_story_plan_details_incomplete',
      'Every Beat, Scene and Shot requires its core Story Plan details before approval.',
      409,
      { incompleteBeatIds, incompleteSceneIds, incompleteShotIds }
    );
  }
  assertStoryPlanCastAndLookAuthority(plan, project);
  const plannedDurationMs = plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0);
  if (Math.abs(plannedDurationMs - project.durationTargetMs) > 1000) {
    throw new CinematicError(
      'cinematic_story_plan_duration_mismatch',
      'Story Plan duration must be within one second of the Project target.',
      409,
      { plannedDurationMs, targetDurationMs: project.durationTargetMs }
    );
  }
  if (contractVersion === 'story-plan-v3') {
    if (plan.filmReadiness?.status === 'not_ready') {
      throw new CinematicError(
        'cinematic_story_plan_film_not_ready',
        'Resolve Film Readiness blockers before Story Plan approval.',
        409,
        { findings: plan.filmReadiness.findings.filter(item => item.severity === 'blocking') }
      );
    }
    if (plan.filmReadiness?.status === 'ready_with_warnings' && plan.warningsAcknowledged !== true) {
      throw new CinematicError(
        'cinematic_story_plan_warnings_acknowledgement_required',
        'Review and acknowledge Film Readiness warnings before approval.',
        409,
        { findings: plan.filmReadiness.findings.filter(item => item.severity === 'warning') }
      );
    }
  }
}

function assertStoryPlanCastAndLookAuthority(plan, project) {
  const assignments = new Map((project.castAssignments || [])
    .filter(assignment => assignment.active !== false)
    .map(assignment => [assignment.id, assignment]));
  const lookOwners = new Map();
  for (const assignment of assignments.values()) {
    for (const look of assignment.looks || []) {
      if (look?.id) lookOwners.set(look.id, assignment.id);
    }
  }
  const invalidSceneCastIds = [];
  const unreadySceneCastIds = [];
  const invalidSceneLookIds = [];
  const unreadySceneLookIds = [];
  const invalidShotCastIds = [];
  const invalidShotLookIds = [];
  for (const scene of plan.scenes) {
    const sceneCast = new Set(scene.castAssignmentIds || []);
    for (const assignmentId of sceneCast) {
      if (!assignments.has(assignmentId)) invalidSceneCastIds.push(`${scene.id}:${assignmentId}`);
      else if (assignments.get(assignmentId)?.identityReady !== true) unreadySceneCastIds.push(`${scene.id}:${assignmentId}`);
    }
    for (const lookId of scene.wardrobeLookIds || []) {
      const ownerId = lookOwners.get(lookId);
      if (!ownerId || !sceneCast.has(ownerId)) invalidSceneLookIds.push(`${scene.id}:${lookId}`);
      else if (assignments.get(ownerId)?.looks?.find(look => look.id === lookId)?.locked !== true) {
        unreadySceneLookIds.push(`${scene.id}:${lookId}`);
      }
    }
    for (const shot of scene.shots || []) {
      const shotCast = new Set(shot.castAssignmentIds || []);
      for (const assignmentId of shotCast) {
        if (!assignments.has(assignmentId) || !sceneCast.has(assignmentId)) {
          invalidShotCastIds.push(`${shot.id}:${assignmentId}`);
        }
      }
      for (const lookId of shot.wardrobeLookIds || []) {
        const ownerId = lookOwners.get(lookId);
        if (!ownerId || !shotCast.has(ownerId) || !(scene.wardrobeLookIds || []).includes(lookId)) {
          invalidShotLookIds.push(`${shot.id}:${lookId}`);
        }
      }
    }
  }
  if (invalidSceneCastIds.length || unreadySceneCastIds.length || invalidSceneLookIds.length || unreadySceneLookIds.length || invalidShotCastIds.length || invalidShotLookIds.length) {
    throw new CinematicError(
      'cinematic_story_plan_cast_authority_invalid',
      'Scene and Shot Cast or Wardrobe references must belong to this Project and follow Scene authority.',
      409,
      { invalidSceneCastIds, unreadySceneCastIds, invalidSceneLookIds, unreadySceneLookIds, invalidShotCastIds, invalidShotLookIds }
    );
  }
}

function normalizeDurationMs(value) {
  const durationMs = Math.round(Number(value));
  if (!Number.isFinite(durationMs) || durationMs < 250 || durationMs > 60000) {
    throw new CinematicError('cinematic_shot_duration_invalid', 'Shot duration must be between 0.25 and 60 seconds.');
  }
  return durationMs;
}

function bounded(value, max, fallback) {
  const normalized = String(value || '').trim();
  if (normalized.length > max) throw new CinematicError('cinematic_story_plan_invalid', `A Story Plan field exceeds ${max} characters.`);
  return normalized || fallback;
}

function findShot(project, shotId) {
  for (const scene of project.scenes || []) {
    const shot = (scene.shots || []).find(item => item.id === shotId);
    if (shot) return { scene, shot };
  }
  return null;
}

function allStoryboardShotsApproved(project) {
  const shots = (project.scenes || []).flatMap(scene => scene.shots || []);
  return shots.length > 0 && shots.every(shot => Boolean(shot.approvedStoryboardSource));
}

function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (!key || key.length > 160) throw new CinematicError('cinematic_idempotency_key_required', 'A valid idempotency key is required.');
  return key;
}

function isActiveVideoAttempt(attempt) {
  return ['accepted', 'preparing', 'provider_submitting', 'provider_queued', 'provider_processing',
    'provider_succeeded', 'media_copying', 'media_retry_pending', 'pending', 'queued', 'processing', 'running'].includes(attempt.status);
}

function deterministicCinematicAttemptId(userId, projectId, shotId, idempotencyKey) {
  const digest = crypto.createHash('sha256')
    .update(`${userId}:${projectId}:${shotId}:${idempotencyKey}`)
    .digest('hex')
    .slice(0, 20);
  return `cineattempt_${digest}`;
}

function buildCinematicWorkflow(project, scene, shot, generationAttemptId) {
  return {
    capability: 'cinematic',
    generationMode: 'cinematic_video',
    projectId: project.id,
    sceneId: scene.id,
    shotId: shot.id,
    generationAttemptId
  };
}

function buildCinematicVideoRequest(input, project, shot, source, videoPacket, providerPrompt = null, referencePlan = null) {
  const plannedDurationSeconds = Math.max(0.001, Number(shot.durationMs) / 1000);
  const durationSeconds = Math.max(1, Number(input.durationSeconds || plannedDurationSeconds));
  const references = referencePlan?.references || [{
    role: 'first_frame',
    assetId: source.assetId || null,
    assetVersionId: source.assetVersionId,
    sourceFingerprint: source.sourceFingerprint,
    referenceImageUrl: source.imageUrl
  }];
  return {
    providerId: String(input.providerId || ''),
    modelId: String(input.modelId || ''),
    operation: 'image_to_video',
    commercialOperation: 'cinematic_draft_clip',
    inputMode: referencePlan?.inputMode || 'image_to_video',
    prompt: providerPrompt?.prompt || videoPacket.providerIndependentPrompt,
    promptStrategy: providerPrompt ? {
      id: providerPrompt.strategyId,
      version: providerPrompt.strategyVersion,
      policyId: providerPrompt.policyId,
      policyVersion: providerPrompt.policyVersion
    } : null,
    renderedPromptFingerprint: providerPrompt?.promptFingerprint || videoPacket.renderedPromptFingerprint || null,
    aspectRatio: String(input.aspectRatio || project.aspectRatio || '9:16'),
    resolution: String(input.resolution || '720p'),
    durationSeconds,
    plannedDurationSeconds,
    audioMode: String(input.audioMode || 'none'),
    referenceImageUrl: ['looks_only', 'text_only'].includes(referencePlan?.mode) ? null : source?.imageUrl,
    referenceContainsPerson: Array.isArray(videoPacket.authority?.characters)
      && videoPacket.authority.characters.length > 0,
    references,
    referencePlanFingerprint: fingerprintVideoReferencePlan(references, referencePlan?.inputMode || 'image_to_video'),
    requestFingerprint: input.requestFingerprint || null,
    videoPacketFingerprint: videoPacket.packetFingerprint
  };
}

function renderProviderVideoPrompt(compiler, videoPacket, input, referencePlan) {
  if (typeof compiler?.renderForProvider === 'function') {
    return compiler.renderForProvider(videoPacket, {
      providerId: String(input.providerId || ''),
      referencePlan,
      modelId: String(input.modelId || '')
    });
  }
  return {
    prompt: videoPacket.providerIndependentPrompt,
    promptFingerprint: videoPacket.renderedPromptFingerprint || null,
    strategyId: 'legacy-provider-neutral',
    strategyVersion: 1,
    policyId: videoPacket.provenance?.policyId || 'legacy',
    policyVersion: videoPacket.provenance?.policyVersion || 1
  };
}

function cinematicVideoSourceFingerprint(attempt) {
  return crypto.createHash('sha256').update(JSON.stringify({
    attemptId: attempt.id,
    generationJobId: attempt.generationJobId || null,
    sourceFingerprint: attempt.sourceFingerprint || null,
    outputAssetIds: [...(attempt.outputAssetIds || [])],
    providerId: attempt.providerId || null,
    modelId: attempt.modelId || null
  })).digest('hex');
}

function asCinematicError(error) {
  if (error instanceof CinematicError) return error;
  return new CinematicError(
    error?.code || 'cinematic_video_operation_failed',
    error?.message || 'Cinematic Video operation failed.',
    error?.statusCode || 400,
    error?.details
  );
}

function markSourceChanged(project, shot, previousFingerprint) {
  for (const attempt of project.generationAttempts || []) {
    if (attempt.shotId === shot.id
      && ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt.operation)
      && !['looks_only', 'text_only'].includes(attempt.referenceMode)
      && attempt.sourceFingerprint === previousFingerprint) {
      attempt.downstreamSourceStatus = 'source_changed';
    }
  }
  if (shot.approvedVideoSourceFingerprint === previousFingerprint && previousFingerprint) {
    shot.approvedVideoAttemptId = null;
    shot.approvedVideoSourceFingerprint = null;
  }
  for (const timeline of project.timelineVersions || []) {
    for (const entry of timeline.entries || []) {
      if (entry.shotId === shot.id && entry.sourceFingerprint === previousFingerprint && previousFingerprint) {
        entry.downstreamSourceStatus = 'source_changed';
        timeline.status = 'stale';
        timeline.exportEligible = false;
      }
    }
  }
}

function markVideoPacketChanged(project, shot) {
  for (const attempt of project.generationAttempts || []) {
    if (attempt.shotId === shot.id
      && ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt.operation)) {
      attempt.downstreamSourceStatus = 'packet_changed';
    }
  }
  shot.approvedVideoAttemptId = null;
  shot.approvedVideoSourceFingerprint = null;
  for (const timeline of project.timelineVersions || []) {
    for (const entry of timeline.entries || []) {
      if (entry.shotId !== shot.id) continue;
      entry.downstreamSourceStatus = 'packet_changed';
      timeline.status = 'stale';
      timeline.exportEligible = false;
    }
  }
}

function invalidateReplacedCastSources(project, assignment) {
  const lookIds = new Set((assignment.looks || []).map(look => look.id));
  for (const scene of project.scenes || []) {
    const sceneUsesAssignment = scene.castAssignmentIds?.includes(assignment.id);
    const previousSceneLookCount = scene.wardrobeLookIds?.length || 0;
    scene.wardrobeLookIds = (scene.wardrobeLookIds || []).filter(lookId => !lookIds.has(lookId));
    let sceneChanged = sceneUsesAssignment || scene.wardrobeLookIds.length !== previousSceneLookCount;

    for (const shot of scene.shots || []) {
      const shotUsesAssignment = resolveShotCastIds(scene, shot).includes(assignment.id);
      const previousShotLookCount = shot.wardrobeLookIds?.length || 0;
      shot.wardrobeLookIds = (shot.wardrobeLookIds || []).filter(lookId => !lookIds.has(lookId));
      const shotChanged = shotUsesAssignment || shot.wardrobeLookIds.length !== previousShotLookCount;
      if (!shotChanged) continue;
      markVideoPacketChanged(project, shot);

      const previousSource = shot.approvedStoryboardSource || null;
      if (previousSource?.sourceFingerprint) {
        markSourceChanged(project, shot, previousSource.sourceFingerprint);
      }
      for (const attempt of project.generationAttempts || []) {
        if (attempt.shotId === shot.id && attempt.operation === 'cinematic_storyboard_still') {
          attempt.downstreamSourceStatus = 'source_changed';
        }
      }
      shot.approvedStoryboardSource = undefined;
      shot.approvedStoryboardAttemptId = undefined;
      shot.storyboardStatus = 'draft';
      shot.version = Number(shot.version || 0) + 1;
      sceneChanged = true;
    }

    if (sceneChanged) scene.version = Number(scene.version || 0) + 1;
  }
  project.status = project.scenes?.length ? 'planned' : 'planning';
}

function buildProduceContext(project, scene, shot, videoPacketCompiler, requestedMode) {
  const referenceMode = cinematicVideoReferenceMode(requestedMode ?? shot.videoReferenceMode);
  const attempts = (project.generationAttempts || []).filter(attempt => (
    attempt.shotId === shot.id
    && ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt.operation)
  ));
  const approvedSource = shot.approvedStoryboardSource || null;
  const source = approvedSource?.providerOutputProvenance
    ? {
        ...approvedSource,
        videoCompatibility: deriveStoryboardVideoCompatibility({
          providerOutputProvenance: approvedSource.providerOutputProvenance
        })
      }
    : approvedSource;
  const activePlan = (project.storyPlanVersions || []).find(version => version.id === project.activeStoryPlanVersionId) || null;
  const storyboardAttempt = (project.generationAttempts || []).find(attempt => (
    attempt.id === shot.approvedStoryboardAttemptId
    && attempt.operation === 'cinematic_storyboard_still'
  )) || null;
  const videoPacket = videoPacketCompiler.compile({
    project,
    scene,
    shot,
    approvedStoryboardSource: source,
    storyboardAttempt,
    referenceMode
  });
  const blockingFinding = videoPacket.findings.find(finding => finding.severity === 'blocking');
  const timelineDependency = (project.timelineVersions || []).flatMap(timeline => timeline.entries || [])
    .find(entry => (
      entry.shotId === shot.id
      && ['source_changed', 'packet_changed'].includes(entry.downstreamSourceStatus)
    ));
  return {
    projectId: project.id,
    projectVersion: project.version,
    sceneId: scene.id,
    shotId: shot.id,
    shotVersion: shot.version || 1,
    approvedStoryboardSource: source,
    referenceMode,
    generationEligible: (['looks_only', 'text_only'].includes(referenceMode) || Boolean(source)) && !blockingFinding,
    blockingReason: blockingFinding?.code || null,
    videoPacket,
    directingContract: {
      visibleMoment: shot.visibleMoment || '',
      subjectAction: shot.subjectAction || shot.blocking || '',
      emotionalTarget: shot.emotionalTarget || '',
      performanceCue: shot.performanceCue || shot.performance || '',
      continuityEntry: shot.continuityEntry || '',
      continuityExit: shot.continuityExit || '',
      transitionToNext: shot.transitionToNext || scene.transitionIntent || '',
      dialogueCues: structuredClone(shot.dialogueCues || []),
      audioCues: structuredClone(shot.audioCues || []),
      characterAliases: structuredClone(activePlan?.characterAliases || [])
    },
    videoAttempts: attempts.map(attempt => ({
      id: attempt.id,
      operation: attempt.operation,
      status: attempt.status,
      generationJobId: attempt.generationJobId || null,
      providerTaskId: attempt.providerTaskId || null,
      providerId: attempt.providerId || null,
      modelId: attempt.modelId || null,
      quoteId: attempt.quoteId || null,
      reservationId: attempt.reservationId || null,
      qualificationAuthorizationId: attempt.qualificationAuthorizationId || null,
      developmentPocUnverified: attempt.developmentPocUnverified === true,
      developmentPocCredits: attempt.developmentPocCredits || null,
      developmentPocWarningCode: attempt.developmentPocWarningCode || null,
      keyframeContractFingerprint: attempt.keyframeContractFingerprint || null,
      videoPacketFingerprint: attempt.videoPacketFingerprint || null,
      videoSourceFingerprint: attempt.videoSourceFingerprint || null,
      renderDurationMs: Number(attempt.renderDurationMs || 0) || null,
      outputAsset: attempt.outputAsset || null,
      settlementStatus: attempt.settlementStatus || null,
      reviewDecision: attempt.reviewDecision || 'pending',
      downstreamSourceStatus: attempt.downstreamSourceStatus || (
        ['looks_only', 'text_only'].includes(attempt.referenceMode) || attempt.sourceFingerprint === source?.sourceFingerprint ? 'current' : 'source_changed'
      )
    })),
    timelineDependencyStatus: timelineDependency?.downstreamSourceStatus || 'current'
  };
}

const SHOT_DIRECTION_FIELDS = [
  'title', 'purpose', 'durationMs', 'framing', 'cameraAngle', 'cameraMovement',
  'lensIntent', 'blocking', 'performance', 'gaze', 'lighting', 'environment',
  'audioIntent', 'prompt', 'visibleMoment', 'subjectAction', 'emotionalTarget',
  'performanceCue', 'continuityEntry', 'continuityExit', 'transitionToNext'
];

function normalizeShotDirection(input, current) {
  const normalized = {};
  for (const field of SHOT_DIRECTION_FIELDS) {
    if (field === 'durationMs') {
      const value = Math.round(Number(input.durationMs ?? current.durationMs));
      if (!Number.isFinite(value) || value < 500 || value > 20000) {
        throw new CinematicError('cinematic_shot_duration_invalid', 'Shot duration must be between 0.5 and 20 seconds.');
      }
      normalized[field] = value;
      continue;
    }
    const value = String(input[field] ?? current[field] ?? '').trim();
    if (field === 'prompt' && !value
      && !String(input.visibleMoment ?? current.visibleMoment ?? '').trim()
      && !String(input.subjectAction ?? current.subjectAction ?? '').trim()) {
      throw new CinematicError('cinematic_shot_prompt_required', 'A Shot direction or opening/action description is required.');
    }
    normalized[field] = value;
  }
  return normalized;
}

function normalizeAdditionalMotionDirection(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (Array.from(normalized).length > 300) {
    throw new CinematicError(
      'cinematic_motion_direction_too_long',
      'Additional motion direction cannot exceed 300 characters.'
    );
  }
  return normalized;
}

function sanitizeOperationalProject(project) {
  return {
    projectId: project.id,
    ownerUserId: project.ownerUserId,
    ownerUsername: project.ownerUsername,
    title: project.title,
    activeStage: project.activeStage,
    status: project.status,
    version: project.version,
    activeStoryPlanVersionId: project.activeStoryPlanVersionId,
    activeTimelineVersionId: project.activeTimelineVersionId,
    scenes: (project.scenes || []).map(scene => ({
      id: scene.id,
      title: scene.title,
      durationMs: scene.durationMs,
      shots: (scene.shots || []).map(shot => ({
        id: shot.id,
        version: shot.version,
        storyboardStatus: shot.storyboardStatus,
        approvedStoryboardAssetVersionId: shot.approvedStoryboardSource?.assetVersionId || null,
        storyboardSourceJobId: shot.approvedStoryboardSource?.sourceJobId || null
      }))
    })),
    attempts: (project.generationAttempts || []).map(attempt => ({
      id: attempt.id,
      sceneId: attempt.sceneId,
      shotId: attempt.shotId,
      operation: attempt.operation,
      status: attempt.status,
      generationJobId: attempt.generationJobId || null,
      providerTaskId: attempt.providerTaskId || null,
      quoteId: attempt.quoteId || null,
      reservationId: attempt.reservationId || null,
      settlementId: attempt.settlementId || null,
      downstreamSourceStatus: attempt.downstreamSourceStatus || 'current'
    })),
    timelineVersions: structuredClone(project.timelineVersions || []),
    updatedAt: project.updatedAt
  };
}

function normalizeStringList(value, max) {
  if (Array.isArray(value)) return [...new Set(value.map(item => String(item).trim()).filter(Boolean))].slice(0, max);
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, max);
}

function assertExpectedVersion(project, expectedVersion) {
  if (Number(expectedVersion) !== project.version) {
    throw new CinematicError('cinematic_version_conflict', 'The Project changed in another session.', 409, { currentVersion: project.version });
  }
}

function assertEditable(project) {
  if (['completed', 'archived'].includes(project.status)) {
    throw new CinematicError('cinematic_project_not_editable', 'This Cinematic Project is not editable.', 409);
  }
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export const cinematicApplicationService = new CinematicApplicationService();
