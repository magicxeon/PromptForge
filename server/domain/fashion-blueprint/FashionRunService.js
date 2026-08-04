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
import { resolveFashionExecutionPrompt } from './GeminiProFashionPrompt.js';

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
      const item = plan.productItems.find(
        candidate => candidate.key === quoted.productItemKey
      );
      if (!item) {
        throw fashionError(
          'fashion_quote_operation_invalid',
          'A quoted Fashion operation no longer matches the plan.',
          409,
          { operationId: quoted.operationId }
        );
      }
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
          referenceCount: new Set(
            Object.values(item.references)
              .filter(Boolean)
              .map(reference => reference.assetId || reference.imageUrl)
          ).size,
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
      schemaVersion: 2,
      id: `frun_${requestFingerprint}`,
      planId,
      quoteId,
      actorUserId: actorContext.userId,
      idempotencyKey,
      requestHash,
      quotePurpose: quote.quotePurpose || 'full',
      setupFingerprint: quote.setupFingerprint,
      proofStatus: quote.quotePurpose === 'proof' ? 'pending' : null,
      proofOperationIds: quote.quotePurpose === 'proof'
        ? quote.operations.map(operation => operation.operationId)
        : [],
      approvedProofRunId: quote.approvedProofRunId || null,
      templateLineage: {
        communityPostId: quote.sourceCommunityPostId,
        templateId: quote.canonicalTemplateId,
        templateVersionId: quote.templateVersionId,
        templateUseSessionId: plan.templateUseSessionId,
        poseProxyId: plan.templatePoseProxy?.id || null,
        poseProxySourceGenerationId:
          plan.templatePoseProxy?.sourceGenerationId || null,
        poseProxyPolicyVersion:
          plan.templatePoseProxy?.processorPolicyVersion || null,
        poseProxyStrategyVersion:
          plan.templatePoseProxy?.processorStrategyVersion || null,
        poseProxyRepresentation:
          plan.templatePoseProxy?.outputRepresentation || null
      },
      routeSnapshot: quote.routeSnapshot,
      pricingSnapshot: {
        pricingPolicyVersion: quote.pricingPolicyVersion,
        estimatedCredits: quote.estimatedCredits,
        maximumCredits: quote.maximumCredits,
        breakdown: quote.breakdown
      },
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
            shotKey: quote.operations.find(
              item => item.operationId === operation.operationId
            )?.shotKey || 'cover',
            jobId: operation.jobId,
            reservationId: reservation.reservationId,
            status: existingStatus.status
          });
          continue;
        }
        const compiledPrompt = compilePromptFromGenerationContext(operation.context);
        const promptProjection = resolveFashionExecutionPrompt({
          plan,
          context: operation.context,
          fallbackPrompt: compiledPrompt
        });
        const prompt = promptProjection.prompt;
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
          routingSnapshot: {
            ...run.routeSnapshot,
            promptStrategyVersion: promptProjection.promptStrategyVersion
          },
          templateUseContext: {
            templateId: operation.templateExecution.template.id,
            templateVersionId: operation.templateExecution.version.id,
            templateUseSessionId: operation.templateExecution.session.id,
            sourceCommunityPostId: operation.templateExecution.session.sourceCommunityPostId,
            replacementSummary: operation.templateExecution.replacementSummary
          },
          fashionBlueprintContext: {
            runId: run.id,
            planId: run.planId,
            quoteId: run.quoteId,
            quotePurpose: run.quotePurpose,
            setupFingerprint: run.setupFingerprint,
            operationId: operation.operationId,
            productItemKey: operation.productItemKey,
            productName: operation.productName,
            shotKey: quote.operations.find(
              item => item.operationId === operation.operationId
            )?.shotKey || 'cover',
            outfitScope: plan.productItems.find(
              item => item.key === operation.productItemKey
            )?.outfitScope || 'full_look',
            referenceAssetIds: Object.values(
              plan.productItems.find(
                item => item.key === operation.productItemKey
              )?.references || {}
            ).flatMap(reference => reference?.assetId ? [reference.assetId] : []),
            promptStrategyVersion: promptProjection.promptStrategyVersion,
            templateLineage: run.templateLineage
          }
        }));
        run.operations.push({
          operationId: operation.operationId,
          productItemKey: operation.productItemKey,
          productName: operation.productName,
          shotKey: quote.operations.find(
            item => item.operationId === operation.operationId
          )?.shotKey || 'cover',
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

  async listRuns(actorContext, limit = 12) {
    const runs = await this.runRepository.findRecentForActor(
      actorContext.userId,
      limit
    );
    return Promise.all(runs.map(run => this.hydrateRun(run, actorContext)));
  }

  async approveProof(id, actorContext) {
    const run = await this.runRepository.findByIdForActor(
      id,
      actorContext.userId
    );
    if (!run) {
      throw fashionError('fashion_run_not_found', 'Fashion run was not found.', 404);
    }
    if (run.quotePurpose !== 'proof') {
      throw fashionError(
        'fashion_run_not_proof',
        'Only a Fashion proof run can be approved.',
        409
      );
    }
    const hydrated = await this.hydrateRun(run, actorContext);
    if (hydrated.status !== 'completed') {
      throw fashionError(
        'fashion_proof_incomplete',
        'The Fashion proof must complete successfully before approval.',
        409
      );
    }
    const updated = await this.runRepository.update(
      id,
      actorContext.userId,
      current => ({
        ...current,
        proofStatus: 'approved',
        proofApprovedAt: new Date().toISOString()
      })
    );
    return this.hydrateRun(updated, actorContext);
  }

  async hydrateRun(run, actorContext) {
    const activeOperations = await Promise.all(run.operations.map(async operation => {
      const status = await this.queueManager.getJobStatusForUser(operation.jobId, actorContext.username);
      return {
        ...operation,
        status: status?.status || operation.status,
        result: status?.result || null,
        error: status?.error || operation.error || null
      };
    }));
    let proofOperations = [];
    if (run.approvedProofRunId) {
      const proof = await this.runRepository.findByIdForActor(
        run.approvedProofRunId,
        actorContext.userId
      );
      if (proof?.proofStatus === 'approved') {
        proofOperations = await Promise.all(proof.operations.map(async operation => {
          const status = await this.queueManager.getJobStatusForUser(
            operation.jobId,
            actorContext.username
          );
          return {
            ...operation,
            status: status?.status || operation.status,
            result: status?.result || null,
            error: status?.error || operation.error || null,
            reusedFromProof: true
          };
        }));
      }
    }
    const operations = [...proofOperations, ...activeOperations];
    const terminal = operations.every(operation => ['completed', 'failed', 'cancelled'].includes(operation.status));
    const anySuccess = operations.some(operation => operation.status === 'completed');
    const anyFailure = operations.some(operation =>
      ['failed', 'cancelled'].includes(operation.status)
    );
    const status = terminal
      ? (anySuccess && anyFailure ? 'partially_completed' : anySuccess ? 'completed' : 'failed')
      : 'processing';
    const operationsChanged = activeOperations.some((operation, index) => {
      const persisted = run.operations[index] || {};
      return persisted.status !== operation.status
        || persisted.result?.imageUrl !== operation.result?.imageUrl
        || persisted.error?.code !== operation.error?.code;
    });
    if (run.status !== status || operationsChanged) {
      await this.runRepository.update(run.id, actorContext.userId, current => ({
        ...current,
        status,
        completedAt: terminal
          ? (current.completedAt || new Date().toISOString())
          : null,
        operations: activeOperations.map(operation => ({
          ...operation,
          result: operation.result || null,
          error: operation.error || null
        }))
      }));
    }
    return {
      ...run,
      status,
      completedAt: terminal
        ? (run.completedAt || new Date().toISOString())
        : null,
      operations
    };
  }
}
