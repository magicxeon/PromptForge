import { compileGenerationContext, createQueueOptions } from '../generation/generationRequestService.js';
import { aggregateRunStatus, ComparisonValidator, stripPrivateConfig } from './ComparisonValidator.js';
import { ComparisonError, ComparisonRepository } from '../../repositories/comparisons/ComparisonRepository.js';
import { creditReservationService } from '../credits/CreditReservationService.js';

export class ComparisonOrchestrator {
  constructor({ providerRegistry, queueManager, creditManager, creditReservation = creditReservationService, repository = new ComparisonRepository() }) {
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.creditManager = creditManager;
    this.creditReservation = creditReservation;
    this.repository = repository;
    this.validator = new ComparisonValidator({ providerRegistry });
    this.queueManager.subscribeLifecycle?.(event => this.handleQueueLifecycle(event));
  }

  async init() {
    await this.repository.init();
  }

  async estimate(payload, username, userId) {
    const { context } = compileGenerationContext(payload);
    const slots = this.validator.validateSlots(payload.slots, context);
    const pricedSlots = await Promise.all(slots.map(async slot => {
      const estimate = await this.creditReservation.estimate({
        userId,
        routingMode: 'advanced',
        qualityTier: 'standard',
        generationMode: context.mode || 'normal',
        requestedProviderId: slot.provider,
        requestedModelId: slot.model,
        resolution: slot.imageResolution || '1K',
        referenceCount: context.referenceCount,
        outputCount: 1
      });
      return { ...slot, estimateId: estimate.estimateId, estimatedCredit: estimate.estimatedCredits, estimateExpiresAt: estimate.expiresAt };
    }));
    return this.validator.createEstimate(pricedSlots, context, username);
  }

  async create(payload, username, userId) {
    const { context, compiledPrompt } = compileGenerationContext(payload);
    const slots = this.validator.validateSlots(payload.slots, context);
    const clientEstimates = new Map((payload.creditEstimates || []).map(item => [item.slotId, item]));
    const pricedSlots = slots.map(slot => {
      const clientEstimate = clientEstimates.get(slot.id);
      if (!clientEstimate?.estimateId || !Number.isInteger(Number(clientEstimate.estimatedCredit))) {
        throw new ComparisonError('estimate_changed', 'Every comparison slot requires a current server estimate.');
      }
      return { ...slot, estimateId: clientEstimate.estimateId, estimatedCredit: Number(clientEstimate.estimatedCredit), estimateExpiresAt: clientEstimate.estimateExpiresAt || null };
    });
    const confirmedEstimate = {
      slots: pricedSlots.map(stripPrivateConfig),
      estimatedTotalCredit: pricedSlots.reduce((total, slot) => total + slot.estimatedCredit, 0),
      providerConfigVersion: this.providerRegistry.getConfigVersion(),
      expiresAt: Number(payload.estimateExpiresAt || 0)
    };
    this.validator.verifyEstimate(payload.estimateToken, confirmedEstimate, context, username);

    const idempotencyKey = normalizeIdempotencyKey(payload.idempotencyKey);
    const timestamp = Date.now();
    const draftRun = {
      idempotencyKey,
      status: 'queued',
      sourcePrompt: compiledPrompt,
      configurationSnapshot: createConfigurationSnapshot(context),
      estimatedTotalCredit: confirmedEstimate.estimatedTotalCredit,
      actualTotalCredit: 0,
      providerConfigVersion: this.providerRegistry.getConfigVersion(),
      promptCompilerVersion: 1,
      createdAt: timestamp,
      completedAt: null,
      payerUserId: userId,
      slots: pricedSlots.map(slot => ({
        ...stripPrivateConfig(slot),
        submittedPrompt: compiledPrompt,
        jobId: null,
        status: 'queued',
        actualCredit: 0,
        result: null,
        error: null
      }))
    };
    const created = await this.repository.createSetWithRun({
      username,
      name: normalizeName(payload.name),
      description: normalizeDescription(payload.description),
      idempotencyKey,
      run: draftRun
    });
    if (!created.created) return this.createResponse(created.set, created.run, true);

    const setId = created.set.id;
    const runId = created.run.id;
    const enqueuedSlots = [];
    try {
      for (const slot of pricedSlots) {
        const stream = this.providerRegistry.shouldStream(slot.providerConfig, slot.modelConfig, payload.stream !== false);
        const jobId = this.queueManager.createJobId();
        const reservationResult = await this.creditReservation.validateAndReserveForRequest({
          userId,
          estimateId: slot.estimateId,
          generationRequest: {
            requestedProviderId: slot.provider, requestedModelId: slot.model, resolution: slot.imageResolution || '1K',
            quality: null, referenceCount: context.referenceCount, outputCount: 1, routingMode: 'advanced',
            qualityTier: 'standard', generationMode: context.mode || 'normal', requestId: `${idempotencyKey}:${slot.id}`
          },
          metadata: { jobId, comparisonSetId: setId, comparisonRunId: runId }
        });
        this.queueManager.enqueue(slot.provider, slot.model, compiledPrompt, createQueueOptions(context, {
          jobId,
          username,
          stream,
          modelConfig: slot.modelConfig,
          providerConfigVersion: this.providerRegistry.getConfigVersion(),
          imageResolution: slot.imageResolution,
          comparison: { setId, runId, slotId: slot.id },
          reservationId: reservationResult.reservation.reservationId,
          pricingSnapshot: reservationResult.reservation.pricingSnapshot,
          payerUserId: userId,
          estimateId: slot.estimateId,
          requestId: `${idempotencyKey}:${slot.id}`
        }));
        enqueuedSlots.push({ slotId: slot.id, jobId, reservationId: reservationResult.reservation.reservationId, providerStreaming: stream });
      }
      const run = await this.repository.updateRun(setId, runId, targetRun => {
        targetRun.slots.forEach(slot => {
          const enqueued = enqueuedSlots.find(item => item.slotId === slot.id);
          if (enqueued) { slot.jobId = enqueued.jobId; slot.reservationId = enqueued.reservationId; }
        });
      });
      return this.createResponse(created.set, run, false, enqueuedSlots);
    } catch (error) {
      await Promise.all(enqueuedSlots.map(item => this.creditReservation.refundForJob({
        userId, reservationId: item.reservationId, jobId: item.jobId, reasonCode: 'comparison_enqueue_failed'
      }).catch(() => {})));
      await this.repository.updateRun(setId, runId, targetRun => {
        targetRun.status = enqueuedSlots.length > 0 ? 'partially_completed' : 'failed';
        targetRun.slots.filter(slot => !slot.jobId).forEach(slot => {
          slot.status = 'failed';
          slot.error = { code: 'enqueue_failed', message: 'The comparison slot could not be queued.' };
        });
      });
      throw error;
    }
  }

