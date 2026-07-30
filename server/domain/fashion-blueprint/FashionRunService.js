import {
  compilePromptFromGenerationContext,
  createQueueOptions
} from '../generation/generationRequestService.js';
import { creditReservationService } from '../credits/CreditReservationService.js';
import { fashionBlueprintRunRepository } from '../../repositories/fashion-blueprint/FashionBlueprintRunRepository.js';
import { fashionError } from './FashionBlueprintService.js';
import { createFashionPlanHash } from './FashionPlanHash.js';
import { templateCoreService as defaultTemplateCoreService } from '../templates/TemplateCoreService.js';
import { createFashionExecutionContext } from './FashionGenerationContext.js';

export class FashionRunService {
  constructor({
    quoteService,
    providerRegistry,
    queueManager,
    reservationService = creditReservationService,
    runRepository = fashionBlueprintRunRepository,
    templateCoreService = defaultTemplateCoreService
  }) {
    this.quoteService = quoteService;
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.reservationService = reservationService;
    this.runRepository = runRepository;
    this.templateCoreService = templateCoreService;
    this.inFlightRuns = new Map();
  }

  async createRun(request, actorContext) {
    const key = `${actorContext.userId}:${request.idempotencyKey || ''}`;
    if (this.inFlightRuns.has(key)) return this.inFlightRuns.get(key);
    const operation = this.createRunInternal(request, actorContext);
    this.inFlightRuns.set(key, operation);
    try {
      return await operation;
    } finally {
      this.inFlightRuns.delete(key);
    }
  }

