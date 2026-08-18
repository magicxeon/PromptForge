import crypto from 'node:crypto';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { videoCapabilityRegistry } from './VideoCapabilityRegistry.js';

const PROVIDER_TO_TASK = {
  provider_queued: 'provider_queued',
  provider_processing: 'provider_processing',
  provider_succeeded: 'provider_succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
  expired: 'expired'
};

export class VideoProviderTaskService {
  constructor({ repository = videoProviderTaskRepository, capabilityRegistry = videoCapabilityRegistry, adapter, adapterRegistry, mediaPersister } = {}) {
    this.repository = repository;
    this.capabilityRegistry = capabilityRegistry;
    this.adapter = adapter;
    this.adapterRegistry = adapterRegistry;
    this.mediaPersister = mediaPersister;
  }

  async submitTask(request, actorContext, { allowResearch = false, allowTesting = false } = {}) {
    const model = this.capabilityRegistry.validateRequest(request, { allowResearch, allowTesting });
    const adapter = this.#resolveAdapter(model.providerId);
    const submittedFingerprint = fingerprintRequest(request);
    const accepted = await this.repository.createAccepted({
      id: request.id,
      ownerUserId: actorContext.userId,
      ownerUsername: actorContext.username,
      idempotencyKey: normalizeIdempotencyKey(request.idempotencyKey),
      projectId: request.projectId,
      sceneId: request.sceneId,
      shotId: request.shotId,
      attemptId: request.generationAttemptId,
      providerId: model.providerId,
      modelId: model.modelId,
      operation: request.operation,
      submittedFingerprint,
      submittedRequest: sanitizeRequest(request),
      reservationId: request.reservationId || null,
      estimateId: request.estimateId || null,
      estimatedCredits: Number(request.estimatedCredits || 0) || null,
      billingStatus: request.reservationId ? 'reserved' : null,
      acceptedAt: new Date().toISOString()
    });
    if (accepted.providerTaskId || accepted.status !== 'accepted') return accepted;
    await this.repository.update(accepted.id, draft => { draft.status = 'provider_submitting'; });
    try {
      const response = await adapter.submit({ ...request, submittedFingerprint });
      return this.repository.update(accepted.id, draft => {
        draft.providerTaskId = response.providerTaskId;
        draft.providerOperationId = response.providerOperationId || response.providerTaskId;
        draft.status = 'provider_queued';
        draft.submittedAt = new Date().toISOString();
      });
    } catch (error) {
      return this.repository.update(accepted.id, draft => {
        draft.status = 'failed';
        draft.providerError = sanitizeError(error, 'video_provider_submit_failed');
        draft.completedAt = new Date().toISOString();
      });
    }
  }

  submitResearchTask(request, actorContext) {
    return this.submitTask(request, actorContext, { allowResearch: true });
  }

  async pollTask(taskId) {
    const task = await this.repository.find(taskId);
    if (!task) throw taskError('video_task_not_found', 'Video provider task not found.', 404);
    if (isTerminal(task.status)) return task;
    if (!task.providerTaskId) throw taskError('video_provider_task_id_missing', 'Provider task ID is missing.', 409);
    const adapter = this.#resolveAdapter(task.providerId);
    const response = await adapter.poll(task.providerTaskId, { task });
    const nextStatus = PROVIDER_TO_TASK[response.providerStatus];
    if (!nextStatus) {
      return this.repository.update(task.id, draft => {
        draft.pollCount = Number(draft.pollCount || 0) + 1;
        draft.lastPolledAt = new Date().toISOString();
        draft.status = 'reconciliation_required';
        draft.providerError = {
          code: 'video_provider_status_unknown',
          category: 'provider',
          retryable: false,
          providerBillableState: 'unknown'
        };
        draft.completedAt = new Date().toISOString();
      });
    }
    if (nextStatus === 'provider_succeeded') return this.#completeSuccessfulTask(task, response, adapter);
    return this.repository.update(task.id, draft => {
      draft.pollCount = Number(draft.pollCount || 0) + 1;
      draft.lastPolledAt = new Date().toISOString();
      draft.status = nextStatus;
      if (isTerminal(nextStatus)) {
        draft.providerError = response.providerError || null;
        draft.completedAt = new Date().toISOString();
      }
    });
  }

