import { characterCastingExportService } from '../character-profiles/CharacterCastingExportService.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { performanceTelemetry } from '../observability/PerformanceTelemetry.js';
import {
  compileGenerationContext,
  compilePromptFromGenerationContext,
  createQueueOptions
} from './generationRequestService.js';
import { prepareGenerationReferences } from './prepareGenerationReferences.js';
import { promptRefinementService as defaultPromptRefinementService } from './PromptRefinementService.js';
import { generationGroupRepository as defaultGenerationGroupRepository } from '../../repositories/generation/GenerationGroupRepository.js';

export class GenerationApplicationService {
  constructor({
    providerRegistry,
    queueManager,
    templateCoreService,
    creditService = creditApplicationService,
    castingExportService = characterCastingExportService,
    telemetry = performanceTelemetry,
    promptRefinementService = defaultPromptRefinementService,
    generationGroupRepository = defaultGenerationGroupRepository
  }) {
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.templateCoreService = templateCoreService;
    this.creditService = creditService;
    this.castingExportService = castingExportService;
    this.telemetry = telemetry;
    this.promptRefinementService = promptRefinementService;
    this.generationGroupRepository = generationGroupRepository;
    this.queueManager.subscribeLifecycle?.(event => this.handleGroupLifecycle(event));
  }

  async preview(body, actorContext, userRole) {
    const finish = this.telemetry.start('generation.prompt_preview');
    try {
      const templateExecution = await this.resolveTemplateExecution(body, actorContext);
      const requestPayload = createGenerationRequestPayload(body, userRole, templateExecution);
      const { provider, model } = this.providerRegistry.resolveSelection(
        body.provider,
        body.submodel,
        {
          generationSurface: body.generationSurface,
          generationMode: body.generationMode
        }
      );
      const { context } = compileGenerationContext(requestPayload, actorContext);
      assertSupportedOutputCount(context);
      await prepareGenerationReferences(context, {
        actorContext,
        providerId: provider.id,
        modelId: model.id,
        modelConfig: model
      });
      const compiledPrompt = compilePromptFromGenerationContext(context);
      finish('ok');
      return { compiledPrompt };
    } catch (error) {
      finish('error');
      throw error;
    }
  }

  async submit({
    body,
    actorContext,
    userRole,
    requestId,
    internalJobId = null,
    internalGroupContext = null,
    internalReservationMetadata = null
  }) {
    const finish = this.telemetry.start('generation.submit', { requestId });
    const payerUserId = actorContext?.userId;
    const payerUsername = actorContext?.username;
    if (!payerUserId || !payerUsername) {
      const error = new Error('Generation requires an authenticated actor context.');
      error.statusCode = 401;
      error.code = 'actor_required';
      finish('error');
      throw error;
    }

    try {
      const { provider, model } = this.providerRegistry.resolveSelection(
        body.provider,
        body.submodel,
        {
          generationSurface: body.generationSurface,
          generationMode: body.generationMode
        }
      );
      const templateExecution = await this.resolveTemplateExecution(body, actorContext);
      const requestPayload = createGenerationRequestPayload(body, userRole, templateExecution);
      const { context } = compileGenerationContext(requestPayload, actorContext);
      assertSupportedOutputCount(context);
      await this.castingExportService.validateGenerationContext(
        context.characterProfileContext,
        actorContext
      );
      await prepareGenerationReferences(context, {
        actorContext,
        providerId: provider.id,
        modelId: model.id,
        modelConfig: model
      });
      this.providerRegistry.validateRequest(model, {
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        imageResolution: context.imageResolution || model.defaults?.resolution || null
      });
      const operationRequestId = body.requestId || requestId;
      const promptExecution = await this.compilePromptForExecution(context, {
        requestId: operationRequestId
      });
      const compiledPrompt = promptExecution.prompt;

      const operation = {
        providerId: provider.id,
        modelId: model.id,
        estimateId: body.estimateId,
        requestId: operationRequestId,
        payerUserId,
        payerUsername,
        context,
        compiledPrompt,
        streamRequested: body.stream !== false,
        modelConfig: model,
        providerConfig: provider,
        generationRequest: {
          requestedProviderId: provider.id,
          requestedModelId: model.id,
          resolution: context.imageResolution || model.defaults?.resolution || '1K',
          aspectRatio: context.aspectRatio,
          quality: body.quality || null,
          referenceCount: context.referenceCount,
          referenceProcessingPlanFingerprint:
            context.referenceProcessing?.planFingerprint || null,
          outputCount: context.outputCount,
          routingMode: body.routingMode || 'advanced',
          qualityTier: body.qualityTier || 'standard',
          generationMode: body.generationMode
            || (context.generationSurface === 'playground' ? 'playground' : body.mode || 'scene'),
          templateUseSessionId: body.templateUseSessionId || null,
          requestId: operationRequestId
        },
        reservationMetadata: {
          requestId: operationRequestId,
          relatedTemplateId:
            templateExecution?.template.id || context.sceneTemplateSnapshot?.id || null,
          templateVersionId: templateExecution?.version.id || null,
          templateUseSessionId: templateExecution?.session.id || null,
          sourceCommunityPostId:
            templateExecution?.session.sourceCommunityPostId || null,
          ...(internalReservationMetadata || {})
        },
        beforeEnqueue: templateExecution
          ? jobId => this.templateCoreService.attachGeneration(
            templateExecution.session.id,
            actorContext,
            jobId
          )
          : null,
        queueOptionOverrides: {
          templateUseContext: createTemplateUseContext(templateExecution),
          promptRefinement: promptExecution.metadata,
          ...(internalGroupContext ? {
            generationGroupId: internalGroupContext.groupId,
            outputIndex: internalGroupContext.outputIndex,
            requestedOutputCount: internalGroupContext.requestedOutputCount
          } : {})
        },
        promptRefinementAudit: promptExecution.audit,
        jobId: internalJobId
      };
      const result = context.outputCount > 1
        ? await this.submitPreparedGroup(operation)
        : await this.submitPreparedOperation(operation);
      finish('ok', { jobId: result.jobId, groupId: result.groupId || null });
      return result;
    } catch (error) {
      finish('error');
      throw error;
    }
  }

