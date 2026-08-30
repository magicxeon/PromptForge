import crypto from 'crypto';
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

const STAGES = ['setup', 'cast', 'story-plan', 'storyboard', 'produce', 'finish'];
const DURATIONS = new Set([20, 30, 45, 60]);

export class CinematicApplicationService {
  constructor({
    repository = cinematicProjectRepository,
    storyboardAssetService = cinematicStoryboardAssetService,
    wardrobeAuthorityService = cinematicWardrobeAuthorityService,
    characterAuthorizationService = characterUsageService,
    lookService = characterLookService,
    backofficePolicy = adminPolicyService,
    providerTaskRepository = videoProviderTaskRepository,
    videoCapabilities = videoCapabilityRegistry,
    videoGenerationService = videoGenerationApplicationService,
    storyEnhancementService = cinematicStoryEnhancementService,
    wardrobeSuggestionService = cinematicWardrobeSuggestionService,
    storyPlanService = cinematicStoryPlanService,
    assetRepository = assetRepo
  } = {}) {
    this.repository = repository;
    this.storyboardAssetService = storyboardAssetService;
    this.wardrobeAuthorityService = wardrobeAuthorityService;
    this.characterAuthorizationService = characterAuthorizationService;
    this.lookService = lookService;
    this.backofficePolicy = backofficePolicy;
    this.providerTaskRepository = providerTaskRepository;
    this.videoCapabilities = videoCapabilities;
    this.videoGenerationService = videoGenerationService;
    this.storyEnhancementService = storyEnhancementService;
    this.wardrobeSuggestionService = wardrobeSuggestionService;
    this.storyPlanService = storyPlanService;
    this.assetRepository = assetRepository;
  }

  listProjects(actorContext, query) {
    return this.repository.listForActor(actorContext, query);
  }

  getVideoCapabilities() {
    return this.videoGenerationService.getCatalog();
  }

  async getProject(projectId, actorContext) {
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
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

  async generateStoryPlan(projectId, actorContext) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    assertStoryPlanInputReady(project);
    return this.storyPlanService.generatePlan(project);
  }

  async generateSceneDirection(projectId, sceneId, input, actorContext) {
    if (!actorContext?.userId) throw new CinematicError('actor_context_required', 'Actor context is required.', 401);
    const project = await this.repository.findForActor(projectId, actorContext);
    if (!project) throw new CinematicError('cinematic_project_not_found', 'Cinematic Project not found.', 404);
    assertExpectedVersion(project, input?.expectedVersion);
    assertStoryPlanInputReady(project);
    return this.storyPlanService.generateScene(project, sceneId, input?.direction);
  }

  updateSetup(projectId, input, actorContext) {
    const patch = normalizeSetup(input);
    return this.repository.mutateForActor(projectId, actorContext, project => {
      assertExpectedVersion(project, input.expectedVersion);
      assertEditable(project);
      const storyChanged = project.setup.storyBrief !== patch.storyBrief
        || project.setup.creativeDirection !== patch.creativeDirection;
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
      project.activeStage = stage;
      project.version += 1;
      return project;
    });
  }

