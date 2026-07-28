import {
  compileGenerationContext,
  compilePromptFromGenerationContext,
  createQueueOptions
} from '../generation/generationRequestService.js';
import { creditReservationService } from '../credits/CreditReservationService.js';
import { fashionBlueprintRunRepository } from '../../repositories/fashion-blueprint/FashionBlueprintRunRepository.js';
import { fashionError } from './FashionBlueprintService.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { createFashionPlanHash } from './FashionPlanHash.js';

const QUALITY_PROMPTS = {
  draft: 'clean ecommerce draft quality with clear garment placement',
  selling_quality: 'high-quality ecommerce selling image with accurate fabric, seams, color and fit',
  premium_campaign: 'premium commercial fashion campaign quality with exceptional garment fidelity and polished lighting'
};

export class FashionRunService {
  constructor({
    quoteService,
    providerRegistry,
    queueManager,
    reservationService = creditReservationService,
    runRepository = fashionBlueprintRunRepository
  }) {
    this.quoteService = quoteService;
    this.providerRegistry = providerRegistry;
    this.queueManager = queueManager;
    this.reservationService = reservationService;
    this.runRepository = runRepository;
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
      const payload = createGenerationPayload(plan, item);
      return {
        operationId: quoted.operationId,
        productItemKey: item.key,
        productName: item.name,
        requestId,
        jobId,
        estimateId: quoted.estimateId,
        payload,
        generationRequest: {
          providerId: plan.route.providerId,
          modelId: plan.route.modelId,
          resolution: plan.resolution,
          aspectRatio: plan.aspectRatio,
          referenceCount: new Set(Object.values(item.references).filter(Boolean)).size,
          outputCount: plan.outputCountPerProduct,
          generationMode: 'fashion'
        }
      };
    });
    for (const operation of operations) {
      const validatedCharacterContext = await characterUsageService.validateGenerationContext(
        operation.payload.characterProfileContext,
        actorContext
      );
      operation.payload.characterProfileContext = validatedCharacterContext;
      operation.payload.characterReferenceImageA =
        validatedCharacterContext.authorizedCharacterReferenceAssetId;
      const { context } = compileGenerationContext(operation.payload, actorContext);
      operation.context = context;
      operation.generationRequest.referenceCount = context.referenceCount;
      operation.generationRequest.outputCount = context.outputCount;
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
          requestId: operation.requestId
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

function createGenerationPayload(plan, item) {
  const prompt = [
    'Create a professional full-body ecommerce fashion photograph.',
    'Follow the selected template scene, lighting, camera and composition.',
    'Preserve the authorized Character identity and body proportions.',
    `Show the ${item.productType} product named "${item.name}" with accurate silhouette, construction, pattern, color, seams and fabric texture.`,
    `Pose direction: ${plan.poseDirection}.`,
    `Environment direction: ${plan.environmentDirection}.`,
    QUALITY_PROMPTS[plan.qualityTier],
    'Keep the complete model and garment visible with natural commercial posing and do not invent logos or garment details.'
  ].join(' ');
  return {
    provider: plan.route.providerId,
    submodel: plan.route.modelId,
    imageResolution: plan.resolution,
    aspectRatio: plan.aspectRatio,
    outputCount: plan.outputCountPerProduct,
    mode: 'normal',
    generationMode: 'fashion',
    generationSurface: 'fashion',
    template: 'portrait',
    selections: {},
    imageReferences: {
      characterReference: true,
      outfitReference: true,
      faceMatch: false,
      styleMatch: false,
      poseMatch: false,
      characterOverrides: false
    },
    characterReferenceImageA: item.references.character_reference,
    outfitReferenceImageFront: item.references.outfit_front,
    outfitReferenceImageBack: item.references.outfit_back,
    sceneBuilder: { authoringMode: 'manual', manualPromptText: prompt },
    characterProfileContext: plan.characterProfileContext,
    routingMode: plan.routingMode,
    qualityTier: plan.qualityTier
  };
}
