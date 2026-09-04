import crypto from 'node:crypto';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { videoCapabilityRegistry } from './VideoCapabilityRegistry.js';
import { sanitizeVideoReferences } from './VideoReferencePlan.js';

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
    const adapter = this.#resolveAdapter(model.providerId, model.modelId);
    await adapter.preflight?.(request);
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
      commercialOperation: request.commercialOperation,
      inputMode: request.inputMode,
      submittedFingerprint,
      submittedRequest: sanitizeRequest(request),
      reservationId: request.reservationId || null,
      estimateId: request.estimateId || null,
      estimatedCredits: Number(request.estimatedCredits || 0) || null,
      qualificationAuthorizationId: request.qualificationAuthorizationId || null,
      developmentPocUnverified: request.developmentPocUnverified === true,
      developmentPocCredits: request.developmentPocCredits || null,
      developmentPocWarningCode: request.developmentPocWarningCode || null,
      billingStatus: request.billingStatus || (request.reservationId ? 'reserved' : null),
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
        const providerError = sanitizeError(error, 'video_provider_submit_failed');
        draft.status = providerError.providerBillableState === 'unknown'
          ? 'reconciliation_required'
          : 'failed';
        draft.providerError = providerError;
        draft.completedAt = new Date().toISOString();
      });
    }
  }

  submitResearchTask(request, actorContext) {
    return this.submitTask(request, actorContext, { allowResearch: true });
  }

  async preflightTask(request, { allowResearch = false, allowTesting = false } = {}) {
    const model = this.capabilityRegistry.validateRequest(request, { allowResearch, allowTesting });
    const adapter = this.#resolveAdapter(model.providerId, model.modelId);
    await adapter.preflight?.(request);
    return model;
  }

  async pollTask(taskId) {
    const task = await this.repository.find(taskId);
    if (!task) throw taskError('video_task_not_found', 'Video provider task not found.', 404);
    if (isTerminal(task.status)) return task;
    if (!task.providerTaskId) throw taskError('video_provider_task_id_missing', 'Provider task ID is missing.', 409);
    const adapter = this.#resolveAdapter(task.providerId, task.modelId);
    let response;
    try {
      response = await adapter.poll(task.providerTaskId, { task });
    } catch (error) {
      const providerError = sanitizeError(error, 'video_provider_poll_failed');
      return this.repository.update(task.id, draft => {
        draft.pollCount = Number(draft.pollCount || 0) + 1;
        draft.lastPolledAt = new Date().toISOString();
        draft.providerError = providerError;
        if (providerError.retryable) {
          if (!['provider_queued', 'provider_processing'].includes(draft.status)) {
            draft.status = 'provider_processing';
          }
          draft.lastRetryableErrorAt = new Date().toISOString();
          return;
        }
        draft.status = 'reconciliation_required';
        draft.completedAt = new Date().toISOString();
      });
    }
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
      if (!task.providerTaskId) {
        results.push(await this.repository.update(task.id, draft => {
          draft.status = 'reconciliation_required';
          draft.providerError = {
            code: 'video_provider_submission_state_unknown',
            category: 'provider',
            retryable: false,
            providerBillableState: 'unknown'
          };
          draft.completedAt = new Date().toISOString();
        }));
        continue;
      }
      try {
        results.push(await this.pollTask(task.id));
      } catch (error) {
        results.push(await this.repository.update(task.id, draft => {
          draft.status = 'reconciliation_required';
          draft.providerError = sanitizeError(error, 'video_provider_recovery_failed');
          draft.completedAt = new Date().toISOString();
        }));
      }
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
        const providerError = sanitizeError(error, 'video_media_copy_failed');
        draft.status = providerError.retryable ? 'media_retry_pending' : 'reconciliation_required';
        draft.providerError = providerError;
        if (error?.outputAsset) draft.outputAsset = error.outputAsset;
        if (response.usage) draft.providerUsage = response.usage;
        draft.completedAt = providerError.retryable ? null : new Date().toISOString();
      });
    } finally {
      await adapter.cleanupOutput?.(response.output).catch(() => {});
    }
  }

  #resolveAdapter(providerId, modelId) {
    if (this.adapterRegistry) return this.adapterRegistry.resolve(providerId, modelId);
    if (this.adapter) return this.adapter;
    throw taskError('video_provider_adapter_unavailable', 'Video provider adapter is unavailable.', 503);
  }
}

