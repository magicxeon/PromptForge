import crypto from 'node:crypto';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { characterLookService } from '../character-profiles/CharacterLookService.js';
import { resolveReferenceForProvider } from './referenceUtils.js';
import {
  normalizeVideoExecutionSelection,
  assertFirstFramePolicy,
  videoCapabilityRegistry
} from './VideoCapabilityRegistry.js';
import { VideoProviderTaskService } from './VideoProviderTaskService.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { cinematicVideoAssetService } from '../assets/CinematicVideoAssetService.js';
import {
  createStoryboardSourceFingerprint,
  loadVerifiedStoryboardAssetContent,
  verifyStoryboardAssetContent
} from '../assets/CinematicStoryboardAssetService.js';
import { normalizeProviderOutputProvenance } from './ProviderOutputProvenance.js';
import { GeminiVeoProvider } from '../../providers/GeminiVeoProvider.js';
import { GeminiOmniProvider } from '../../providers/GeminiOmniProvider.js';
import { ModelArkSeedanceProvider } from '../../providers/ModelArkSeedanceProvider.js';
import { VideoProviderAdapterRegistry } from '../../providers/VideoProviderAdapterRegistry.js';
import { reconcileVideoDuration } from './VideoDurationReconciliation.js';
import {
  fingerprintVideoReferencePlan,
  appendLookLegend,
  normalizeVideoReferences,
  sanitizeVideoReferences
} from './VideoReferencePlan.js';
import { resolveModelArkCredentialScope } from '../../providers/modelArkCredentialScope.js';
import { cinematicFirstFrameTransportService } from '../assets/CinematicFirstFrameTransportService.js';
import { resolveVideoProviderWorkflow } from '../admin-configuration/ProviderAvailabilityPolicyService.js';
import { PlaygroundVideoReferenceService } from './PlaygroundVideoReferenceService.js';
import { trustedGeneratedSourceService, generatedCastSourceFingerprint } from './TrustedGeneratedSourceService.js';
import { assertGeneratedReferenceAllowed } from '../../config/generatedReferencePolicy.js';
import { loadVideoReferenceAssetContent } from '../assets/VideoReferenceAssetContent.js';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

export class VideoGenerationApplicationService {
  constructor({
    capabilityRegistry = videoCapabilityRegistry,
    creditService = creditApplicationService,
    characterService = characterUsageService,
    lookService = characterLookService,
    taskRepository = videoProviderTaskRepository,
    assetRepository = assetRepo,
    storyboardAssetContentVerifier = verifyStoryboardAssetContent,
    storyboardAssetContentLoader = loadVerifiedStoryboardAssetContent,
    videoReferenceContentLoader = loadVideoReferenceAssetContent,
    referenceResolver = resolveReferenceForProvider,
    modelArkCredentialScopeResolver = resolveModelArkCredentialScope,
    firstFrameTransport = cinematicFirstFrameTransportService,
    playgroundReferenceContentLoader,
    playgroundHistoryRepository,
    trustedSourceService = trustedGeneratedSourceService,
    providerTaskService = null,
    testingEnabled = process.env.NODE_ENV !== 'production'
      && process.env.VIDEO_PLAYGROUND_TESTING_ENABLED !== 'false'
  } = {}) {
    this.capabilityRegistry = capabilityRegistry;
    this.creditService = creditService;
    this.characterService = characterService;
    this.lookService = lookService;
    this.taskRepository = taskRepository;
    this.assetRepository = assetRepository;
    this.storyboardAssetContentVerifier = storyboardAssetContentVerifier;
    this.storyboardAssetContentLoader = storyboardAssetContentLoader;
    this.videoReferenceContentLoader = videoReferenceContentLoader;
    this.referenceResolver = referenceResolver;
    this.modelArkCredentialScopeResolver = modelArkCredentialScopeResolver;
    this.firstFrameTransport = firstFrameTransport;
    this.trustedSources = trustedSourceService;
    this.playgroundReferences = new PlaygroundVideoReferenceService({ assetRepository, lookService,
      characterService, referenceResolver, firstFrameTransport, contentLoader: playgroundReferenceContentLoader,
      historyRepository: playgroundHistoryRepository });
    this.testingEnabled = testingEnabled;
    if (providerTaskService) {
      this.providerTaskService = providerTaskService;
    } else {
      const omniProvider = new GeminiOmniProvider();
      const adapterRegistry = new VideoProviderAdapterRegistry({
        adapters: {
          gemini: new GeminiVeoProvider(),
          modelark: new ModelArkSeedanceProvider()
        },
        modelAdapters: {
          'gemini/gemini-omni-1.1-flash': omniProvider,
          'gemini/gemini-omni-flash-preview': omniProvider
        }
      });
      this.providerTaskService = new VideoProviderTaskService({
        repository: taskRepository,
        capabilityRegistry,
        adapterRegistry,
        mediaPersister: cinematicVideoAssetService
      });
    }
  }

  getCatalog(workflowContext = null) {
    return this.capabilityRegistry.getPublicCatalog({
      includeTesting: this.testingEnabled,
      workflow: resolveVideoProviderWorkflow(workflowContext)
    });
  }

  async listTrustedSources(actorContext, query = {}) {
    return this.trustedSources.list(actorContext, query);
  }