  async list(username, query = {}) {
    return this.repository.listPage(username, query);
  }

  async get(setId, username) {
    let set = await this.repository.get(setId, username);
    for (const run of set.runs) await this.reconcileRun(set.id, run, set.username);
    set = await this.repository.get(setId, username);
    return this.hydrateSetFromHistory(set);
  }

  async hydrateSetFromHistory(set) {
    const history = await this.repository.readHistory();
    const historyById = new Map(history.map(item => [item.id, item]));
    const hydrated = structuredClone(set);
    hydrated.runs?.forEach(run => {
      run.slots?.forEach(slot => {
        const historyItem = historyById.get(slot.jobId);
        if (!historyItem) return;
        slot.result = {
          ...(slot.result || {}),
          imageUrl: slot.result?.imageUrl || historyItem.imageUrl || null,
          usage: slot.result?.usage || historyItem.usage || null,
          mimeType: slot.result?.mimeType || historyItem.mimeType || null,
          generationDuration: slot.result?.generationDuration || historyItem.generationDuration || null
        };
        slot.thumbnailUrl = slot.thumbnailUrl || historyItem.thumbnailUrl || null;
        if (slot.status !== 'completed' && historyItem.imageUrl) {
          slot.status = 'completed';
          slot.error = null;
        }
      });
      run.status = aggregateRunStatus(run.slots || []);
      if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(run.status)) {
        run.completedAt ||= Date.now();
      }
    });
    return hydrated;
  }

  update(setId, username, payload) {
    return this.repository.updateSet(setId, username, payload);
  }

  remove(setId, username) {
    return this.repository.remove(setId, username);
  }

  setWinner(setId, username, jobId) {
    return this.repository.setWinner(setId, username, jobId || null);
  }

  removeHistoryJob(jobId) {
    return this.repository.removeHistoryJob(jobId);
  }

  async reconcileRun(setId, run, username) {
    const statuses = await Promise.all(run.slots.map(slot =>
      slot.jobId ? this.queueManager.getJobStatus(slot.jobId) : null
    ));
    const lostSlots = run.slots.filter((slot, index) =>
      slot.jobId
      && !statuses[index]
      && (
        ['queued', 'processing', 'streaming'].includes(slot.status)
        || slot.error?.code === 'job_state_lost'
      )
    );
    await Promise.all(lostSlots.map(slot => {
      if (!slot.reservationId || !run.payerUserId) return Promise.resolve();
      return this.creditReservation.refundForJob({
        userId: run.payerUserId,
        reservationId: slot.reservationId,
        jobId: slot.jobId,
        reasonCode: 'job_state_lost',
        metadata: { comparisonSetId: setId, comparisonRunId: run.id }
      }).catch(error => console.warn(`[Comparison] Lost-job refund failed for ${slot.jobId}:`, error.message));
    }));
    const costs = await this.creditManager.getNetJobCosts(run.slots.map(slot => slot.jobId).filter(Boolean));
    await this.repository.updateRun(setId, run.id, targetRun => {
      targetRun.slots.forEach((slot, index) => {
        const status = statuses[index];
        if (status) {
          slot.status = status.status;
          slot.result = status.result || slot.result;
          slot.error = status.error || null;
        } else if (slot.jobId && ['queued', 'processing', 'streaming'].includes(slot.status)) {
          slot.status = 'failed';
          slot.error = {
            code: 'job_state_lost',
            message: 'The server restarted before this generation could be recovered. Other completed slots are still available.'
          };
        }
        slot.actualCredit = Math.max(0, costs.get(slot.jobId) || 0);
      });
      targetRun.actualTotalCredit = targetRun.slots.reduce((sum, slot) => sum + slot.actualCredit, 0);
      targetRun.status = aggregateRunStatus(targetRun.slots);
      if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(targetRun.status)) {
        targetRun.completedAt ||= Date.now();
      }
    });
  }

  async handleQueueLifecycle({ job, status, result, error }) {
    const setId = job.options?.comparisonSetId;
    const runId = job.options?.comparisonRunId;
    const slotId = job.options?.comparisonSlotId;
    if (!setId || !runId || !slotId) return;
    try {
      const costs = await this.creditManager.getNetJobCosts([job.id]);
      await this.repository.updateRun(setId, runId, run => {
        const slot = run.slots.find(item => item.id === slotId);
        if (!slot) return;
        slot.jobId = job.id;
        slot.status = status;
        if (result) slot.result = result;
        if (error) slot.error = error;
        slot.actualCredit = Math.max(0, costs.get(job.id) || 0);
        run.actualTotalCredit = run.slots.reduce((sum, item) => sum + Number(item.actualCredit || 0), 0);
        run.status = aggregateRunStatus(run.slots);
        if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(run.status)) {
          run.completedAt ||= Date.now();
        }
      });
    } catch (errorUpdatingComparison) {
      console.warn(`[Comparison] Could not persist lifecycle for ${job.id}:`, errorUpdatingComparison.message);
    }
  }

  createResponse(set, run, idempotentReplay, enqueuedSlots = null) {
    return {
      setId: set.id,
      runId: run.id,
      status: run.status,
      idempotentReplay,
      jobs: enqueuedSlots || run.slots.map(slot => ({
        slotId: slot.id,
        jobId: slot.jobId,
        providerStreaming: false
      }))
    };
  }
}

function normalizeIdempotencyKey(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(value)) {
    throw new ComparisonError('invalid_idempotency_key', 'A valid idempotency key is required.');
  }
  return value;
}

function normalizeName(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length > 100) throw new ComparisonError('invalid_name', 'Comparison name is too long.');
  return normalized || `AI Comparison ${new Date().toLocaleDateString('en-CA')}`;
}

function normalizeDescription(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length > 1000) throw new ComparisonError('invalid_description', 'Comparison description is too long.');
  return normalized;
}

function createConfigurationSnapshot(context) {
  return {
    selections: structuredClone(context.selections || {}),
    mode: context.mode,
    template: context.template,
    aspectRatio: context.aspectRatio,
    imageResolution: context.imageResolution || null,
    imageReferences: structuredClone(context.imageReferences || {}),
    sourceOwnership: structuredClone(context.sourceOwnership || null),
    referenceJobIds: {
      face: [...(context.faceReferenceJobIds || [])],
      style: [...(context.styleReferenceJobIds || [])],
      character: [...(context.characterReferenceJobIds || [])],
      outfit: [...(context.outfitReferenceJobIds || [])]
    },
    customColors: structuredClone(context.customColors || {}),
    isGptSafe: context.isGptSafe === true
  };
}