  async createRunInternal({ quoteId, plan: input, idempotencyKey }, actorContext) {
    if (!idempotencyKey) throw fashionError('fashion_idempotency_required', 'An idempotency key is required.');
    const requestHash = createFashionPlanHash({ quoteId, plan: input });
    const duplicate = await this.runRepository.findByIdempotencyKey(actorContext.userId, idempotencyKey);
    if (duplicate) {
      if (duplicate.requestHash && duplicate.requestHash !== requestHash) {
        throw fashionError(
          'fashion_idempotency_conflict',
          'The idempotency key was already used with different Fashion inputs.',
          409
        );
      }
      return this.hydrateRun(duplicate, actorContext);
    }
    const { quote, plan } = await this.quoteService.validateQuote(quoteId, input, actorContext);
    const { provider, model } = this.providerRegistry.resolveSelection(plan.route.providerId, plan.route.modelId);
    const requestFingerprint = createFashionPlanHash({
      actorUserId: actorContext.userId,
      quoteId,
      idempotencyKey
    }).slice(0, 18);
    const planId = `fpl_${requestFingerprint}`;
    const operations = quote.operations.map((quoted, index) => {
      const item = plan.productItems[index];
      const requestId = `fgen_${planId}_${index}`;
      const jobId = `job_fashion_${requestFingerprint}_${index + 1}`;
      return {
        operationId: quoted.operationId,
        productItemKey: item.key,
        productName: item.name,
        requestId,
        jobId,
        estimateId: quoted.estimateId,
        generationRequest: {
          providerId: plan.route.providerId,
          modelId: plan.route.modelId,
          resolution: plan.resolution,
          aspectRatio: plan.aspectRatio,
          referenceCount: new Set(Object.values(item.references).filter(Boolean)).size,
          outputCount: plan.outputCountPerProduct,
          generationMode: 'fashion',
          templateUseSessionId: plan.templateUseSessionId
        }
      };
    });
    for (const operation of operations) {
      const item = plan.productItems.find(
        candidate => candidate.key === operation.productItemKey
      );
      const execution = await createFashionExecutionContext({
        plan,
        item,
        actorContext,
        providerRegistry: this.providerRegistry,
        templateCoreService: this.templateCoreService
      });
      operation.templateExecution = execution.templateExecution;
      operation.payload = execution.payload;
      operation.context = execution.context;
      operation.generationRequest.referenceCount = execution.context.referenceCount;
      operation.generationRequest.referenceProcessingPlanFingerprint =
        execution.context.referenceProcessing.planFingerprint;
      operation.generationRequest.outputCount = execution.context.outputCount;
    }
    const reservationResult = await this.reservationService.reservePlan({
      userId: actorContext.userId,
      quoteId,
      planId,
      operations,
      idempotencyKey
    });
    const run = {
      schemaVersion: 1,
      id: `frun_${requestFingerprint}`,
      planId,
      quoteId,
      actorUserId: actorContext.userId,
      idempotencyKey,
      requestHash,
      status: 'queued',
      operations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      const reservation = reservationResult.reservations[index];
      try {
        const existingStatus = await this.queueManager.getJobStatus(operation.jobId);
        if (existingStatus) {
          run.operations.push({
            operationId: operation.operationId,
            productItemKey: operation.productItemKey,
            productName: operation.productName,
            jobId: operation.jobId,
            reservationId: reservation.reservationId,
            status: existingStatus.status
          });
          continue;
        }
        const prompt = compilePromptFromGenerationContext(operation.context);
        await this.templateCoreService.attachGeneration(
          operation.templateExecution.session.id,
          actorContext,
          operation.jobId
        );
        this.queueManager.enqueue(provider.id, model.id, prompt, createQueueOptions(operation.context, {
          jobId: operation.jobId,
          username: actorContext.username,
          stream: this.providerRegistry.shouldStream(provider, model, true),
          modelConfig: model,
          providerConfigVersion: this.providerRegistry.getConfigVersion(),
          reservationId: reservation.reservationId,
          pricingSnapshot: reservation.pricingSnapshot,
          payerUserId: actorContext.userId,
          estimateId: operation.estimateId,
          requestId: operation.requestId,
          templateUseContext: {
            templateId: operation.templateExecution.template.id,
            templateVersionId: operation.templateExecution.version.id,
            templateUseSessionId: operation.templateExecution.session.id,
            sourceCommunityPostId: operation.templateExecution.session.sourceCommunityPostId,
            replacementSummary: operation.templateExecution.replacementSummary
          }
        }));
        run.operations.push({
          operationId: operation.operationId,
          productItemKey: operation.productItemKey,
          productName: operation.productName,
          jobId: operation.jobId,
          reservationId: reservation.reservationId,
          status: 'queued'
        });
      } catch (error) {
        await this.reservationService.refundForJob({
          userId: actorContext.userId,
          reservationId: reservation.reservationId,
          jobId: operation.jobId,
          reasonCode: 'enqueue_failed'
        });
        run.operations.push({
          operationId: operation.operationId,
          productItemKey: operation.productItemKey,
          productName: operation.productName,
          jobId: operation.jobId,
          reservationId: reservation.reservationId,
          status: 'failed',
          error: { code: error.code || 'enqueue_failed', message: error.message }
        });
      }
    }
    await this.runRepository.save(run);
    return this.hydrateRun(run, actorContext);
  }

  async getRun(id, actorContext) {
    const run = await this.runRepository.findByIdForActor(id, actorContext.userId);
    if (!run) throw fashionError('fashion_run_not_found', 'Fashion run was not found.', 404);
    return this.hydrateRun(run, actorContext);
  }

  async hydrateRun(run, actorContext) {
    const operations = await Promise.all(run.operations.map(async operation => {
      const status = await this.queueManager.getJobStatusForUser(operation.jobId, actorContext.username);
      return {
        ...operation,
        status: status?.status || operation.status,
        result: status?.result || null,
        error: status?.error || operation.error || null
      };
    }));
    const terminal = operations.every(operation => ['completed', 'failed', 'cancelled'].includes(operation.status));
    const anySuccess = operations.some(operation => operation.status === 'completed');
    return {
      ...run,
      status: terminal ? (anySuccess ? 'completed' : 'failed') : 'processing',
      operations
    };
  }
}