  async quote(input, actorContext, workflowContext = null) {
    const workflow = normalizeWorkflowContext(workflowContext);
    const { request, model, durationReconciliation, playgroundPlan } = await this.#prepareValidatedRequest(
      input, actorContext, workflow
    );
    await this.#validateSource(request, actorContext, { resolveMedia: false, workflow, model, playgroundPlan });
    await this.providerTaskService.preflightTask?.(request, { allowTesting: this.testingEnabled });
    const estimate = await this.creditService.estimateVideo({
      userId: actorContext.userId,
      model,
      request,
      generationMode: workflow.generationMode
    });
    const account = await this.creditService.getAccount(actorContext.userId);
    return {
      estimate,
      account: {
        availableCredits: account.availableCredits,
        canAfford: account.availableCredits >= estimate.estimatedCredits
      },
      selection: publicSelection(request),
      requestFingerprint: request.requestFingerprint,
      ...(durationReconciliation ? { durationReconciliation } : {})
    };
  }

  async submit(input, actorContext, workflowContext = null) {
    const workflow = normalizeWorkflowContext(workflowContext);
    const { request, model, playgroundPlan } = await this.#prepareValidatedRequest(input, actorContext, workflow);
    if (input.requestFingerprint && String(input.requestFingerprint) !== request.requestFingerprint) {
      throw videoError('video_quote_request_changed', 'Video request changed after the quote was prepared.', 409);
    }
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const replay = await this.taskRepository.findByIdempotencyKey(actorContext.userId, idempotencyKey);
    if (replay) return replay;
    const source = await this.#validateSource(request, actorContext, { resolveMedia: true, workflow, model, playgroundPlan });
    await this.providerTaskService.preflightTask?.({ ...request, referenceImage: source.referenceImage,
      lastFrameImage: source.lastFrameImage, referenceImages: source.referenceImages }, {
      allowTesting: this.testingEnabled
    });
    const taskId = deterministicTaskId(actorContext.userId, idempotencyKey);
    const requestId = `video:${taskId}`;
    const generationRequest = {
      requestId,
      routingMode: 'advanced',
      qualityTier: 'video',
      requestedProviderId: request.providerId,
      requestedModelId: request.modelId,
      resolution: request.resolution,
      aspectRatio: request.aspectRatio,
      referenceCount: request.referenceImageCount,
      outputCount: 1,
      generationMode: workflow.generationMode,
      operation: request.operation,
      commercialOperation: request.commercialOperation,
      inputMode: request.inputMode,
      durationSeconds: request.durationSeconds,
      plannedDurationSeconds: request.plannedDurationSeconds,
      audioMode: request.audioMode,
      referencePlanFingerprint: request.referencePlanFingerprint,
      developmentPocUnverified: request.developmentPocUnverified === true,
      developmentPocCredits: request.developmentPocCredits
    };
    const financialAuthorization = await this.creditService.validateAndReserveForRequest({
      userId: actorContext.userId,
      estimateId: input.estimateId,
      generationRequest,
      metadata: { jobId: taskId, requestId, capability: workflow.capability }
    });
    const submitted = await this.providerTaskService.submitTask({
      ...request,
      id: taskId,
      idempotencyKey,
      prompt: request.prompt,
      referenceImage: source.referenceImage,
      lastFrameImage: source.lastFrameImage,
      referenceImages: source.referenceImages,
      providerReferenceRegistrations: source.providerReferenceRegistrations,
      referenceTransport: source.referenceTransport || null,
      referenceTransports: source.referenceTransports || [],
      characterAttributions: source.characterAttributions,
      requestFingerprint: request.requestFingerprint,
      pricingFingerprint: financialAuthorization.estimate.estimateId,
      reservationId: financialAuthorization.reservation?.reservationId || null,
      qualificationAuthorizationId: financialAuthorization.authorization?.authorizationId || null,
      billingStatus: financialAuthorization.billingStatus || (financialAuthorization.reservation ? 'reserved' : null),
      estimateId: financialAuthorization.estimate.estimateId,
      correlationId: taskId,
      projectId: workflow.projectId,
      sceneId: workflow.sceneId,
      shotId: workflow.shotId,
      generationAttemptId: workflow.generationAttemptId || taskId
    }, actorContext, { allowTesting: this.testingEnabled });
    if (playgroundPlan?.trusted || request.references.some(row => row.trustedGenerationId)) await this.trustedSources.recordRejection({ ...submitted,
      submittedRequest: { references: request.references } }, actorContext).catch(() => {
      console.warn('[Video] Trusted-source rejection evidence could not be saved');
    });
    if (submitted.status === 'failed'
      && submitted.providerError?.providerBillableState === 'not_billable'
      && financialAuthorization.reservation?.reservationId) {
      await this.creditService.refundForJob({
        userId: actorContext.userId,
        reservationId: financialAuthorization.reservation.reservationId,
        jobId: taskId,
        reasonCode: 'video_provider_submit_failed'
      });
      return this.taskRepository.update(taskId, draft => { draft.billingStatus = 'refunded'; });
    }
    return this.taskRepository.update(taskId, draft => {
      draft.reservationId = financialAuthorization.reservation?.reservationId || null;
      draft.qualificationAuthorizationId = financialAuthorization.authorization?.authorizationId || null;
      draft.estimateId = financialAuthorization.estimate.estimateId;
      draft.estimatedCredits = financialAuthorization.estimate.estimatedCredits;
      draft.developmentPocUnverified = request.developmentPocUnverified === true;
      draft.developmentPocCredits = request.developmentPocCredits;
      draft.developmentPocWarningCode = request.developmentPocWarningCode;
      draft.billingStatus = financialAuthorization.billingStatus || (financialAuthorization.reservation ? 'reserved' : null);
    });
  }

  async getAndPoll(taskId, actorContext) {
    const owned = await this.taskRepository.findForActor(taskId, actorContext);
    if (!owned) throw videoError('video_task_not_found', 'Video task not found.', 404);
    const task = TERMINAL.has(owned.status) ? owned : await this.providerTaskService.pollTask(taskId);
    return this.#settleTask(task);
  }

  async getStoredTaskSummaries(taskIds, actorContext) {
    if (!actorContext?.userId) throw videoError('actor_context_required', 'Actor context is required.', 401);
    return this.taskRepository.findManyForActor(taskIds, actorContext);
  }

  async resumeRecoverable() {
    const recovered = await this.providerTaskService.resumeRecoverable();
    const results = [];
    for (const task of recovered) {
      try {
        results.push(await this.#settleTask(task));
      } catch (error) {
        results.push(await this.taskRepository.update(task.id, draft => {
          draft.status = 'reconciliation_required';
          draft.providerError = {
            code: error?.code || 'video_credit_settlement_failed',
            category: 'credits',
            retryable: Boolean(error?.retryable),
            providerBillableState: task.providerError?.providerBillableState || 'unknown'
          };
          draft.completedAt = draft.completedAt || new Date().toISOString();
        }));
      }
    }
    return results;
  }

  async #settleTask(inputTask) {
    let task = inputTask;
    if (task.submittedRequest?.references?.some(row => row.sourceKind === 'trusted_generated' || row.trustedGenerationId)) {
      await this.trustedSources.recordRejection(task, { userId: task.ownerUserId }).catch(() => {
        console.warn('[Video] Trusted-source rejection evidence could not be saved');
      });
    }
    const userId = String(task.ownerUserId || '').trim();
    if (!userId) {
      throw videoError('video_task_owner_missing', 'Video task owner is unavailable for settlement.', 409);
    }
    if (task.status === 'completed' && task.billingStatus === 'reserved') {
      await this.creditService.captureForJob({
        userId,
        reservationId: task.reservationId,
        jobId: task.id,
        metadata: { providerUsage: task.providerUsage, mediaType: 'video' }
      });
      task = await this.taskRepository.update(task.id, draft => { draft.billingStatus = 'captured'; });
    } else if (task.status === 'completed' && task.billingStatus === 'refunded') {
      task = await this.taskRepository.update(task.id, draft => {
        draft.status = 'reconciliation_required';
        draft.providerError = {
          code: 'video_credit_settlement_conflict',
          category: 'credits',
          retryable: false,
          providerBillableState: 'billable'
        };
      });
    } else if (['failed', 'cancelled', 'expired'].includes(task.status)
      && task.billingStatus === 'reserved'
      && task.providerError?.providerBillableState === 'not_billable') {
      await this.creditService.refundForJob({
        userId,
        reservationId: task.reservationId,
        jobId: task.id,
        reasonCode: `video_${task.status}`
      });
      task = await this.taskRepository.update(task.id, draft => { draft.billingStatus = 'refunded'; });
    }
    return task;
  }

  async listRecent(actorContext, { limit = 6 } = {}) {
    const tasks = await this.taskRepository.listForActor(actorContext, { limit });
    return {
      items: tasks.map(toPublicTask),
      hasMore: false
    };
  }

  async hasDurableTaskForReservation({ userId, reservationId, jobId } = {}) {
    if (!userId || !reservationId || !jobId) return false;
    const task = await this.taskRepository.find(jobId);
    return Boolean(task
      && task.ownerUserId === userId
      && task.reservationId === reservationId);
  }

  #validateModel(request) {
    return this.capabilityRegistry.validateRequest(request, {
      allowTesting: this.testingEnabled,
      workflow: request.providerWorkflow
    });
  }

  #prepareRequest(input, workflow) {
    const request = normalizeRequest(input, workflow);
    request.providerWorkflow = resolveVideoProviderWorkflow(workflow);
    const resolved = this.capabilityRegistry.resolve(request.providerId, request.modelId);
    if (!resolved) throw videoError('video_model_unknown', 'Video model is unknown.');
    request.modelId = resolved.modelId;
    let durationReconciliation = null;
    if (workflow.capability === 'cinematic' && request.plannedDurationSeconds) {
      durationReconciliation = reconcileVideoDuration({
        model: resolved,
        plannedDurationSeconds: request.plannedDurationSeconds,
        requestedDurationSeconds: request.durationSeconds,
        resolution: request.resolution,
        referenceImageCount: request.referenceImageCount
      });
      request.durationSeconds = durationReconciliation.renderDurationSeconds;
      request.durationReconciliation = durationReconciliation;
    }
    return { request, resolved, durationReconciliation };
  }

  async #prepareValidatedRequest(input, actorContext, workflow) {
    const sourceModel = this.capabilityRegistry.resolve(input.providerId, input.modelId);
    const sourcePolicy = sourceModel?.playgroundReferencePolicy;
    assertFirstFramePolicy(input, sourceModel);
    if (workflow.capability === 'playground_video' && Array.isArray(input.references)
      && (input.references.length > Math.min(12, sourceModel?.referenceImageLimit || 0)
        || (input.references.length > 1 && !sourceModel?.supportsOrderedImageReferences))) {
      throw videoError('video_multiple_references_unsupported', 'The reference count exceeds this model adapter limit.');
    }
    const restricted = workflow.capability === 'playground_video' && sourcePolicy?.kind === 'trusted_generated_only';
    const compositionUpload = restricted && sourcePolicy.allowImageReferenceUploads === true
      && input.operation === 'image_to_video' && input.inputMode === 'multimodal_reference'
      && input.referencePlanVersion === 'playground-reference-v1'
      && !input.characterProfileId && !input.characterProfileVersionId && !input.referenceImageUrl
      && Array.isArray(input.references) && input.references.length > 0
      && input.references.every(row => row.role === 'reference_image' && row.purpose === 'image_reference'
        && typeof row.referenceImageUrl === 'string' && row.referenceImageUrl.startsWith('/outputs/')
        && !row.generationId && !row.characterProfileId && !row.characterLookId && !row.characterLookVersionId);
    const hasInputs = input.references?.length || input.referenceImageUrl || input.characterProfileId || input.characterProfileVersionId;
    const needsReference = input.inputMode && input.inputMode !== 'text_to_video'
      || ['image_to_video', 'character_to_video'].includes(input.operation);
    if (restricted && hasInputs && input.inputMode === 'text_to_video') {
      throw videoError('video_trusted_source_required', 'Text-only mode cannot include image references.');
    }
    if (workflow.capability === 'playground_video' && input.referencePlanVersion
      && !['playground-reference-v1', 'playground-trusted-v1'].includes(input.referencePlanVersion)) {
      throw videoError('video_reference_plan_version_invalid', 'Unsupported Playground reference plan version.');
    }
    const playgroundPlan = restricted && !compositionUpload && (hasInputs || needsReference)
      ? await this.trustedSources.prepare(input, actorContext)
      : workflow.capability === 'playground_video' && input.referencePlanVersion === 'playground-reference-v1'
        ? await this.playgroundReferences.prepare(input, actorContext) : null;
    const { request, resolved, durationReconciliation } = this.#prepareRequest(playgroundPlan?.input || input, workflow);
    if (playgroundPlan) request.prompt = appendLookLegend(request.prompt, request.references);
    if (playgroundPlan && request.referenceImageCount > 1 && resolved.supportsOrderedImageReferences !== true) {
      throw videoError('video_multiple_references_unsupported', 'This model adapter does not support multiple image references.');
    }
    request.providerCredentialScope = request.providerId === 'modelark'
      ? this.modelArkCredentialScopeResolver()
      : null;
    if (request.providerId === 'modelark'
      && resolved.allowAnySourceProvider !== true && resolved.trustedGeneratedImageSource?.requiresSameCredentialScope === true
      && !request.providerCredentialScope) {
      throw videoError(
        'video_provider_credentials_missing',
        'ModelArk credentials are required to verify the Seedream source account.',
        409
      );
    }
    if (workflow.capability === 'cinematic' && request.references.length) {
      request.referenceAuthority = await this.#validateCinematicReferenceAssets(
        request.references, actorContext, resolved
      );
      request.referenceAuthorityFingerprint = fingerprintReferenceAuthority(request.referenceAuthority);
      request.referencePlanFingerprint = fingerprintVideoReferencePlan(request.references, request.inputMode);
    }
    const model = this.#validateModel(request);
    if (playgroundPlan) this.playgroundReferences.validateModel(playgroundPlan, model);
    request.developmentPocUnverified = model.developmentPocUnverified === true;
    request.developmentPocCredits = model.developmentPocUnverified === true
      ? Number(model.developmentPocCredits || 1)
      : null;
    request.developmentPocWarningCode = model.developmentPocWarningCode || null;
    request.requestFingerprint = fingerprintPreparedRequest(request);
    return { request, model, durationReconciliation, playgroundPlan };
  }

  async #validateSource(request, actorContext, { resolveMedia, workflow, model, playgroundPlan }) {
    if (playgroundPlan?.trusted) {
      const source = await this.trustedSources.resolve(playgroundPlan);
      return resolveMedia ? source : emptyResolvedSource();
    }
    if (playgroundPlan) return resolveMedia
      ? this.playgroundReferences.resolve(playgroundPlan, request, actorContext, model)
      : { ...emptyResolvedSource(), characterAttributions: playgroundPlan.attributions };
    if (request.inputMode === 'text_to_video') return emptyResolvedSource();
    if (request.inputMode === 'image_to_video' || request.inputMode === 'first_last_frame'
      || (request.inputMode === 'multimodal_reference' && !request.characterProfileId)) {
      if (!request.references.length) throw videoError('video_reference_required', 'Choose an image before generating this video.');
      if (workflow?.capability === 'cinematic') {
        request.referenceAuthority ||= await this.#validateCinematicReferenceAssets(
          request.references, actorContext, model
        );
      }
      if (!resolveMedia) return emptyResolvedSource();
      const resolved = [];
      let referenceTransport = null;
      const referenceTransports = [];
      for (const reference of request.references) {
        let value;
        if (workflow?.capability === 'cinematic' && request.providerId === 'modelark'
          && (reference.role === 'first_frame' || request.inputMode === 'multimodal_reference')) {
          const sourceAsset = await this.assetRepository.findByIdForOwner(reference.assetId, actorContext.userId);
          const expectedContentHash = request.referenceAuthority.references?.find(item => item.assetId === reference.assetId)?.contentHash
            || request.referenceAuthority.contentHash;
          const sketchComposition = sourceAsset?.metadata?.storyboardRenderStyle === 'concept_sketch_v1'
            && reference.role === 'reference_image' && reference.purpose === 'sketch_composition';
          const localLook = model.allowAnySourceProvider === true && !reference.trustedGenerationId
            && ['character_look', 'generated_look'].includes(reference.purpose);
          const sketchContent = sketchComposition ? await this.storyboardAssetContentLoader(sourceAsset)
            : localLook ? await this.videoReferenceContentLoader({ ...sourceAsset, contentHash: expectedContentHash }) : null;
          const result = sketchContent ? {
            value: `data:${sourceAsset.mimeType};base64,${sketchContent.bytes.toString('base64')}`,
            transport: { mode: 'base64', source: localLook ? 'approved_look' : 'approved_sketch', contentHash: sketchContent.contentHash }
          } : reference.trustedGenerationId
            ? await this.trustedSources.resolveOwnedImageWithTransport(reference.trustedGenerationId, actorContext, expectedContentHash)
            : await this.firstFrameTransport.resolve({ sourceAsset, ownerUserId: actorContext.userId, expectedContentHash });
          value = result.value;
          referenceTransport ||= result.transport;
          referenceTransports.push({ assetId: reference.assetId, ...result.transport });
        } else {
          value = await this.referenceResolver(reference.referenceImageUrl, actorContext.username, {
            ownerUserId: actorContext.userId
          });
        }
        if (!value) throw videoError('video_reference_unavailable', 'The selected image is no longer available.', 409);
        resolved.push({ role: reference.role, value });
      }
      return {
        referenceImage: request.inputMode === 'multimodal_reference' && workflow?.capability === 'cinematic'
          ? null : resolved.find(item => item.role === 'first_frame')?.value || resolved[0]?.value || null,
        lastFrameImage: resolved.find(item => item.role === 'last_frame')?.value || null,
        referenceImages: resolved
          .filter(item => !['first_frame', 'last_frame'].includes(item.role))
          .map(item => ({ role: item.role, url: item.value })),
        characterAttributions: [],
        providerReferenceRegistrations: [],
        referenceTransport,
        referenceTransports
      };
    }
    if (!request.characterProfileId || !request.characterProfileVersionId) {
      throw videoError('video_character_required', 'Choose an approved Character before generating this video.');
    }
    const context = await this.characterService.validateGenerationContext({
      purpose: 'character_usage',
      characterProfileId: request.characterProfileId,
      characterProfileVersionId: request.characterProfileVersionId,
      useCase: 'video',
      sourceType: 'playground_video',
      sourceId: request.characterProfileId
    }, actorContext);
    if (!resolveMedia) return { ...emptyResolvedSource(), characterAttributions: [context.attribution] };
    const referenceImage = await this.referenceResolver(
      { source: 'history', jobId: context.authorizedCharacterReferenceAssetId },
      actorContext.username,
      { authorizedJobIds: [context.authorizedCharacterReferenceAssetId], ownerUserId: actorContext.userId }
    ) || await this.referenceResolver(
      context.authorizedCharacterFrontReferenceUrl,
      actorContext.username,
      { authorizedImageUrls: [context.authorizedCharacterFrontReferenceUrl], ownerUserId: actorContext.userId }
    );
    if (!referenceImage) throw videoError('video_character_reference_unavailable', 'The approved Character image is no longer available.', 409);
    return {
      referenceImage,
      lastFrameImage: null,
      referenceImages: [],
      characterAttributions: [{
        characterProfileId: request.characterProfileId,
        characterProfileVersionId: request.characterProfileVersionId,
        role: 'primary'
      }]
    };
  }

  async #validateCinematicReferenceAssets(references, actorContext, model) {
    const authorities = [];
    for (const reference of references) {
      if (!reference.assetId || !reference.assetVersionId || reference.assetId !== reference.assetVersionId) {
        throw videoError('cinematic_video_reference_authority_invalid', 'The Storyboard reference Asset authority is incomplete.', 409);
      }
      let asset = await this.assetRepository.findByIdForOwner(reference.assetId, actorContext.userId);
      const isGeneratedCast = reference.purpose === 'generated_look';
      const isLook = reference.purpose === 'character_look' || isGeneratedCast;
      let approvedLook = null;
      let trustedLookSource = null;
      if (isGeneratedCast) {
        // Imported Cast Assets persist the hash in metadata; resolved Looks expose it directly.
        if (asset) asset = { ...asset, contentHash: asset.metadata?.contentHash || asset.contentHash };
        if (!model?.supportsCinematicLookReferences || reference.role !== 'reference_image'
          || !reference.trustedGenerationId || !reference.castAssignmentId || reference.characterProfileId
          || reference.characterLookId || reference.characterLookVersionId) {
          throw videoError('cinematic_video_reference_authority_invalid', 'Select the generated Cast sheet again.', 409);
        }
        const source = await this.trustedSources.describeOwnedImage(reference.trustedGenerationId, actorContext);
        trustedLookSource = source;
        if (!asset || asset.metadata?.trustedGenerationId !== source.id || asset.contentHash !== source.contentHash
          || reference.contentHash !== source.contentHash || asset.publicUrl !== source.publicUrl) {
          throw videoError('cinematic_video_reference_content_changed', 'The generated Cast sheet changed.', 409);
        }
        approvedLook = { asset, sourceFingerprint: generatedCastSourceFingerprint(source.id, source.contentHash) };
      } else if (isLook) {
        if (!model?.supportsCinematicLookReferences || reference.role !== 'reference_image'
          || !reference.characterProfileId || !reference.characterLookId || !reference.characterLookVersionId) {
          throw videoError('cinematic_video_reference_authority_invalid', 'The Character Look reference authority is incomplete.', 409);
        }
        approvedLook = await this.lookService.resolveApprovedSheetReference(reference.characterProfileId,
          reference.characterLookId, reference.characterLookVersionId, actorContext);
        if (approvedLook.asset.id !== reference.assetId || approvedLook.asset.contentHash !== reference.contentHash
          || (approvedLook.trustedGenerationId || null) !== (reference.trustedGenerationId || null)) {
          throw videoError('cinematic_video_reference_content_changed', 'The approved Character Look changed.', 409);
        }
        asset = approvedLook.asset;
      }
      if (isLook && model?.trustedGeneratedImageSource && model?.allowAnySourceProvider !== true) {
        if (!reference.trustedGenerationId) {
          throw videoError('video_provider_synthetic_character_source_required', 'This model requires eligible original Seedream Look Sheets.', 409);
        }
        trustedLookSource ||= await this.trustedSources.describeOwnedImage(reference.trustedGenerationId, actorContext);
        if (trustedLookSource.contentHash !== asset?.contentHash || trustedLookSource.publicUrl !== asset?.publicUrl) {
          throw videoError('cinematic_video_reference_content_changed', 'The Look Sheet does not match its trusted original.', 409);
        }
      }
      const sketchComposition = asset?.metadata?.storyboardRenderStyle === 'concept_sketch_v1'
        && reference.role === 'reference_image' && reference.purpose === 'sketch_composition'
        && model?.supportsCinematicLookReferences === true;
      if (reference.purpose === 'sketch_composition' && !sketchComposition) {
        throw videoError('cinematic_video_reference_authority_invalid', 'Select an approved generated storyboard sketch.', 409);
      }
      assertGeneratedReferenceAllowed(trustedLookSource || { providerOutputProvenance: asset?.metadata?.providerOutputProvenance });
      if (!isLook && !sketchComposition && model?.trustedGeneratedImageSource && asset?.assetType === 'cinematic_storyboard_source') {
        // Derive authority from the owned immutable Asset, never from a browser URL.
        const generationId = asset.sourceJobId;
        if (!generationId || (reference.trustedGenerationId && reference.trustedGenerationId !== generationId)) {
          throw videoError('cinematic_video_reference_authority_invalid', 'The Storyboard original source binding is invalid.', 409);
        }
        const original = await this.trustedSources.describeOwnedImage(generationId, actorContext);
        if (original.id !== generationId || original.publicUrl !== asset.publicUrl
          || original.contentHash !== asset.metadata?.contentHash) {
          throw videoError('cinematic_video_reference_content_changed', 'The Storyboard does not match its trusted original.', 409);
        }
        reference.trustedGenerationId = generationId;
        reference.contentHash = original.contentHash;
      } else if (!isLook && reference.trustedGenerationId) {
        throw videoError('cinematic_video_reference_authority_invalid', 'This model does not use a trusted Storyboard binding.', 409);
      }
      if (!asset || asset.status === 'deleted' || asset.publicUrl !== reference.referenceImageUrl
        || (isLook ? asset.assetType !== 'character_look_sheet'
          : asset.assetType !== 'cinematic_storyboard_source' || asset.metadata?.immutable !== true)) {
        throw videoError('cinematic_video_reference_unavailable', 'The approved Storyboard reference is no longer available.', 409);
      }
      const sourceFingerprint = approvedLook?.sourceFingerprint || createStoryboardSourceFingerprint(asset);
      if (!reference.sourceFingerprint || reference.sourceFingerprint !== sourceFingerprint) {
        throw videoError('cinematic_video_reference_authority_invalid', 'The approved Storyboard reference fingerprint changed.', 409);
      }
      if (!String(asset.mimeType || '').startsWith('image/')) {
        throw videoError('cinematic_video_reference_type_invalid', 'The approved Storyboard reference is not an image.', 409);
      }
      let verifiedContent;
      try {
        verifiedContent = approvedLook ? { contentHash: asset.contentHash } : await this.storyboardAssetContentVerifier(asset);
      } catch {
        throw videoError(
          'cinematic_video_reference_content_changed',
          'The approved Storyboard image no longer matches its immutable Asset.',
          409
        );
      }
      authorities.push({
        role: reference.role,
        ...(sketchComposition ? { purpose: 'sketch_composition', storyboardRenderStyle: 'concept_sketch_v1' } : {}),
        ...(reference.trustedGenerationId ? { trustedGenerationId: reference.trustedGenerationId } : {}),
        ...(isLook ? { purpose: reference.purpose, characterProfileId: reference.characterProfileId,
          characterLookId: reference.characterLookId, characterLookVersionId: reference.characterLookVersionId } : {}),
        assetId: asset.id,
        assetVersionId: asset.id,
        sourceFingerprint,
        contentHash: verifiedContent.contentHash,
        immutable: Boolean(trustedLookSource) || asset.metadata?.immutable === true,
        providerOutputProvenance: normalizeProviderOutputProvenance(
          trustedLookSource?.providerOutputProvenance || asset.metadata?.providerOutputProvenance
        )
      });
      const constraints = model?.referenceConstraints || null;
      if (!constraints) continue;
      if (Array.isArray(constraints.mimeTypes) && !constraints.mimeTypes.includes(asset.mimeType)) {
        throw videoError('cinematic_video_reference_type_invalid', 'The selected Video model does not support this Storyboard image type.', 409);
      }
      const width = Number(asset.width);
      const height = Number(asset.height);
      const sizeBytes = Number(asset.sizeBytes);
      const ratio = width / height;
      if (!Number.isFinite(width) || !Number.isFinite(height)
        || width < Number(constraints.minimumWidth || 1)
        || height < Number(constraints.minimumHeight || 1)
        || width > Number(constraints.maximumWidth || Number.MAX_SAFE_INTEGER)
        || height > Number(constraints.maximumHeight || Number.MAX_SAFE_INTEGER)
        || !Number.isFinite(sizeBytes) || sizeBytes <= 0
        || sizeBytes > Number(constraints.maximumBytes || Number.MAX_SAFE_INTEGER)
        || ratio < Number(constraints.minimumAspectRatio || 0)
        || ratio > Number(constraints.maximumAspectRatio || Number.MAX_VALUE)) {
        throw videoError('cinematic_video_reference_dimensions_invalid', 'The approved Storyboard reference is outside the selected Video model limits.', 409);
      }
    }
    const firstFrame = authorities.find(item => item.role === 'first_frame') || authorities[0];
    return firstFrame ? {
      kind: references.every(item => ['character_look', 'generated_look'].includes(item.purpose))
        ? 'cinematic_look_sources' : 'cinematic_storyboard_source',
      ...firstFrame,
      ...(references.some(item => ['character_look', 'generated_look'].includes(item.purpose)) ? { references: authorities } : {})
    } : null;
  }
}

