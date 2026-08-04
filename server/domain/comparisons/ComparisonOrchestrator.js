import {
  compileGenerationContext,
  compilePromptFromGenerationContext
} from '../generation/generationRequestService.js';
import { aggregateRunStatus, ComparisonValidator, stripPrivateConfig } from './ComparisonValidator.js';
import { ComparisonError, ComparisonRepository } from '../../repositories/comparisons/ComparisonRepository.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { templateCoreService as defaultTemplateCoreService } from '../templates/TemplateCoreService.js';
import { prepareGenerationReferences } from '../generation/prepareGenerationReferences.js';
import { GenerationApplicationService } from '../generation/GenerationApplicationService.js';

export class ComparisonOrchestrator {
  constructor({
    providerRegistry,
    queueManager,
    creditManager,
    creditReservation = creditApplicationService,
    generationApplicationService = null,
    repository = new ComparisonRepository(),
    templateCoreService = defaultTemplateCoreService
  }) {
    this.providerRegistry = providerRegistry;
    this.creditManager = creditManager;
    this.creditReservation = creditReservation;
    this.repository = repository;
    this.templateCoreService = templateCoreService;
    this.generationApplicationService = generationApplicationService
      || new GenerationApplicationService({
        providerRegistry,
        queueManager,
        templateCoreService,
        creditService: creditReservation
      });
    this.validator = new ComparisonValidator({ providerRegistry });
    this.generationApplicationService.subscribeJobLifecycle?.(
      event => this.handleQueueLifecycle(event)
    );
  }

  async init() {
    await this.repository.init();
  }

  async estimate(payload, actor) {
    const { username, userId } = actor;
    const { payload: executionPayload } = await this.resolveTemplatePayload(payload, actor);
    const { context } = compileGenerationContext(executionPayload, actor);
    await this.processReferencesForSlots(context, payload.slots, actor);
    const slots = this.validator.validateSlots(payload.slots, context);
    const templatePricing = await this.templateCoreService.resolvePricing(
      payload.templateUseSessionId,
      actor,
      1
    );
    const pricedSlots = await Promise.all(slots.map(async slot => {
      const estimate = await this.creditReservation.estimate({
        userId,
        routingMode: 'advanced',
        qualityTier: 'standard',
        generationMode: context.mode || 'normal',
        requestedProviderId: slot.provider,
        requestedModelId: slot.model,
        resolution: slot.imageResolution || '1K',
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        referenceProcessingPlanFingerprint:
          context.referenceProcessing?.planFingerprint || null,
        outputCount: 1,
        templateUseSessionId: payload.templateUseSessionId || null,
        templatePricing
      });
      return { ...slot, estimateId: estimate.estimateId, estimatedCredit: estimate.estimatedCredits, estimateExpiresAt: estimate.expiresAt };
    }));
    return this.validator.createEstimate(pricedSlots, context, userId);
  }