  async upsertCastAssignment(projectId, input, actorContext) {
    const authorizedCharacter = await this.characterAuthorizationService.validateGenerationContext({
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
      const normalized = normalizeCast(input, authorizedCharacter);
      const index = project.castAssignments.findIndex(item => item.id === normalized.id);
      if (index >= 0) {
        const existing = project.castAssignments[index];
        preserveOmittedCastFields(normalized, existing, input);
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
          if (!shot.wardrobeLookIds.includes(lookId)) continue;
          const previousSource = shot.approvedStoryboardSource;
          shot.approvedStoryboardSource = undefined;
          shot.storyboardStatus = 'draft';
          shot.version = Number(shot.version || 1) + 1;
          if (previousSource) markSourceChanged(project, shot, previousSource.sourceFingerprint);
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
      const plan = normalizeStoryPlan(input, project);
      if (input.approved === true && input.contractVersion === 'story-plan-v2') {
        assertStoryPlanApprovalReady(plan, project);
      }
      const now = new Date().toISOString();
      const planVersion = {
        id: createPrefixedId('cineplan'),
        version: project.storyPlanVersions.length + 1,
        parentVersionId: project.activeStoryPlanVersionId || null,
        storySourceVersionId: project.activeStorySourceVersionId,
        objective: plan.objective,
        logline: plan.logline,
        beats: plan.beats,
        emotionalArc: plan.emotionalArc,
        sceneIds: plan.scenes.map(scene => scene.id),
        estimatedDurationMs: plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0),
        estimatedShotCount: plan.scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
        warnings: plan.warnings,
        contractVersion: input.contractVersion === 'story-plan-v2' ? 'story-plan-v2' : 'legacy',
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
      }
      project.storyPlanVersions.push(planVersion);
      project.scenes = plan.scenes;
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
      shot.approvedStoryboardSource = approvedAsset;
      shot.approvedStoryboardAttemptId = attempt.id;
      shot.storyboardStatus = 'approved';
      shot.version = Number(shot.version || 1) + 1;
      if (previous && previous.sourceFingerprint !== approvedAsset.sourceFingerprint) {
        markSourceChanged(project, shot, previous.sourceFingerprint);
      }
      project.status = allStoryboardShotsApproved(project) ? 'storyboard_ready' : 'planned';
      project.version += 1;
      const result = buildProduceContext(project, scene, shot);
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

  async getProduceShotContext(projectId, sceneId, shotId, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    const located = findShot(project, shotId);
    if (!located || (sceneId && located.scene.id !== sceneId)) {
      throw new CinematicError('cinematic_shot_not_found', 'Produce Shot not found.', 404);
    }
    return buildProduceContext(project, located.scene, located.shot);
  }

  async getStoryboardGenerationContext(projectId, sceneId, shotId, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    const located = findShot(project, shotId);
    if (!located || located.scene.id !== sceneId) {
      throw new CinematicError('cinematic_shot_not_found', 'Storyboard Shot not found.', 404);
    }
    const { scene, shot } = located;
    const castIds = shot.castAssignmentIds?.length ? shot.castAssignmentIds : scene.castAssignmentIds;
    const assignments = castIds.flatMap(assignmentId => {
      const assignment = project.castAssignments.find(item => item.id === assignmentId && item.active !== false);
      return assignment ? [assignment] : [];
    });
    const selectedLookIds = new Set(shot.wardrobeLookIds?.length ? shot.wardrobeLookIds : scene.wardrobeLookIds);
    const selectedLooks = assignments.flatMap(assignment => (assignment.looks || [])
      .filter(look => selectedLookIds.has(look.id))
      .map(look => ({ ...look, assignmentId: assignment.id })));
    const assetIds = [...new Set(selectedLooks.flatMap(look => look.assetIds || []))].slice(0, 2);
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
    const primary = assignments[0] || null;
    const missingLookReference = selectedLooks.some(look => (look.assetIds || []).length > 0)
      && wardrobeUrls.length === 0;
    return {
      schemaVersion: 1,
      projectId: project.id,
      projectVersion: project.version,
      sceneId: scene.id,
      shotId: shot.id,
      shotVersion: shot.version,
      characterProfileContext: primary ? {
        purpose: 'character_usage',
        characterProfileId: primary.characterProfileId,
        characterProfileVersionId: primary.characterProfileVersionId,
        useCase: 'cinematic',
        sourceType: 'scene_builder',
        sourceId: project.id
      } : null,
      references: {
        outfit_front: wardrobeUrls[0] || null,
        outfit_back: wardrobeUrls[1] || null,
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
      generationEligible: assignments.length <= 1
        && assignments.every(assignment => assignment.identityReady === true)
        && selectedLooks.every(look => look.locked === true)
        && !missingLookReference,
      blockingReason: assignments.length > 1
        ? 'cinematic_storyboard_multi_character_unqualified'
        : assignments.some(assignment => assignment.identityReady !== true)
          ? 'cinematic_storyboard_character_not_ready'
          : selectedLooks.some(look => look.locked !== true)
            ? 'cinematic_storyboard_look_not_ready'
            : missingLookReference
              ? 'cinematic_storyboard_look_asset_unavailable'
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
        if (shot.approvedStoryboardSource) {
          throw new CinematicError(
            'cinematic_storyboard_source_already_approved',
            'An approved Storyboard source already exists for this Shot.',
            409
          );
        }
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
          generationJobId: child.jobId,
          quoteId: child.estimateId || null,
          outputAssetIds: [],
          status: 'queued',
          reviewDecision: 'pending',
          createdAt: now
        });
        shot.storyboardStatus = 'generating';
      }
      project.status = 'planned';
      project.version += 1;
      return project;
    });
  }