  async submitBatch({
    operations,
    actorContext,
    userRole,
    requestId,
    generationSurface = null,
    generationMode = null,
    metadata = null,
    beforeEnqueue = null
  }) {
    const payerUserId = actorContext?.userId;
    const payerUsername = actorContext?.username;
    if (!payerUserId || !payerUsername) {
      const error = new Error('Generation requires an authenticated actor context.');
      error.statusCode = 401;
      error.code = 'actor_required';
      throw error;
    }
    if (!requestId || !Array.isArray(operations) || !operations.length) {
      const error = new Error('A non-empty Generation batch and request ID are required.');
      error.statusCode = 400;
      error.code = 'generation_batch_invalid';
      throw error;
    }
    const existing = await this.generationGroupRepository.findByRequest(payerUserId, requestId);
    if (existing) {
      if (beforeEnqueue) {
        await beforeEnqueue({
          groupId: existing.id,
          children: structuredClone(existing.children || [])
        });
      }
      return batchSubmissionResult(existing);
    }

    const groupId = `ggrp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const children = operations.map((operation, outputIndex) => ({
      outputIndex,
      operationId: operation.operationId || `operation_${outputIndex + 1}`,
      sceneId: operation.sceneId || null,
      shotId: operation.shotId || null,
      expectedShotVersion: operation.expectedShotVersion || null,
      estimateId: operation.estimateId || operation.body?.estimateId || null,
      metadata: operation.metadata ? structuredClone(operation.metadata) : null,
      jobId: this.queueManager.createJobId(),
      status: 'planned',
      result: null,
      error: null
    }));
    const now = new Date().toISOString();
    await this.generationGroupRepository.create({
      schemaVersion: 2,
      id: groupId,
      groupType: 'heterogeneous_batch',
      actorUserId: payerUserId,
      actorUsername: payerUsername,
      requestId,
      estimateId: null,
      requestedOutputCount: children.length,
      generationSurface,
      generationMode,
      metadata: metadata ? structuredClone(metadata) : null,
      status: 'queued',
      childJobIds: children.map(child => child.jobId),
      children,
      enqueueFailures: [],
      completedCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    });

    if (beforeEnqueue) {
      try {
        await beforeEnqueue({ groupId, children: structuredClone(children) });
      } catch (error) {
        for (const child of children) {
          await this.generationGroupRepository.recordChildStatus(groupId, {
            jobId: child.jobId,
            status: 'failed',
            result: null,
            error: {
              code: error.code || 'generation_batch_registration_failed',
              message: error.message || 'The batch could not be registered before enqueue.'
            }
          });
        }
        throw error;
      }
    }

    const enqueueFailures = [];
    for (const [outputIndex, operation] of operations.entries()) {
      const child = children[outputIndex];
      try {
        await this.submit({
          body: {
            ...(operation.body || {}),
            outputCount: 1,
            estimateId: operation.estimateId || operation.body?.estimateId,
            requestId: `${requestId}:child:${outputIndex}`
          },
          actorContext,
          userRole,
          requestId: `${requestId}:child:${outputIndex}`,
          internalJobId: child.jobId,
          internalGroupContext: {
            groupId,
            outputIndex,
            requestedOutputCount: children.length
          },
          internalReservationMetadata: {
            batchId: groupId,
            operationId: child.operationId,
            sceneId: child.sceneId,
            shotId: child.shotId,
            ...(operation.metadata || {})
          }
        });
      } catch (error) {
        const failure = {
          jobId: child.jobId,
          outputIndex,
          operationId: child.operationId,
          sceneId: child.sceneId,
          shotId: child.shotId,
          error: {
            code: error.code || 'generation_enqueue_failed',
            message: error.message || 'This batch operation could not be queued.'
          }
        };
        enqueueFailures.push(failure);
        await this.generationGroupRepository.recordChildStatus(groupId, {
          ...failure,
          status: 'failed',
          result: null
        });
      }
    }
    if (enqueueFailures.length) {
      await this.generationGroupRepository.update(groupId, { enqueueFailures });
    }
    const group = await this.generationGroupRepository.findById(groupId);
    return batchSubmissionResult(group);
  }

  async compilePromptForExecution(context, { requestId = null } = {}) {
    const canonicalPrompt = compilePromptFromGenerationContext(context);
    return this.promptRefinementService.refine({
      prompt: canonicalPrompt,
      requested: context.promptRefinement?.enabled === true,
      context,
      requestId
    });
  }

  async submitPreparedOperation({
    providerId,
    modelId,
    estimateId,
    requestId,
    payerUserId,
    payerUsername,
    context,
    compiledPrompt,
    streamRequested = true,
    modelConfig,
    providerConfig,
    generationRequest,
    reservationMetadata = {},
    beforeEnqueue = null,
    queueOptionOverrides = {},
    promptRefinementAudit = null,
    jobId: preparedJobId = null,
    providerWorkflow = null
  }) {
    const jobId = preparedJobId || this.queueManager.createJobId();
    this.providerRegistry.assertRuntimeAvailable(providerId, modelId, {
      generationSurface: context.generationSurface,
      generationMode: generationRequest?.generationMode || context.generationMode,
      workflow: providerWorkflow
    });
    const reservationResult = await this.creditService.validateAndReserveForRequest({
      userId: payerUserId,
      estimateId,
      generationRequest,
      metadata: { ...reservationMetadata, jobId }
    });
    const stream = this.providerRegistry.shouldStream(
      providerConfig,
      modelConfig,
      streamRequested
    );

    try {
      await beforeEnqueue?.(jobId);
      this.queueManager.enqueue(
        providerId,
        modelId,
        compiledPrompt,
        createQueueOptions(context, {
          jobId,
          username: payerUsername,
          stream,
          modelConfig,
          providerConfigVersion: this.providerRegistry.getConfigVersion(),
          reservationId: reservationResult.reservation.reservationId,
          pricingSnapshot: reservationResult.reservation.pricingSnapshot,
          payerUserId,
          estimateId,
          requestId,
          ...queueOptionOverrides
        })
      );
      await this.promptRefinementService.persistAudit?.(jobId, promptRefinementAudit)
        .catch(error => {
          console.warn(`[Generation] Prompt refinement audit write failed for ${jobId}:`, error.message);
        });
    } catch (error) {
      await this.creditService.refundForJob({
        userId: payerUserId,
        reservationId: reservationResult.reservation.reservationId,
        jobId,
        reasonCode: 'enqueue_failed'
      }).catch(refundError => {
        console.error('[Generation] Immediate refund failed:', refundError.message);
      });
      throw error;
    }

    return {
      jobId,
      status: 'queued',
      providerStreaming: stream,
      reservation: {
        reservationId: reservationResult.reservation.reservationId,
        amountCredits: reservationResult.reservation.amountCredits
      }
    };
  }

  async submitPreparedGroup({
    providerId,
    modelId,
    estimateId,
    requestId,
    payerUserId,
    payerUsername,
    context,
    compiledPrompt,
    streamRequested = true,
    modelConfig,
    providerConfig,
    generationRequest,
    reservationMetadata = {},
    beforeEnqueue = null,
    queueOptionOverrides = {},
    promptRefinementAudit = null,
    providerWorkflow = null
  }) {
    const existing = await this.generationGroupRepository.findByRequest(
      payerUserId,
      requestId
    );
    if (existing) {
      return {
        groupId: existing.id,
        jobId: existing.childJobIds[0] || null,
        status: existing.status,
        requestedOutputCount: existing.requestedOutputCount,
        childJobIds: [...existing.childJobIds]
      };
    }
    this.providerRegistry.assertRuntimeAvailable(providerId, modelId, {
      generationSurface: context.generationSurface,
      generationMode: generationRequest?.generationMode || context.generationMode,
      workflow: providerWorkflow
    });
    const requestedOutputCount = context.outputCount;
    const groupId = `ggrp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const children = Array.from({ length: requestedOutputCount }, (_, outputIndex) => ({
      outputIndex,
      jobId: this.queueManager.createJobId()
    }));
    const reservationResult = await this.creditService.reserveGenerationGroup({
      userId: payerUserId,
      estimateId,
      generationRequest,
      groupId,
      children,
      metadata: reservationMetadata
    });
    const now = new Date().toISOString();
    try {
      await this.generationGroupRepository.create({
        schemaVersion: 1,
        id: groupId,
        actorUserId: payerUserId,
        actorUsername: payerUsername,
        requestId,
        estimateId,
        requestedOutputCount,
        generationSurface: context.generationSurface || null,
        generationMode: generationRequest.generationMode || null,
        status: 'queued',
        childJobIds: children.map(child => child.jobId),
        children: children.map(child => ({
          ...child,
          status: 'queued',
          result: null,
          error: null
        })),
        enqueueFailures: [],
        completedCount: 0,
        failedCount: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      });
    } catch (error) {
      await Promise.allSettled(reservationResult.reservations.map(reservation =>
        this.creditService.refundForJob({
          userId: payerUserId,
          reservationId: reservation.reservationId,
          jobId: reservation.jobId,
          reasonCode: 'group_persistence_failed'
        })
      ));
      throw error;
    }
    const reservationsByJobId = new Map(
      reservationResult.reservations.map(reservation => [reservation.jobId, reservation])
    );
    const enqueueFailures = [];
    for (const child of children) {
      const reservation = reservationsByJobId.get(child.jobId);
      if (!reservation) {
        enqueueFailures.push({
          jobId: child.jobId,
          outputIndex: child.outputIndex,
          error: {
            code: 'generation_group_reservation_missing',
            message: 'This output did not receive a Credit reservation.'
          }
        });
        continue;
      }
      try {
        await this.enqueueReservedOperation({
          jobId: child.jobId,
          providerId,
          modelId,
          payerUserId,
          payerUsername,
          context: { ...context, outputCount: 1 },
          compiledPrompt,
          modelConfig,
          providerConfig,
          reservation,
          estimateId,
          requestId: `${requestId}:output:${child.outputIndex}`,
          streamRequested,
          beforeEnqueue,
          queueOptionOverrides: {
            ...queueOptionOverrides,
            generationGroupId: groupId,
            outputIndex: child.outputIndex,
            requestedOutputCount
          },
          refundReasonCode: 'group_child_enqueue_failed',
          providerWorkflow
        });
        if (child.outputIndex === 0) {
          await this.promptRefinementService.persistAudit?.(child.jobId, promptRefinementAudit)
            .catch(error => {
              console.warn(`[Generation] Prompt refinement audit write failed for ${child.jobId}:`, error.message);
            });
        }
      } catch (error) {
        enqueueFailures.push({
          jobId: child.jobId,
          outputIndex: child.outputIndex,
          error: {
            code: error.code || 'generation_enqueue_failed',
            message: error.message || 'This output could not be queued.'
          }
        });
      }
    }
    if (enqueueFailures.length) {
      await this.generationGroupRepository.update(groupId, { enqueueFailures });
    }
    return {
      groupId,
      jobId: children[0]?.jobId || null,
      status: enqueueFailures.length === children.length ? 'failed' : 'queued',
      requestedOutputCount,
      childJobIds: children.map(child => child.jobId),
      reservation: {
        amountCredits: reservationResult.reservations.reduce(
          (sum, reservation) => sum + Number(reservation.amountCredits || 0),
          0
        )
      }
    };
  }