function normalizeRequest(input = {}, workflow = normalizeWorkflowContext(null)) {
  const references = normalizeVideoReferences(input);
  const legacyOperation = String(input.operation || '').trim();
  const characterReferenceCount = legacyOperation === 'character_to_video'
    || input.inputMode === 'multimodal_reference' && input.characterProfileId ? 1 : 0;
  const referenceImageCount = references.length || characterReferenceCount;
  const selection = normalizeVideoExecutionSelection({ ...input, referenceImageCount }, {
    defaultCommercialOperation: workflow.capability === 'cinematic'
      ? 'cinematic_draft_clip'
      : 'playground_video'
  });
  const request = {
    providerId: String(input.providerId || ''),
    modelId: String(input.modelId || ''),
    operation: selection.operation,
    commercialOperation: selection.commercialOperation,
    inputMode: selection.inputMode,
    legacyOperationInferred: selection.legacyInferred,
    prompt: String(input.prompt || '').trim().slice(0, 4000),
    aspectRatio: String(input.aspectRatio || '9:16'),
    resolution: String(input.resolution || '720p'),
    durationSeconds: Number(input.durationSeconds || 8),
    plannedDurationSeconds: Number(input.plannedDurationSeconds || 0) || null,
    audioMode: String(input.audioMode || 'generated'),
    referenceImageCount,
    referenceContainsPerson: input.referenceContainsPerson === true,
    referenceImageUrl: input.referenceImageUrl ? String(input.referenceImageUrl) : null,
    references,
    referencePlanFingerprint: fingerprintVideoReferencePlan(references, selection.inputMode),
    characterProfileId: input.characterProfileId ? String(input.characterProfileId) : null,
    characterProfileVersionId: input.characterProfileVersionId ? String(input.characterProfileVersionId) : null
  };
  if (!request.prompt) throw videoError('video_prompt_required', 'Write a video prompt before requesting a quote.');
  return request;
}

