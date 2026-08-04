import { characterCastingExportService } from '../character-profiles/CharacterCastingExportService.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { performanceTelemetry } from '../observability/PerformanceTelemetry.js';
import {
  compileGenerationContext,
  compilePromptFromGenerationContext,
  createQueueOptions
} from './generationRequestService.js';
import { prepareGenerationReferences } from './prepareGenerationReferences.js';

export class GenerationApplicationService {
  constructor({
    providerRegistry,
    queueManager,
    templateCoreService,
    creditService = creditApplicationService,
    castingExportService = characterCastingExportService,
    telemetry = performanceTelemetry
  }) {
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.templateCoreService = templateCoreService;
    this.creditService = creditService;
    this.castingExportService = castingExportService;
    this.telemetry = telemetry;
  }

  async preview(body, actorContext, userRole) {
    const finish = this.telemetry.start('generation.prompt_preview');
    try {
      const templateExecution = await this.resolveTemplateExecution(body, actorContext);
      const requestPayload = createGenerationRequestPayload(body, userRole, templateExecution);
      const { provider, model } = this.providerRegistry.resolveSelection(
        body.provider,
        body.submodel
      );
      const { context } = compileGenerationContext(requestPayload, actorContext);
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

  async submit({ body, actorContext, userRole, requestId }) {
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
        body.submodel
      );
      const templateExecution = await this.resolveTemplateExecution(body, actorContext);
      const requestPayload = createGenerationRequestPayload(body, userRole, templateExecution);
      const { context } = compileGenerationContext(requestPayload, actorContext);
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
      const compiledPrompt = compilePromptFromGenerationContext(context);
      this.providerRegistry.validateRequest(model, {
        aspectRatio: context.aspectRatio,
        referenceCount: context.referenceCount,
        imageResolution: context.imageResolution || model.defaults?.resolution || null
      });

      const operationRequestId = body.requestId || requestId;
      const result = await this.submitPreparedOperation({
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
            templateExecution?.session.sourceCommunityPostId || null
        },
        beforeEnqueue: templateExecution
          ? jobId => this.templateCoreService.attachGeneration(
            templateExecution.session.id,
            actorContext,
            jobId
          )
          : null,
        queueOptionOverrides: {
          templateUseContext: createTemplateUseContext(templateExecution)
        }
      });
      finish('ok', { jobId: result.jobId });
      return result;
    } catch (error) {
      finish('error');
      throw error;
    }
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
    queueOptionOverrides = {}
  }) {
    const jobId = this.queueManager.createJobId();
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
    refundOnFailure = true
  }) {
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
