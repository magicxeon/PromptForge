import { creditReservationService } from '../credits/CreditReservationService.js';
import { fashionBlueprintQuoteRepository } from '../../repositories/fashion-blueprint/FashionBlueprintQuoteRepository.js';
import { createFashionPlanHash } from './FashionPlanHash.js';
import { fashionError } from './FashionBlueprintService.js';
import { communityPostAccessService } from '../community/CommunityPostAccessService.js';

export class FashionQuoteService {
  constructor({
    blueprintService,
    reservationService = creditReservationService,
    quoteRepository = fashionBlueprintQuoteRepository,
    postAccessService = communityPostAccessService
  }) {
    this.blueprintService = blueprintService;
    this.reservationService = reservationService;
    this.quoteRepository = quoteRepository;
    this.postAccessService = postAccessService;
  }

  async createQuote(input, actorContext) {
    await this.validateTemplate(input.templateId, actorContext);
    const plan = this.blueprintService.resolvePlan(input, actorContext);
    const operations = [];
    for (const item of plan.productItems) {
      const referenceCount = new Set(Object.values(item.references).filter(Boolean)).size;
      const estimate = await this.reservationService.estimate({
        userId: actorContext.userId,
        requestedProviderId: plan.route.providerId,
        requestedModelId: plan.route.modelId,
        resolution: plan.resolution,
        aspectRatio: plan.aspectRatio,
        referenceCount,
        outputCount: plan.outputCountPerProduct,
        routingMode: plan.routingMode,
        qualityTier: plan.qualityTier,
        generationMode: 'fashion'
      });
      operations.push({
        operationId: `op_${item.key}`,
        productItemKey: item.key,
        estimateId: estimate.estimateId,
        estimatedCredits: estimate.estimatedCredits,
        estimateExpiresAt: estimate.expiresAt
      });
    }
    const now = new Date();
    const quote = {
      schemaVersion: 1,
      id: `fqt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      actorUserId: actorContext.userId,
      planHash: createFashionPlanHash(plan),
      pricingPolicyVersion: (await this.reservationService.pricingPolicyService.getPolicyVersion()),
      templateId: plan.templateId,
      routeSnapshot: plan.route,
      operations,
      operationCount: operations.length,
      outputCount: operations.length * plan.outputCountPerProduct,
      estimatedCredits: operations.reduce((sum, operation) => sum + operation.estimatedCredits, 0),
      maximumCredits: operations.reduce((sum, operation) => sum + operation.estimatedCredits, 0),
      createdAt: now.toISOString(),
      expiresAt: operations.map(operation => new Date(operation.estimateExpiresAt).getTime())
        .reduce((earliest, value) => Math.min(earliest, value), Number.POSITIVE_INFINITY)
    };
    quote.expiresAt = new Date(quote.expiresAt).toISOString();
    await this.quoteRepository.save(quote);
    return { quote, resolvedPlan: publicPlan(plan) };
  }

  async validateQuote(quoteId, input, actorContext) {
    const quote = await this.quoteRepository.findById(quoteId);
    if (!quote || quote.actorUserId !== actorContext.userId) {
      throw fashionError('fashion_quote_not_found', 'Fashion quote was not found.', 404);
    }
    if (new Date(quote.expiresAt) < new Date()) {
      throw fashionError('fashion_quote_expired', 'Fashion quote has expired.');
    }
    await this.validateTemplate(input.templateId, actorContext);
    const plan = this.blueprintService.resolvePlan(input, actorContext);
    if (createFashionPlanHash(plan) !== quote.planHash) {
      throw fashionError('fashion_quote_stale', 'Fashion selections changed after the quote was created.');
    }
    return { quote, plan };
  }

  async validateTemplate(templateId, actorContext) {
    const post = await this.postAccessService.getPostForTemplateUse(templateId, actorContext);
    if (post.postType !== 'template') {
      throw fashionError('fashion_template_invalid', 'The selected post is not a reusable Template.', 409);
    }
    return post;
  }
}

function publicPlan(plan) {
  return {
    templateId: plan.templateId,
    qualityTier: plan.qualityTier,
    routingMode: plan.routingMode,
    route: plan.route,
    resolution: plan.resolution,
    aspectRatio: plan.aspectRatio,
    productCount: plan.productItems.length,
    outputCount: plan.productItems.length * plan.outputCountPerProduct
  };
}