  async enqueueReservedOperation({
    jobId,
    providerId,
    modelId,
    payerUserId,
    payerUsername,
    context,
    compiledPrompt,
    modelConfig,
    providerConfig,
    reservation,
    estimateId = null,
    requestId = null,
    streamRequested = true,
    beforeEnqueue = null,
    queueOptionOverrides = {},
    refundReasonCode = 'enqueue_failed',
    refundOnFailure = true,
    providerWorkflow = null
  }) {
    try {
      this.providerRegistry.assertRuntimeAvailable(providerId, modelId, {
        generationSurface: context.generationSurface,
        generationMode: context.generationMode,
        workflow: providerWorkflow
      });
      const stream = this.providerRegistry.shouldStream(
        providerConfig,
        modelConfig,
        streamRequested
      );
      await beforeEnqueue?.(jobId);
      this.queueManager.enqueue(
        providerId,
        modelId,
        compiledPrompt,
        createQueueOptions(context, {
          jobId,
          username: payerUsername,
          stream,
          modelConfig,
          providerConfigVersion: this.providerRegistry.getConfigVersion(),
          reservationId: reservation.reservationId,
          pricingSnapshot: reservation.pricingSnapshot,
          payerUserId,
          estimateId,
          requestId,
          ...queueOptionOverrides
        })
      );
      return { jobId, providerStreaming: stream, reservation };
    } catch (error) {
      if (refundOnFailure) {
        await this.creditService.refundForJob({
          userId: payerUserId,
          reservationId: reservation.reservationId,
          jobId,
          reasonCode: refundReasonCode
        }).catch(refundError => {
          console.error('[Generation] Immediate refund failed:', refundError.message);
        });
      }
      throw error;
    }
  }