  async quoteVideoAttempt(projectId, sceneId, shotId, input, actorContext) {
    const { project, scene, shot, source } = await this.#getCurrentProduceSource(
      projectId, sceneId, shotId, input, actorContext
    );
    try {
      const quote = await this.videoGenerationService.quote(
        buildCinematicVideoRequest(input, project, shot, source),
        actorContext,
        buildCinematicWorkflow(project, scene, shot, null)
      );
      return {
        ...quote,
        projectId: project.id,
        sceneId: scene.id,
        shotId: shot.id,
        shotVersion: shot.version || 1,
        sourceFingerprint: source.sourceFingerprint,
        approvedStoryboardAssetVersionId: source.assetVersionId
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
    const { project, scene, shot, source } = await this.#getCurrentProduceSource(
      projectId, sceneId, shotId,
      existingAttempt ? { ...input, expectedVersion: existingProject.version } : input,
      actorContext
    );
    await this.repository.mutateForActor(project.id, actorContext, draft => {
      const replay = draft.generationAttempts.find(item => item.id === attemptId);
      if (replay) return draft;
      assertExpectedVersion(draft, input.expectedVersion);
      const located = findShot(draft, shot.id);
      if (!located || located.scene.id !== scene.id
        || located.shot.approvedStoryboardSource?.sourceFingerprint !== source.sourceFingerprint) {
        throw new CinematicError('cinematic_storyboard_source_changed', 'The approved Storyboard source changed before generation.', 409);
      }
      draft.generationAttempts.push({
        id: attemptId,
        operation: 'cinematic_draft_clip',
        sceneId: scene.id,
        shotId: shot.id,
        attemptNumber: draft.generationAttempts.filter(item => item.shotId === shot.id
          && item.operation === 'cinematic_draft_clip').length + 1,
        idempotencyKey,
        generationJobId: null,
        providerTaskId: null,
        quoteId: input.estimateId,
        reservationId: null,
        outputAssetIds: [],
        approvedStoryboardAssetVersionId: source.assetVersionId,
        sourceFingerprint: source.sourceFingerprint,
        downstreamSourceStatus: 'current',
        status: 'preparing',
        reviewDecision: 'pending',
        createdAt: new Date().toISOString()
      });
      draft.status = 'producing';
      draft.version += 1;
      return draft;
    });
    let task;
    try {
      task = await this.videoGenerationService.submit(
        { ...buildCinematicVideoRequest(input, project, shot, source), idempotencyKey, estimateId: input.estimateId },
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
      attempt.quoteId = task.estimateId || input.estimateId;
      attempt.providerId = task.providerId;
      attempt.modelId = task.modelId;
      attempt.status = task.status;
      if (task.outputAsset?.id) attempt.outputAssetIds = [task.outputAsset.id];
      if (task.status === 'failed') draft.status = 'failed_recoverable';
      draft.version += 1;
      return draft;
    });
    return { attemptId, task };
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
    if (task.status !== 'completed' || task.billingStatus !== 'captured' || !task.outputAsset) {
      throw new CinematicError('cinematic_video_attempt_not_ready', 'The Video Attempt is not completed and settled.', 409);
    }
    return this.repository.mutateForActor(projectId, actorContext, draft => {
      assertExpectedVersion(draft, input.expectedVersion);
      const current = findShot(draft, shotId);
      const target = draft.generationAttempts.find(item => item.id === attemptId && item.shotId === shotId);
      if (!current || current.scene.id !== sceneId || !target) {
        throw new CinematicError('cinematic_video_attempt_not_found', 'Video Attempt not found.', 404);
      }
      if (target.sourceFingerprint !== current.shot.approvedStoryboardSource?.sourceFingerprint
        || target.downstreamSourceStatus === 'source_changed') {
        throw new CinematicError('cinematic_video_source_stale', 'The Storyboard source changed after this Video Attempt.', 409);
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
      current.shot.approvedVideoAttemptId = target.id;
      current.shot.approvedVideoSourceFingerprint = target.sourceFingerprint;
      draft.status = 'review';
      draft.version += 1;
      return buildProduceContext(draft, current.scene, current.shot);
    });
  }

  async #getCurrentProduceSource(projectId, sceneId, shotId, input, actorContext) {
    const project = await this.getProject(projectId, actorContext);
    assertExpectedVersion(project, input.expectedVersion);
    const located = findShot(project, shotId);
    if (!located || located.scene.id !== sceneId) {
      throw new CinematicError('cinematic_shot_not_found', 'Produce Shot not found.', 404);
    }
    const source = located.shot.approvedStoryboardSource;
    if (!source) throw new CinematicError('cinematic_storyboard_source_required', 'Approve a Storyboard source before generating video.', 409);
    if (Number(input.expectedShotVersion) !== Number(located.shot.version || 1)
      || String(input.sourceFingerprint || '') !== source.sourceFingerprint) {
      throw new CinematicError('cinematic_storyboard_source_changed', 'The approved Storyboard source changed before generation.', 409);
    }
    return { project, scene: located.scene, shot: located.shot, source };
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
      shot.approvedStoryboardSource = undefined;
      shot.approvedStoryboardAttemptId = undefined;
      if (previousSource) markSourceChanged(project, shot, previousSource.sourceFingerprint);
      scene.durationMs = scene.shots.reduce((total, item) => total + item.durationMs, 0);
      project.status = 'planned';
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
      const timeline = normalizeTimeline(input, project);
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
    if (!timeline.exportEligible) {
      throw new CinematicError('cinematic_export_sources_incomplete', 'Every Timeline entry requires a current approved video source.', 409, {
        blockingEntries: timeline.entries.filter(entry => entry.downstreamSourceStatus !== 'current').map(entry => entry.shotId)
      });
    }
    return {
      exportId: createPrefixedId('cineexport'),
      projectId: project.id,
      projectVersion: project.version,
      timelineVersionId: timeline.id,
      aspectRatio: project.aspectRatio,
      durationMs: timeline.durationMs,
      entries: structuredClone(timeline.entries),
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
    return this.videoCapabilities.getPublicCatalog({ includeResearch: true });
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
  if (!storyBrief || storyBrief.length > 600) throw new CinematicError('cinematic_story_brief_invalid', 'Story brief is required and must not exceed 600 characters.');
  if (creativeDirection.length > 800) throw new CinematicError('cinematic_creative_direction_invalid', 'Creative direction must not exceed 800 characters.');
  if (!DURATIONS.has(durationSeconds)) throw new CinematicError('cinematic_duration_invalid', 'Duration must be 20, 30, 45 or 60 seconds.');
  const castPlanningMode = pick(input.castPlanningMode, ['ai-recommended', 'solo', 'duo', 'manual'], 'ai-recommended');
  return {
    title,
    format: 'short-film',
    platform: pick(input.platform, ['tiktok', 'youtube-shorts', 'reels', 'multi-platform'], 'tiktok'),
    durationSeconds,
    storyBrief,
    creativeDirection,
    genre: pick(input.genre, ['drama', 'romance', 'comedy', 'thriller', 'fashion'], 'drama'),
    audienceFeeling: pick(input.audienceFeeling, ['moved', 'excited', 'curious', 'uplifted', 'surprised'], 'moved'),
    pacing: pick(input.pacing, ['slow', 'balanced', 'fast'], 'balanced'),
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

function normalizeCast(input = {}, authorizedCharacter = null) {
  const characterProfileId = String(input.characterProfileId || '').trim();
  const characterProfileVersionId = String(input.characterProfileVersionId || '').trim();
  if (!characterProfileId || !characterProfileVersionId) {
    throw new CinematicError('cinematic_character_version_required', 'A pinned Character Profile Version is required.');
  }
  const id = String(input.assignmentId || '').trim() || `cinecast_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return {
    id,
    characterProfileId,
    characterProfileVersionId,
    portraitUrl: authorizedCharacter?.authorizedCharacterFaceReferenceUrl
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
    identityReady: authorizedCharacter?.identityPack?.status === 'identity_pack_ready',
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
    looks: Array.isArray(input.looks) ? structuredClone(input.looks).slice(0, 12) : [],
    active: input.active !== false,
    updatedAt: new Date().toISOString()
  };
}

function reconcileCastIdentityReadiness(project) {
  const normalized = structuredClone(project);
  for (const assignment of normalized.castAssignments || []) {
    if (assignment.identityReadinessSnapshot?.status === 'identity_pack_ready') {
      assignment.identityReady = true;
    }
  }
  return normalized;
}

function normalizeStoryPlan(input = {}, project) {
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
      return {
        ...(existing ? structuredClone(existing) : {}),
        id: shotId,
        version: Number(existing?.version || 1),
        orderKey: shotIndex + 1,
        title: bounded(shotInput.title, 100, `Shot ${shotIndex + 1}`),
        purpose: bounded(shotInput.purpose, 500, ''),
        durationMs,
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
        castAssignmentIds: normalizeStringList(shotInput.castAssignmentIds, 6),
        wardrobeLookIds: normalizeStringList(shotInput.wardrobeLookIds, 12),
        continuityNotes: normalizeStringList(shotInput.continuityNotes, 20),
        storyboardStatus: existing?.storyboardStatus || 'draft'
      };
    });
    return {
      id: sceneId,
      version: Number(existingScene?.version || 1),
      orderKey: sceneIndex + 1,
      beatId: bounded(sceneInput.beatId, 100, beats[0]?.id || ''),
      title: bounded(sceneInput.title, 120, `Scene ${sceneIndex + 1}`),
      purpose: bounded(sceneInput.purpose, 800, ''),
      storyChange: bounded(sceneInput.storyChange, 800, ''),
      location: bounded(sceneInput.location, 300, ''),
      time: bounded(sceneInput.time, 120, ''),
      emotionalStart: bounded(sceneInput.emotionalStart, 240, ''),
      emotionalEnd: bounded(sceneInput.emotionalEnd, 240, ''),
      transitionIntent: bounded(sceneInput.transitionIntent, 160, 'cut'),
      castAssignmentIds: normalizeStringList(sceneInput.castAssignmentIds, 6),
      wardrobeLookIds: normalizeStringList(sceneInput.wardrobeLookIds, 12),
      blocking: bounded(sceneInput.blocking, 500, ''),
      lighting: bounded(sceneInput.lighting, 500, ''),
      performance: bounded(sceneInput.performance, 500, ''),
      audioIntent: bounded(sceneInput.audioIntent, 500, ''),
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
  return {
    objective: bounded(input.objective, 1000, ''),
    logline: bounded(input.logline, 500, ''),
    beats,
    emotionalArc: bounded(input.emotionalArc, 1000, ''),
    warnings: normalizeStringList(input.warnings, 20),
    scenes
  };
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
      emotionalStart: bounded(beat?.emotionalStart, 240, ''),
      emotionalEnd: bounded(beat?.emotionalEnd, 240, ''),
      targetDurationMs: Math.max(0, Math.round(Number(beat?.targetDurationMs) || 0)),
      sceneIds: normalizeStringList(beat?.sceneIds, 24)
    };
  });
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
}

function assertStoryPlanApprovalReady(plan, project) {
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

function buildCinematicVideoRequest(input, project, shot, source) {
  const durationSeconds = Math.max(1, Math.round(Number(input.durationSeconds || shot.durationMs / 1000)));
  return {
    providerId: String(input.providerId || ''),
    modelId: String(input.modelId || ''),
    operation: 'image_to_video',
    prompt: String(input.prompt || shot.prompt || '').trim(),
    aspectRatio: String(input.aspectRatio || project.aspectRatio || '9:16'),
    resolution: String(input.resolution || '720p'),
    durationSeconds,
    audioMode: String(input.audioMode || 'none'),
    referenceImageUrl: source.imageUrl
  };
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
      && attempt.sourceFingerprint === previousFingerprint) {
      attempt.downstreamSourceStatus = 'source_changed';
    }
  }
  if (shot.approvedVideoSourceFingerprint === previousFingerprint) {
    shot.approvedVideoAttemptId = null;
    shot.approvedVideoSourceFingerprint = null;
  }
  for (const timeline of project.timelineVersions || []) {
    for (const entry of timeline.entries || []) {
      if (entry.shotId === shot.id && entry.sourceFingerprint === previousFingerprint) {
        entry.downstreamSourceStatus = 'source_changed';
        timeline.status = 'stale';
      }
    }
  }
}

function buildProduceContext(project, scene, shot) {
  const attempts = (project.generationAttempts || []).filter(attempt => (
    attempt.shotId === shot.id
    && ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt.operation)
  ));
  const source = shot.approvedStoryboardSource || null;
  return {
    projectId: project.id,
    projectVersion: project.version,
    sceneId: scene.id,
    shotId: shot.id,
    shotVersion: shot.version || 1,
    approvedStoryboardSource: source,
    generationEligible: Boolean(source),
    blockingReason: source ? null : 'cinematic_storyboard_source_required',
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
      outputAsset: attempt.outputAsset || null,
      reviewDecision: attempt.reviewDecision || 'pending',
      downstreamSourceStatus: attempt.downstreamSourceStatus || (
        attempt.sourceFingerprint === source?.sourceFingerprint ? 'current' : 'source_changed'
      )
    })),
    timelineDependencyStatus: (project.timelineVersions || []).some(timeline => (
      (timeline.entries || []).some(entry => entry.shotId === shot.id && entry.downstreamSourceStatus === 'source_changed')
    )) ? 'source_changed' : 'current'
  };
}

function normalizeTimeline(input, project) {
  const requestedEntries = Array.isArray(input.entries) ? input.entries : [];
  if (!requestedEntries.length) throw new CinematicError('cinematic_timeline_invalid', 'Timeline requires at least one entry.');
  const seen = new Set();
  const entries = requestedEntries.map((entry, index) => {
    const located = findShot(project, entry.shotId);
    if (!located || seen.has(entry.shotId)) throw new CinematicError('cinematic_timeline_invalid', 'Timeline Shot is missing or duplicated.');
    seen.add(entry.shotId);
    const approvedAttemptId = located.shot.approvedVideoAttemptId || entry.approvedVideoAttemptId || null;
    const attempt = (project.generationAttempts || []).find(item => item.id === approvedAttemptId && item.shotId === entry.shotId);
    const sourceCurrent = Boolean(attempt
      && attempt.status === 'approved'
      && attempt.sourceFingerprint === located.shot.approvedStoryboardSource?.sourceFingerprint
      && attempt.downstreamSourceStatus !== 'source_changed');
    const trimInMs = Math.max(0, Math.round(Number(entry.trimInMs || 0)));
    const trimOutMs = Math.min(located.shot.durationMs, Math.round(Number(entry.trimOutMs ?? located.shot.durationMs)));
    if (trimOutMs <= trimInMs) throw new CinematicError('cinematic_timeline_trim_invalid', 'Timeline trim-out must be after trim-in.');
    return {
      id: String(entry.id || '').trim() || createPrefixedId('cineclip'),
      orderKey: index + 1,
      sceneId: located.scene.id,
      shotId: located.shot.id,
      approvedVideoAttemptId: approvedAttemptId,
      sourceFingerprint: attempt?.sourceFingerprint || located.shot.approvedStoryboardSource?.sourceFingerprint || null,
      trimInMs,
      trimOutMs,
      durationMs: trimOutMs - trimInMs,
      transition: pick(entry.transition, ['cut', 'dissolve', 'fade'], 'cut'),
      downstreamSourceStatus: sourceCurrent ? 'current' : attempt ? 'source_changed' : 'source_unavailable'
    };
  });
  return {
    id: createPrefixedId('cinetimeline'),
    version: project.timelineVersions.length + 1,
    parentVersionId: project.activeTimelineVersionId || null,
    status: 'active',
    entries,
    durationMs: entries.reduce((total, entry) => total + entry.durationMs, 0),
    exportEligible: entries.every(entry => entry.downstreamSourceStatus === 'current'),
    createdAt: new Date().toISOString()
  };
}

const SHOT_DIRECTION_FIELDS = [
  'title', 'purpose', 'durationMs', 'framing', 'cameraAngle', 'cameraMovement',
  'lensIntent', 'blocking', 'performance', 'gaze', 'lighting', 'environment',
  'audioIntent', 'prompt'
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
    if (field === 'prompt' && !value) throw new CinematicError('cinematic_shot_prompt_required', 'Shot prompt is required.');
    normalized[field] = value;
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