function deterministicTaskId(userId, idempotencyKey) {
  return `videotask_${crypto.createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex').slice(0, 20)}`;
}

function toPublicTask(task) {
  const submittedRequest = task.submittedRequest || {};
  const selection = normalizeVideoExecutionSelection(submittedRequest);
  return {
    id: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt || null,
    providerId: task.providerId,
    modelId: task.modelId,
    operation: task.submittedRequest?.operation || null,
    commercialOperation: task.commercialOperation || submittedRequest.commercialOperation
      || selection.commercialOperation,
    inputMode: task.inputMode || submittedRequest.inputMode || selection.inputMode,
    aspectRatio: task.submittedRequest?.aspectRatio || null,
    resolution: task.submittedRequest?.resolution || null,
    durationSeconds: task.submittedRequest?.durationSeconds || null,
    plannedDurationSeconds: task.submittedRequest?.plannedDurationSeconds || null,
    outputAsset: task.outputAsset || null,
    providerError: task.providerError || null,
    billingStatus: task.billingStatus || null,
    estimatedCredits: task.estimatedCredits || null,
    developmentPocUnverified: task.developmentPocUnverified === true,
    developmentPocCredits: task.developmentPocCredits || null,
    developmentPocWarningCode: task.developmentPocWarningCode || null,
    submittedRequest: {
      operation: submittedRequest.operation || null,
      commercialOperation: submittedRequest.commercialOperation || selection.commercialOperation,
      inputMode: submittedRequest.inputMode || selection.inputMode,
      aspectRatio: submittedRequest.aspectRatio || null,
      resolution: submittedRequest.resolution || null,
      durationSeconds: submittedRequest.durationSeconds || null,
      plannedDurationSeconds: submittedRequest.plannedDurationSeconds || null,
      audioMode: submittedRequest.audioMode || null,
      referenceImageCount: Number(submittedRequest.referenceImageCount) || 0,
      referencePlanFingerprint: submittedRequest.referencePlanFingerprint || null,
      referenceContainsPerson: submittedRequest.referenceContainsPerson === true,
      referenceAuthorityFingerprint: submittedRequest.referenceAuthorityFingerprint || null,
      requestFingerprint: submittedRequest.requestFingerprint || null,
      renderedPromptFingerprint: submittedRequest.renderedPromptFingerprint || null,
      promptStrategy: submittedRequest.promptStrategy || null,
      references: sanitizeVideoReferences(submittedRequest.references),
      developmentPocUnverified: submittedRequest.developmentPocUnverified === true,
      developmentPocCredits: submittedRequest.developmentPocCredits || null,
      developmentPocWarningCode: submittedRequest.developmentPocWarningCode || null,
      characterAttributions: Array.isArray(submittedRequest.characterAttributions)
        ? submittedRequest.characterAttributions.slice(0, 6).map(attribution => ({
          characterProfileId: attribution.characterProfileId,
          characterProfileVersionId: attribution.characterProfileVersionId,
          role: attribution.role || null
        }))
        : []
    }
  };
}

