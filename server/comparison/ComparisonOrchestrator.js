import { compileGenerationContext, createQueueOptions } from '../generationRequestService.js';
import { aggregateRunStatus, ComparisonValidator, stripPrivateConfig } from './ComparisonValidator.js';
import { ComparisonError, ComparisonRepository } from './ComparisonRepository.js';

export class ComparisonOrchestrator {
  constructor({ providerRegistry, queueManager, creditManager, repository = new ComparisonRepository() }) {
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.creditManager = creditManager;
    this.repository = repository;
    this.validator = new ComparisonValidator({ providerRegistry });
    this.queueManager.subscribeLifecycle?.(event => this.handleQueueLifecycle(event));
  }

  async init() {
    await this.repository.init();
  }

  async estimate(payload, username) {
    const { context } = compileGenerationContext(payload);
    const slots = this.validator.validateSlots(payload.slots, context);
    return this.validator.createEstimate(slots, context, username);
  }

  async create(payload, username) {
    const { context, compiledPrompt } = compileGenerationContext(payload);
    const slots = this.validator.validateSlots(payload.slots, context);
    const confirmedEstimate = {
      slots: slots.map(stripPrivateConfig),
      estimatedTotalCredit: slots.reduce((total, slot) => total + slot.estimatedCredit, 0),
      providerConfigVersion: this.providerRegistry.getConfigVersion(),
      expiresAt: Number(payload.estimateExpiresAt || 0)
    };
    this.validator.verifyEstimate(payload.estimateToken, confirmedEstimate, context, username);
    await this.creditManager.assertBalance(username, confirmedEstimate.estimatedTotalCredit);

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
      slots: slots.map(slot => ({
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
      for (const slot of slots) {
        const stream = this.providerRegistry.shouldStream(slot.providerConfig, slot.modelConfig, payload.stream !== false);
        const jobId = this.queueManager.enqueue(slot.provider, slot.model, compiledPrompt, createQueueOptions(context, {
          username,
          stream,
          modelConfig: slot.modelConfig,
          providerConfigVersion: this.providerRegistry.getConfigVersion(),
          creditCost: slot.estimatedCredit,
          comparison: { setId, runId, slotId: slot.id }
        }));
        enqueuedSlots.push({ slotId: slot.id, jobId, providerStreaming: stream });
      }
      const run = await this.repository.updateRun(setId, runId, targetRun => {
        targetRun.slots.forEach(slot => {
          const enqueued = enqueuedSlots.find(item => item.slotId === slot.id);
          if (enqueued) slot.jobId = enqueued.jobId;
        });
      });
      return this.createResponse(created.set, run, false, enqueuedSlots);
    } catch (error) {
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

  async list(username) {
    const sets = await this.repository.list(username);
    return { sets };
  }

  async get(setId, username) {
    const set = await this.repository.get(setId, username);
    for (const run of set.runs) await this.reconcileRun(set.id, run, set.username);
    return this.repository.get(setId, username);
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
    await Promise.all(lostSlots.map(slot => this.creditManager.refundLostJob(
      username,
      slot.jobId,
      { comparisonSetId: setId, comparisonRunId: run.id }
    )));
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
    referenceJobIds: {
      face: [...(context.faceReferenceJobIds || [])],
      style: [...(context.styleReferenceJobIds || [])],
      character: [...(context.characterReferenceJobIds || [])]
    },
    customColors: structuredClone(context.customColors || {}),
    isGptSafe: context.isGptSafe === true
  };
}