  async resumeRecoverable() {
    const tasks = await this.repository.listRecoverable();
    const results = [];
    for (const task of tasks) {
      if (task.providerTaskId) results.push(await this.pollTask(task.id));
    }
    return results;
  }

  async #completeSuccessfulTask(task, response, adapter) {
    if (!this.mediaPersister) throw taskError('video_media_persister_unavailable', 'Durable video media persistence is unavailable.', 503);
    await this.repository.update(task.id, draft => {
      draft.status = 'media_copying';
      draft.pollCount = Number(draft.pollCount || 0) + 1;
      draft.lastPolledAt = new Date().toISOString();
    });
    try {
      const outputAsset = await this.mediaPersister.persistVideoOutput({ task, output: response.output });
      return this.repository.update(task.id, draft => {
        draft.outputAsset = outputAsset;
        draft.providerUsage = response.usage || null;
        draft.status = response.usage ? 'completed' : 'reconciliation_required';
        draft.completedAt = new Date().toISOString();
      });
    } catch (error) {
      return this.repository.update(task.id, draft => {
        draft.status = 'reconciliation_required';
        draft.providerError = sanitizeError(error, 'video_media_copy_failed');
        draft.completedAt = new Date().toISOString();
      });
    } finally {
      await adapter.cleanupOutput?.(response.output).catch(() => {});
    }
  }

  #resolveAdapter(providerId) {
    if (this.adapterRegistry) return this.adapterRegistry.resolve(providerId);
    if (this.adapter) return this.adapter;
    throw taskError('video_provider_adapter_unavailable', 'Video provider adapter is unavailable.', 503);
  }
}

function fingerprintRequest(request) {
  const stable = JSON.stringify({
    operation: request.operation, projectId: request.projectId, sceneId: request.sceneId,
    shotId: request.shotId, generationAttemptId: request.generationAttemptId,
    providerId: request.providerId, modelId: request.modelId, aspectRatio: request.aspectRatio,
    resolution: request.resolution, durationSeconds: request.durationSeconds,
    audioMode: request.audioMode, referenceImageCount: request.referenceImageCount || 0,
    pricingFingerprint: request.pricingFingerprint
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function sanitizeRequest(request) {
  return {
    operation: request.operation,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    durationSeconds: Number(request.durationSeconds),
    audioMode: request.audioMode,
    referenceImageCount: Number(request.referenceImageCount || 0),
    pricingFingerprint: request.pricingFingerprint,
    correlationId: request.correlationId,
    characterAttributions: sanitizeCharacterAttributions(request.characterAttributions)
  };
}

function sanitizeCharacterAttributions(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 6).flatMap(item => {
    const characterProfileId = String(item?.characterProfileId || '').trim();
    const characterProfileVersionId = String(item?.characterProfileVersionId || '').trim();
    const key = `${characterProfileId}:${characterProfileVersionId}`;
    if (!characterProfileId || !characterProfileVersionId || seen.has(key)) return [];
    seen.add(key);
    return [{
      characterProfileId,
      characterProfileVersionId,
      role: String(item?.role || '').trim().slice(0, 80) || null
    }];
  });
}

function sanitizeError(error, fallbackCode) {
  return { code: error?.code || fallbackCode, category: error?.category || 'internal', retryable: Boolean(error?.retryable), providerBillableState: error?.providerBillableState || 'unknown' };
}

function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 200) throw taskError('video_idempotency_key_invalid', 'A stable video idempotency key is required.');
  return key;
}

function isTerminal(status) {
  return ['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required'].includes(status);
}

function taskError(code, message, statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}