  getJobStatus(jobId) {
    return this.queueManager.getJobStatus(jobId);
  }

  getJobStatusForUser(jobId, username) {
    return this.queueManager.getJobStatusForUser(jobId, username);
  }

  async getGroupStatusForActor(groupId, actorContext) {
    const group = await this.generationGroupRepository.findById(groupId);
    if (!group || !actorContext?.userId || group.actorUserId !== actorContext.userId) {
      return null;
    }
    const enqueueFailureByJob = new Map(
      (group.enqueueFailures || []).map(failure => [failure.jobId, failure])
    );
    const persistedByJob = new Map(
      (group.children || []).map(child => [child.jobId, child])
    );
    const orphanGraceMs = Math.max(
      5_000,
      Number(process.env.GENERATION_GROUP_ORPHAN_GRACE_MS || 30_000)
    );
    const groupAgeMs = Date.now() - Date.parse(group.updatedAt || group.createdAt || 0);
    const children = await Promise.all(group.childJobIds.map(async (jobId, outputIndex) => {
      const failure = enqueueFailureByJob.get(jobId);
      if (failure) {
        return { jobId, outputIndex, status: 'failed', result: null, error: failure.error };
      }
      const status = await this.queueManager.getJobStatusForUser(jobId, group.actorUsername);
      if (!status) {
        const persisted = persistedByJob.get(jobId);
        if (
          groupAgeMs >= orphanGraceMs
          && !['completed', 'failed'].includes(persisted?.status || '')
        ) {
          return {
            jobId,
            outputIndex,
            status: 'failed',
            result: null,
            error: {
              code: 'generation_job_reconciliation_required',
              message: 'This Image job did not survive a server restart and was not replayed.'
            }
          };
        }
        return persisted || {
          jobId,
          outputIndex,
          status: 'queued',
          result: null,
          error: null
        };
      }
      return {
        jobId,
        outputIndex,
        status: status?.status || 'queued',
        result: status?.result || null,
        error: status?.error || null,
        creditCost: status?.creditCost || 0,
        creditCharged: status?.creditCharged === true,
        creditRefunded: status?.creditRefunded === true,
        timings: status?.timings || null
      };
    }));
    const completedCount = children.filter(child => child.status === 'completed').length;
    const failedCount = children.filter(child => child.status === 'failed').length;
    const terminalCount = completedCount + failedCount;
    const status = terminalCount === group.requestedOutputCount
      ? completedCount === group.requestedOutputCount
        ? 'completed'
        : completedCount > 0 ? 'partially_completed' : 'failed'
      : children.some(child => child.status === 'processing' || child.status === 'completed')
        ? 'running'
        : 'queued';
    const terminal = ['completed', 'partially_completed', 'failed'].includes(status);
    if (status !== group.status || completedCount !== group.completedCount
      || failedCount !== group.failedCount) {
      await this.generationGroupRepository.update(group.id, {
        status,
        completedCount,
        failedCount,
        children,
        completedAt: terminal ? (group.completedAt || new Date().toISOString()) : null
      });
    }
    return {
      id: group.id,
      status,
      requestedOutputCount: group.requestedOutputCount,
      completedCount,
      failedCount,
      estimateId: group.estimateId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt || group.createdAt,
      completedAt: terminal ? (group.completedAt || new Date().toISOString()) : null,
      generationSurface: group.generationSurface || null,
      generationMode: group.generationMode || null,
      children
    };
  }