  async create(payload, actor) {
    const { username, userId } = actor;
    const {
      payload: executionPayload,
      templateExecution
    } = await this.resolveTemplatePayload(payload, actor);
    const { context } = compileGenerationContext(executionPayload, actor);
    await this.processReferencesForSlots(context, payload.slots, actor);
    const compiledPrompt = compilePromptFromGenerationContext(context);
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
    this.validator.verifyEstimate(payload.estimateToken, confirmedEstimate, context, userId);

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
      ownerUserId: userId,
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
        const submitted = await this.generationApplicationService.submitPreparedOperation({
          providerId: slot.provider,
          modelId: slot.model,
          estimateId: slot.estimateId,
          requestId: `${idempotencyKey}:${slot.id}`,
          payerUserId: userId,
          payerUsername: username,
          context,
          compiledPrompt,
          streamRequested: payload.stream !== false,
          modelConfig: slot.modelConfig,
          providerConfig: slot.providerConfig,
          generationRequest: {
            requestedProviderId: slot.provider, requestedModelId: slot.model, resolution: slot.imageResolution || '1K',
            aspectRatio: context.aspectRatio,
            quality: null, referenceCount: context.referenceCount,
            referenceProcessingPlanFingerprint:
              context.referenceProcessing?.planFingerprint || null,
            outputCount: 1, routingMode: 'advanced',
            qualityTier: 'standard', generationMode: context.mode || 'normal',
            templateUseSessionId: payload.templateUseSessionId || null,
            requestId: `${idempotencyKey}:${slot.id}`
          },
          reservationMetadata: {
            comparisonSetId: setId,
            comparisonRunId: runId,
            relatedTemplateId: templateExecution?.template.id || null,
            templateVersionId: templateExecution?.version.id || null,
            templateUseSessionId: templateExecution?.session.id || null,
            sourceCommunityPostId: templateExecution?.session.sourceCommunityPostId || null
          },
          beforeEnqueue: templateExecution
            ? jobId => this.templateCoreService.attachGeneration(
              templateExecution.session.id,
              actor,
              jobId
            )
            : null,
          queueOptionOverrides: {
            imageResolution: slot.imageResolution,
            comparison: { setId, runId, slotId: slot.id },
            templateUseContext: templateExecution
              ? {
                templateId: templateExecution.template.id,
                templateVersionId: templateExecution.version.id,
                templateTitle: templateExecution.template.title,
                templateOwnerUsername: templateExecution.template.ownerUsername,
                templateUseSessionId: templateExecution.session.id,
                sourceCommunityPostId: templateExecution.session.sourceCommunityPostId,
                replacementSummary: templateExecution.replacementSummary
              }
              : null
          }
        });
        const enqueuedSlot = {
          slotId: slot.id,
          jobId: submitted.jobId,
          reservationId: submitted.reservation.reservationId,
          providerStreaming: submitted.providerStreaming
        };
        enqueuedSlots.push(enqueuedSlot);
        await this.repository.updateRun(setId, runId, targetRun => {
          const targetSlot = targetRun.slots.find(item => item.id === slot.id);
          if (!targetSlot) return;
          targetSlot.jobId ||= submitted.jobId;
          targetSlot.reservationId ||= submitted.reservation.reservationId;
        });
      }
      const run = await this.repository.updateRun(setId, runId, targetRun => {
        targetRun.slots.forEach(slot => {
          const enqueued = enqueuedSlots.find(item => item.slotId === slot.id);
          if (enqueued) { slot.jobId = enqueued.jobId; slot.reservationId = enqueued.reservationId; }
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

  async list(actor, query = {}) {
    return this.repository.listPage(actor, query);
  }

  async get(setId, actor) {
    let set = await this.repository.get(setId, actor);
    for (const run of set.runs) await this.reconcileRun(set.id, run);
    set = await this.repository.get(setId, actor);
    return this.hydrateSetFromHistory(set, actor);
  }

  async hydrateSetFromHistory(set, actor) {
    const history = await this.repository.readHistory();
    const historyById = new Map(
      history
        .filter(item => {
          if (item.ownerUserId && actor.userId) return item.ownerUserId === actor.userId;
          return (item.ownerUsername || item.username) === actor.username;
        })
        .map(item => [item.id, item])
    );
    const historyByComparisonSlot = new Map(
      history
        .filter(item => {
          if (item.ownerUserId && actor.userId && item.ownerUserId !== actor.userId) return false;
          if (!item.ownerUserId && (item.ownerUsername || item.username) !== actor.username) return false;
          return item.comparisonSetId === set.id
            && item.comparisonRunId
            && item.comparisonSlotId;
        })
        .map(item => [
          comparisonSlotKey(item.comparisonRunId, item.comparisonSlotId),
          item
        ])
    );
    const hydrated = structuredClone(set);
    hydrated.runs?.forEach(run => {
      run.slots?.forEach(slot => {
        const historyItem = historyById.get(slot.jobId)
          || historyByComparisonSlot.get(comparisonSlotKey(run.id, slot.id));
        if (!historyItem) return;
        slot.jobId ||= historyItem.id;
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

  update(setId, actor, payload) {
    return this.repository.updateSet(setId, actor, payload);
  }

  remove(setId, actor) {
    return this.repository.remove(setId, actor);
  }

  setWinner(setId, actor, jobId) {
    return this.repository.setWinner(setId, actor, jobId || null);
  }

  removeHistoryJob(jobId) {
    return this.repository.removeHistoryJob(jobId);
  }

  async reconcileRun(setId, run) {
    const history = await this.repository.readHistory();
    const historyByComparisonSlot = new Map(
      history
        .filter(item =>
          item.comparisonSetId === setId
          && item.comparisonRunId === run.id
          && item.comparisonSlotId
        )
        .map(item => [comparisonSlotKey(item.comparisonRunId, item.comparisonSlotId), item])
    );
    const statuses = await Promise.all(run.slots.map(slot =>
      slot.jobId ? this.generationApplicationService.getJobStatus(slot.jobId) : null
    ));
    const lostSlots = run.slots.filter((slot, index) =>
      slot.jobId
      && !statuses[index]
      && !historyByComparisonSlot.has(comparisonSlotKey(run.id, slot.id))
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
        const historyItem = historyByComparisonSlot.get(comparisonSlotKey(targetRun.id, slot.id));
        if (status) {
          slot.status = status.status;
          slot.result = status.result || slot.result;
          slot.error = status.error || null;
        } else if (historyItem?.imageUrl) {
          slot.jobId ||= historyItem.id;
          slot.status = 'completed';
          slot.result = {
            ...(slot.result || {}),
            imageUrl: slot.result?.imageUrl || historyItem.imageUrl,
            usage: slot.result?.usage || historyItem.usage || null,
            mimeType: slot.result?.mimeType || historyItem.mimeType || null,
            generationDuration: slot.result?.generationDuration
              || historyItem.generationDuration
              || null
          };
          slot.thumbnailUrl ||= historyItem.thumbnailUrl || null;
          slot.error = null;
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

  async resolveTemplatePayload(payload, actor) {
    if (!payload.templateUseSessionId) return { payload, templateExecution: null };
    const templateExecution = await this.templateCoreService.resolveSession(
      payload.templateUseSessionId,
      actor,
      payload.templateReplacements || {}
    );
    return {
      templateExecution,
      payload: {
        ...payload,
        sceneTemplateSnapshot: templateExecution.executionSnapshot,
        selections: templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
        additionalDirection:
          templateExecution.executionSnapshot.additionalDirectionSnapshot || '',
        sceneBuilder: {
          ...(payload.sceneBuilder || {}),
          authoringMode: templateExecution.executionSnapshot.authoringMode || 'guided',
          manualPromptText: templateExecution.executionSnapshot.manualPromptSnapshot
            || templateExecution.executionSnapshot.finalPromptSnapshot
            || ''
        },
        templateBaselineReference: templateExecution.baselineReference?.imageUrl || null,
        authorizedTemplateReferenceJobIds:
          templateExecution.baselineReference?.sourceGenerationId
            ? [templateExecution.baselineReference.sourceGenerationId]
            : []
      }
    };
  }

  async processReferencesForSlots(context, slots, actor) {
    const selections = (slots || []).map(slot =>
      this.providerRegistry.resolveSelection(slot.provider, slot.model)
    );
    const first = selections[0];
    if (!first) return null;
    const maximums = selections.map(selection =>
      Number(selection.model.capabilities?.maxReferenceImages || 0)
    );
    return prepareGenerationReferences(context, {
      actorContext: actor,
      providerId: first.provider.id,
      modelId: first.model.id,
      modelConfig: {
        ...first.model,
        capabilities: {
          ...first.model.capabilities,
          maxReferenceImages: Math.min(...maximums)
        }
      }
    });
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
    referenceProcessingLineage: structuredClone(context.referenceProcessingLineage || null),
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

function comparisonSlotKey(runId, slotId) {
  return `${String(runId || '')}:${String(slotId || '')}`;
}