function fingerprintRequest(request) {
  const stable = JSON.stringify({
    operation: request.operation,
    commercialOperation: request.commercialOperation,
    inputMode: request.inputMode,
    projectId: request.projectId, sceneId: request.sceneId,
    shotId: request.shotId, generationAttemptId: request.generationAttemptId,
    providerId: request.providerId, modelId: request.modelId, aspectRatio: request.aspectRatio,
    resolution: request.resolution, durationSeconds: request.durationSeconds,
    plannedDurationSeconds: request.plannedDurationSeconds || null,
    audioMode: request.audioMode, referenceImageCount: request.referenceImageCount || 0,
    referencePlanFingerprint: request.referencePlanFingerprint || null,
    referenceContainsPerson: request.referenceContainsPerson === true,
    referenceAuthorityFingerprint: request.referenceAuthorityFingerprint || null,
    providerReferenceRegistrations: sanitizeProviderReferenceRegistrations(request.providerReferenceRegistrations),
    requestFingerprint: request.requestFingerprint || null,
    renderedPromptFingerprint: request.renderedPromptFingerprint || null,
    promptStrategy: sanitizePromptStrategy(request.promptStrategy),
    pricingFingerprint: request.pricingFingerprint
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function sanitizeRequest(request) {
  return {
    operation: request.operation,
    commercialOperation: request.commercialOperation,
    inputMode: request.inputMode,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    durationSeconds: Number(request.durationSeconds),
    plannedDurationSeconds: Number(request.plannedDurationSeconds || 0) || null,
    durationReconciliation: sanitizeDurationReconciliation(request.durationReconciliation),
    audioMode: request.audioMode,
    referenceImageCount: Number(request.referenceImageCount || 0),
    referencePlanFingerprint: request.referencePlanFingerprint || null,
    referenceContainsPerson: request.referenceContainsPerson === true,
    referenceAuthorityFingerprint: request.referenceAuthorityFingerprint || null,
    requestFingerprint: request.requestFingerprint || null,
    renderedPromptFingerprint: request.renderedPromptFingerprint || null,
    promptStrategy: sanitizePromptStrategy(request.promptStrategy),
    references: sanitizeVideoReferences(request.references),
    providerReferenceRegistrations: sanitizeProviderReferenceRegistrations(request.providerReferenceRegistrations),
    developmentPocUnverified: request.developmentPocUnverified === true,
    developmentPocCredits: request.developmentPocCredits || null,
    developmentPocWarningCode: request.developmentPocWarningCode || null,
    pricingFingerprint: request.pricingFingerprint,
    correlationId: request.correlationId,
    characterAttributions: sanitizeCharacterAttributions(request.characterAttributions)
  };
}

function sanitizePromptStrategy(value) {
  if (!value) return null;
  return {
    id: String(value.id || '').trim(),
    version: Number(value.version || 0),
    policyId: String(value.policyId || '').trim(),
    policyVersion: Number(value.policyVersion || 0)
  };
}

function sanitizeDurationReconciliation(value) {
  if (!value) return null;
  return {
    plannedDurationSeconds: Number(value.plannedDurationSeconds),
    renderDurationSeconds: Number(value.renderDurationSeconds),
    trimDurationSeconds: Number(value.trimDurationSeconds || 0),
    durationControlMode: value.durationControlMode === 'prompted' ? 'prompted' : 'exact',
    strategy: String(value.strategy || ''),
    reasonCode: String(value.reasonCode || '')
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

function sanitizeProviderReferenceRegistrations(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap(item => {
    const id = boundedIdentifier(item?.id);
    const providerAssetId = boundedIdentifier(item?.providerAssetId);
    const sourceAssetId = boundedIdentifier(item?.sourceAssetId);
    const sourceContentHash = /^[a-f0-9]{64}$/i.test(String(item?.sourceContentHash || ''))
      ? String(item.sourceContentHash).toLowerCase()
      : null;
    if (!id || !providerAssetId || !sourceAssetId || !sourceContentHash) return [];
    return [{
      id,
      providerId: item?.providerId === 'modelark' ? 'modelark' : String(item?.providerId || '').slice(0, 40),
      providerAssetId,
      providerAssetGroupId: boundedIdentifier(item?.providerAssetGroupId),
      sourceAssetId,
      sourceContentHash,
      status: item?.status === 'active' ? 'active' : String(item?.status || '').slice(0, 40),
      activatedAt: String(item?.activatedAt || '').slice(0, 40) || null
    }];
  });
}

function boundedIdentifier(value) {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,199}$/.test(id) ? id : null;
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