function fingerprintPreparedRequest(request) {
  return crypto.createHash('sha256').update(JSON.stringify({
    version: 'video-prepared-request-v1',
    providerId: request.providerId,
    modelId: request.modelId,
    commercialOperation: request.commercialOperation,
    inputMode: request.inputMode,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    durationSeconds: request.durationSeconds,
    plannedDurationSeconds: request.plannedDurationSeconds,
    audioMode: request.audioMode,
    referencePlanFingerprint: request.referencePlanFingerprint,
    referenceContainsPerson: request.referenceContainsPerson === true,
    referenceAuthorityFingerprint: request.referenceAuthorityFingerprint || null,
    characterProfileId: request.characterProfileId || null,
    characterProfileVersionId: request.characterProfileVersionId || null,
    developmentPocUnverified: request.developmentPocUnverified === true,
    developmentPocCredits: request.developmentPocCredits,
    promptFingerprint: crypto.createHash('sha256').update(request.prompt).digest('hex')
  })).digest('hex');
}

function publicSelection(request) {
  return {
    commercialOperation: request.commercialOperation,
    inputMode: request.inputMode,
    providerId: request.providerId,
    modelId: request.modelId,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    durationSeconds: request.durationSeconds,
    audioMode: request.audioMode,
    referenceImageCount: request.referenceImageCount,
    referencePlanFingerprint: request.referencePlanFingerprint,
    referenceContainsPerson: request.referenceContainsPerson === true,
    referenceAuthorityFingerprint: request.referenceAuthorityFingerprint || null,
    developmentPocUnverified: request.developmentPocUnverified === true,
    developmentPocCredits: request.developmentPocCredits,
    developmentPocWarningCode: request.developmentPocWarningCode
  };
}