  async handleGroupLifecycle({ job, status, result = null, error = null }) {
    const groupId = job?.options?.generationGroupId;
    if (!groupId || !job?.id) return null;
    const publicStatus = await this.queueManager.getJobStatusForUser(
      job.id,
      job.options.username
    );
    return this.generationGroupRepository.recordChildStatus(groupId, {
      jobId: job.id,
      outputIndex: Number.isInteger(job.options.outputIndex) ? job.options.outputIndex : 0,
      status,
      result: status === 'completed' ? (publicStatus?.result || result || job.result || null) : null,
      error: status === 'failed' ? (publicStatus?.error || error || job.error || null) : null,
      creditCost: Number(publicStatus?.creditCost || job.options.pricingSnapshot?.estimatedCredits || 0),
      creditCharged: publicStatus?.creditCharged === true || job.creditCharged === true,
      creditRefunded: publicStatus?.creditRefunded === true || job.creditRefunded === true,
      timings: publicStatus?.timings || null
    });
  }

  addJobListener(jobId, response, username) {
    return this.queueManager.addListener(jobId, response, username);
  }

  removeJobListener(jobId, response) {
    return this.queueManager.removeListener(jobId, response);
  }

  subscribeJobLifecycle(listener) {
    return this.queueManager.subscribeLifecycle(listener);
  }

