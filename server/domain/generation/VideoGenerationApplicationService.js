import crypto from 'node:crypto';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { resolveReferenceForProvider } from './referenceUtils.js';
import { videoCapabilityRegistry } from './VideoCapabilityRegistry.js';
import { VideoProviderTaskService } from './VideoProviderTaskService.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { cinematicVideoAssetService } from '../assets/CinematicVideoAssetService.js';
import { GeminiVeoProvider } from '../../providers/GeminiVeoProvider.js';
import { ModelArkSeedanceProvider } from '../../providers/ModelArkSeedanceProvider.js';
import { VideoProviderAdapterRegistry } from '../../providers/VideoProviderAdapterRegistry.js';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

export class VideoGenerationApplicationService {
  constructor({
    capabilityRegistry = videoCapabilityRegistry,
    creditService = creditApplicationService,
    characterService = characterUsageService,
    taskRepository = videoProviderTaskRepository,
    providerTaskService = null,
    testingEnabled = process.env.NODE_ENV !== 'production'
      && process.env.VIDEO_PLAYGROUND_TESTING_ENABLED !== 'false'
  } = {}) {
    this.capabilityRegistry = capabilityRegistry;
    this.creditService = creditService;
    this.characterService = characterService;
    this.taskRepository = taskRepository;
    this.testingEnabled = testingEnabled;
    if (providerTaskService) {
      this.providerTaskService = providerTaskService;
    } else {
      const adapterRegistry = new VideoProviderAdapterRegistry({
        adapters: {
          gemini: new GeminiVeoProvider(),
          modelark: new ModelArkSeedanceProvider()
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

  getCatalog() {
    return this.capabilityRegistry.getPublicCatalog({ includeTesting: this.testingEnabled });
  }

  async quote(input, actorContext) {
    const request = normalizeRequest(input);
    const model = this.#validateModel(request);
    await this.#validateSource(request, actorContext, { resolveMedia: false });
    const estimate = await this.creditService.estimateVideo({
      userId: actorContext.userId,
      model,
      request
    });
    const account = await this.creditService.getAccount(actorContext.userId);
    return {
      estimate,
      account: {
        availableCredits: account.availableCredits,
        canAfford: account.availableCredits >= estimate.estimatedCredits
      }
    };
  }

  async submit(input, actorContext) {
    const request = normalizeRequest(input);
    const model = this.#validateModel(request);
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const replay = await this.taskRepository.findByIdempotencyKey(actorContext.userId, idempotencyKey);
    if (replay) return replay;
    const source = await this.#validateSource(request, actorContext, { resolveMedia: true });
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
      generationMode: 'playground_video',
      operation: request.operation,
      durationSeconds: request.durationSeconds,
      audioMode: request.audioMode
    };
    const reserved = await this.creditService.validateAndReserveForRequest({
      userId: actorContext.userId,
      estimateId: input.estimateId,
      generationRequest,
      metadata: { jobId: taskId, requestId, capability: 'playground_video' }
    });
    const submitted = await this.providerTaskService.submitTask({
      ...request,
      id: taskId,
      idempotencyKey,
      prompt: request.prompt,
      referenceImage: source.referenceImage,
      characterAttributions: source.characterAttributions,
      pricingFingerprint: reserved.estimate.estimateId,
      reservationId: reserved.reservation.reservationId,
      estimateId: reserved.estimate.estimateId,
      correlationId: taskId,
      projectId: 'playground',
      sceneId: null,
      shotId: null,
      generationAttemptId: taskId
    }, actorContext, { allowTesting: this.testingEnabled });
    if (submitted.status === 'failed' && submitted.providerError?.providerBillableState === 'not_billable') {
      await this.creditService.refundForJob({
        userId: actorContext.userId,
        reservationId: reserved.reservation.reservationId,
        jobId: taskId,
        reasonCode: 'video_provider_submit_failed'
      });
      return this.taskRepository.update(taskId, draft => { draft.billingStatus = 'refunded'; });
    }
    return this.taskRepository.update(taskId, draft => {
      draft.reservationId = reserved.reservation.reservationId;
      draft.estimateId = reserved.estimate.estimateId;
      draft.estimatedCredits = reserved.estimate.estimatedCredits;
      draft.billingStatus = 'reserved';
    });
  }

  async getAndPoll(taskId, actorContext) {
    const owned = await this.taskRepository.findForActor(taskId, actorContext);
    if (!owned) throw videoError('video_task_not_found', 'Video task not found.', 404);
    let task = TERMINAL.has(owned.status) ? owned : await this.providerTaskService.pollTask(taskId);
    if (task.status === 'completed' && task.billingStatus !== 'captured') {
      await this.creditService.captureForJob({
        userId: actorContext.userId,
        reservationId: task.reservationId,
        jobId: task.id,
        metadata: { providerUsage: task.providerUsage, mediaType: 'video' }
      });
      task = await this.taskRepository.update(task.id, draft => { draft.billingStatus = 'captured'; });
    } else if (['failed', 'cancelled', 'expired'].includes(task.status)
      && task.billingStatus === 'reserved'
      && task.providerError?.providerBillableState === 'not_billable') {
      await this.creditService.refundForJob({
        userId: actorContext.userId,
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

  #validateModel(request) {
    return this.capabilityRegistry.validateRequest(request, { allowTesting: this.testingEnabled });
  }

  async #validateSource(request, actorContext, { resolveMedia }) {
    if (request.operation === 'text_to_video') return { referenceImage: null, characterAttributions: [] };
    if (request.operation === 'image_to_video') {
      if (!request.referenceImageUrl) throw videoError('video_reference_required', 'Choose an image before generating this video.');
      if (!resolveMedia) return { referenceImage: null, characterAttributions: [] };
      const referenceImage = await resolveReferenceForProvider(request.referenceImageUrl, actorContext.username, { ownerUserId: actorContext.userId });
      if (!referenceImage) throw videoError('video_reference_unavailable', 'The selected image is no longer available.', 409);
      return { referenceImage, characterAttributions: [] };
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
    if (!resolveMedia) return { referenceImage: null, characterAttributions: [context.attribution] };
    const referenceImage = await resolveReferenceForProvider(
      { source: 'history', jobId: context.authorizedCharacterReferenceAssetId },
      actorContext.username,
      { authorizedJobIds: [context.authorizedCharacterReferenceAssetId], ownerUserId: actorContext.userId }
    ) || await resolveReferenceForProvider(
      context.authorizedCharacterFrontReferenceUrl,
      actorContext.username,
      { authorizedImageUrls: [context.authorizedCharacterFrontReferenceUrl], ownerUserId: actorContext.userId }
    );
    if (!referenceImage) throw videoError('video_character_reference_unavailable', 'The approved Character image is no longer available.', 409);
    return {
      referenceImage,
      characterAttributions: [{
        characterProfileId: request.characterProfileId,
        characterProfileVersionId: request.characterProfileVersionId,
        role: 'primary'
      }]
    };
  }
}

function normalizeRequest(input = {}) {
  const operation = String(input.operation || 'text_to_video');
  const referenceImageCount = operation === 'text_to_video' ? 0 : 1;
  const request = {
    providerId: String(input.providerId || ''),
    modelId: String(input.modelId || ''),
    operation,
    prompt: String(input.prompt || '').trim().slice(0, 4000),
    aspectRatio: String(input.aspectRatio || '9:16'),
    resolution: String(input.resolution || '720p'),
    durationSeconds: Number(input.durationSeconds || 8),
    audioMode: String(input.audioMode || 'generated'),
    referenceImageCount,
    referenceImageUrl: input.referenceImageUrl ? String(input.referenceImageUrl) : null,
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
  return {
    id: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt || null,
    providerId: task.providerId,
    modelId: task.modelId,
    operation: task.submittedRequest?.operation || null,
    aspectRatio: task.submittedRequest?.aspectRatio || null,
    resolution: task.submittedRequest?.resolution || null,
    durationSeconds: task.submittedRequest?.durationSeconds || null,
    outputAsset: task.outputAsset || null,
    providerError: task.providerError || null,
    billingStatus: task.billingStatus || null,
    estimatedCredits: task.estimatedCredits || null
  };
}

function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 200) throw videoError('video_idempotency_key_invalid', 'A stable video idempotency key is required.');
  return key;
}

function videoError(code, message, statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const videoGenerationApplicationService = new VideoGenerationApplicationService();