function fingerprintReferenceAuthority(authority) {
  if (!authority) return null;
  return crypto.createHash('sha256').update(JSON.stringify({
    kind: authority.kind,
    ...(authority.storyboardRenderStyle ? { purpose: authority.purpose, storyboardRenderStyle: authority.storyboardRenderStyle } : {}),
    role: authority.role,
    assetId: authority.assetId,
    assetVersionId: authority.assetVersionId,
    sourceFingerprint: authority.sourceFingerprint,
    contentHash: authority.contentHash,
    providerOutputProvenance: authority.providerOutputProvenance,
    ...(authority.references ? { references: authority.references } : {})
  })).digest('hex');
}

function emptyResolvedSource() {
  return {
    referenceImage: null,
    lastFrameImage: null,
    referenceImages: [],
    characterAttributions: [],
    providerReferenceRegistrations: []
  };
}

function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 200) throw videoError('video_idempotency_key_invalid', 'A stable video idempotency key is required.');
  return key;
}

function normalizeWorkflowContext(value) {
  if (!value) {
    return {
      capability: 'playground_video',
      generationMode: 'playground_video',
      projectId: 'playground',
      sceneId: null,
      shotId: null,
      generationAttemptId: null
    };
  }
  const capability = String(value.capability || '').trim();
  const generationMode = String(value.generationMode || '').trim();
  const projectId = String(value.projectId || '').trim();
  if (capability !== 'cinematic' || generationMode !== 'cinematic_video' || !projectId) {
    throw videoError('video_workflow_context_invalid', 'Video workflow context is invalid.');
  }
  return {
    capability,
    generationMode,
    projectId,
    sceneId: String(value.sceneId || '').trim() || null,
    shotId: String(value.shotId || '').trim() || null,
    generationAttemptId: String(value.generationAttemptId || '').trim() || null
  };
}

function videoError(code, message, statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const videoGenerationApplicationService = new VideoGenerationApplicationService();