  async resolveTemplateExecution(body, actorContext) {
    return body.templateUseSessionId
      ? this.templateCoreService.resolveSession(
        body.templateUseSessionId,
        actorContext,
        body.templateReplacements || {}
      )
      : null;
  }
}

function createGenerationRequestPayload(body, userRole, templateExecution) {
  if (!templateExecution) return { ...body, userRole };
  return {
    ...body,
    sceneTemplateSnapshot: templateExecution.executionSnapshot,
    selections: templateExecution.executionSnapshot.structuredSelectionsSnapshot || {},
    additionalDirection:
      templateExecution.executionSnapshot.additionalDirectionSnapshot || '',
    sceneBuilder: {
      ...(body.sceneBuilder || {}),
      authoringMode: templateExecution.executionSnapshot.authoringMode || 'guided',
      manualPromptText: templateExecution.executionSnapshot.manualPromptSnapshot
        || templateExecution.executionSnapshot.finalPromptSnapshot
        || ''
    },
    templateBaselineReference: templateExecution.baselineReference?.imageUrl || null,
    authorizedTemplateReferenceJobIds:
      templateExecution.baselineReference?.sourceGenerationId
        ? [templateExecution.baselineReference.sourceGenerationId]
        : [],
    userRole
  };
}

function batchSubmissionResult(group) {
  const children = Array.isArray(group?.children) ? group.children : [];
  return {
    batchId: group?.id || null,
    groupId: group?.id || null,
    status: group?.status || 'queued',
    requestedOutputCount: Number(group?.requestedOutputCount || children.length),
    acceptedCount: children.filter(child => child.status !== 'failed').length,
    failedCount: children.filter(child => child.status === 'failed').length,
    children: children.map(child => ({
      operationId: child.operationId || null,
      sceneId: child.sceneId || null,
      shotId: child.shotId || null,
      jobId: child.jobId,
      status: child.status || 'queued',
      error: child.error || null
    }))
  };
}

function createTemplateUseContext(templateExecution) {
  if (!templateExecution) return null;
  return {
    templateId: templateExecution.template.id,
    templateVersionId: templateExecution.version.id,
    templateTitle: templateExecution.template.title,
    templateOwnerUsername: templateExecution.template.ownerUsername,
    templateUseSessionId: templateExecution.session.id,
    sourceCommunityPostId: templateExecution.session.sourceCommunityPostId,
    replacementSummary: templateExecution.replacementSummary
  };
}

export function assertSupportedOutputCount(context) {
  if (context.generationSurface === 'fashion') return;
  const count = Number(context.outputCount);
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    const error = new Error('Output count must be an integer from 1 through 4.');
    error.statusCode = 400;
    error.code = 'generation_output_count_invalid';
    throw error;
  }
}
