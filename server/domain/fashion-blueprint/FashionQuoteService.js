import { creditReservationService } from '../credits/CreditReservationService.js';
import { fashionBlueprintQuoteRepository } from '../../repositories/fashion-blueprint/FashionBlueprintQuoteRepository.js';
import { createFashionPlanHash } from './FashionPlanHash.js';
import { fashionError } from './FashionBlueprintService.js';
import { communityPostAccessService } from '../community/CommunityPostAccessService.js';
import { templateCoreService as defaultTemplateCoreService } from '../templates/TemplateCoreService.js';
import { createFashionExecutionContext } from './FashionGenerationContext.js';
import { fashionBlueprintRunRepository } from '../../repositories/fashion-blueprint/FashionBlueprintRunRepository.js';

export class FashionQuoteService {
  constructor({
    blueprintService,
    reservationService = creditReservationService,
    quoteRepository = fashionBlueprintQuoteRepository,
    postAccessService = communityPostAccessService,
    templateCoreService = defaultTemplateCoreService,
    templatePoseProxyService = null,
    providerRegistry,
    runRepository = fashionBlueprintRunRepository
  }) {
    this.blueprintService = blueprintService;
    this.reservationService = reservationService;
    this.quoteRepository = quoteRepository;
    this.postAccessService = postAccessService;
    this.templateCoreService = templateCoreService;
    this.templatePoseProxyService = templatePoseProxyService;
    this.providerRegistry = providerRegistry;
    this.runRepository = runRepository;
  }

  async createQuote(input, actorContext) {
    const planInput = input.plan || input;
    const purpose = normalizeQuotePurpose(input.quotePurpose || planInput.quotePurpose);
    const templateContext = await this.validateTemplate(
      planInput.templateId,
      planInput.templateUseSessionId,
      actorContext
    );
    let plan = this.blueprintService.resolvePlan(planInput, actorContext);
    plan = await this.blueprintService.authorizePlanAssets(plan, actorContext);
    const routingPolicy = this.blueprintService.routingPolicyService.getPolicy();
    plan.qualityPromptDirective =
      routingPolicy.tiers[plan.qualityTier]?.promptDirective || '';
    plan.templateVersionId = templateContext.session.version.id;
    plan.sourceCommunityPostId = templateContext.post.id;
    plan.canonicalTemplateId = templateContext.session.template.id;
    plan = await this.bindPoseProxy(plan, templateContext);
    const setupFingerprint = createFashionPlanHash({
      ...plan,
      productItems: plan.productItems.map(item => ({
        ...item,
        operations: undefined
      }))
    });
    const approvedProofRun = purpose === 'continuation'
      ? await this.validateApprovedProof(
        input.approvedProofRunId || planInput.approvedProofRunId,
        setupFingerprint,
        actorContext
      )
      : null;
    const candidateOperations = plan.productItems.flatMap(item =>
      item.operations.map(operation => ({ item, operation }))
    );
    const selectedOperations = purpose === 'proof'
      ? candidateOperations.slice(0, 1)
      : purpose === 'continuation'
        ? candidateOperations.filter(({ operation }) =>
          !approvedProofRun.proofOperationIds.includes(operation.operationId)
        )
        : candidateOperations;
    if (!selectedOperations.length) {
      throw fashionError(
        'fashion_quote_has_no_operations',
        'No remaining Fashion operations require generation.',
        409
      );
    }
    const operations = [];
    for (const { item, operation } of selectedOperations) {
      const execution = await createFashionExecutionContext({
        plan,
        item,
        actorContext,
        providerRegistry: this.providerRegistry,
        templateCoreService: this.templateCoreService
      });
      const referenceCount =
        execution.context.referenceProcessing.providerPlan.referenceCount;
      const estimate = await this.reservationService.estimate({
        userId: actorContext.userId,
        requestedProviderId: plan.route.providerId,
        requestedModelId: plan.route.modelId,
        resolution: plan.resolution,
        aspectRatio: plan.aspectRatio,
        referenceCount,
        referenceProcessingPlanFingerprint:
          execution.context.referenceProcessing.planFingerprint,
        outputCount: plan.outputCountPerProduct,
        routingMode: plan.routingMode,
        qualityTier: plan.qualityTier,
        generationMode: 'fashion',
        templateUseSessionId: plan.templateUseSessionId,
        templatePricing: await this.templateCoreService.resolvePricing(
          plan.templateUseSessionId,
          actorContext,
          plan.outputCountPerProduct
        )
      });
      operations.push({
        operationId: operation.operationId,
        productItemKey: item.key,
        shotKey: operation.shotKey,
        estimateId: estimate.estimateId,
        estimatedCredits: estimate.estimatedCredits,
        pricingBreakdown: estimate.breakdown || {},
        estimateExpiresAt: estimate.expiresAt,
        operationFingerprint: createFashionPlanHash({
          setupFingerprint,
          operationId: operation.operationId,
          productItem: item
        }),
        referenceProcessingPlanFingerprint:
          execution.context.referenceProcessing.planFingerprint
      });
    }
    const now = new Date();
    const quote = {
      schemaVersion: 2,
      id: `fqt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      actorUserId: actorContext.userId,
      planHash: createFashionPlanHash(plan),
      setupFingerprint,
      quotePurpose: purpose,
      approvedProofRunId: approvedProofRun?.id || null,
      pricingPolicyVersion: (await this.reservationService.pricingPolicyService.getPolicyVersion()),
      templateId: plan.templateId,
      canonicalTemplateId: plan.canonicalTemplateId,
      templateVersionId: plan.templateVersionId,
      sourceCommunityPostId: plan.sourceCommunityPostId,
      routeSnapshot: plan.route,
      operations,
      operationCount: operations.length,
      outputCount: operations.length * plan.outputCountPerProduct,
      estimatedCredits: operations.reduce((sum, operation) => sum + operation.estimatedCredits, 0),
      maximumCredits: operations.reduce((sum, operation) => sum + operation.estimatedCredits, 0),
      breakdown: {
        generationCredits: operations.reduce((sum, operation) =>
          sum + Math.max(
            0,
            operation.estimatedCredits
              - Number(operation.pricingBreakdown?.templateUsageCredits || 0)
          ), 0),
        templateUsageCredits: operations.reduce((sum, operation) =>
          sum + Number(operation.pricingBreakdown?.templateUsageCredits || 0), 0),
        operationCredits: Object.fromEntries(
          operations.map(operation => [
            operation.operationId,
            operation.estimatedCredits
          ])
        )
      },
      createdAt: now.toISOString(),
      expiresAt: operations.map(operation => new Date(operation.estimateExpiresAt).getTime())
        .reduce((earliest, value) => Math.min(earliest, value), Number.POSITIVE_INFINITY)
    };
    quote.expiresAt = new Date(quote.expiresAt).toISOString();
    await this.quoteRepository.save(quote);
    return {
      quote,
      resolvedPlan: publicPlan(plan, operations.length)
    };
  }

  async validateQuote(quoteId, input, actorContext) {
    const quote = await this.quoteRepository.findById(quoteId);
    if (!quote || quote.actorUserId !== actorContext.userId) {
      throw fashionError('fashion_quote_not_found', 'Fashion quote was not found.', 404);
    }
    if (new Date(quote.expiresAt) < new Date()) {
      throw fashionError('fashion_quote_expired', 'Fashion quote has expired.');
    }
    const templateContext = await this.validateTemplate(
      input.templateId,
      input.templateUseSessionId,
      actorContext
    );
    let plan = this.blueprintService.resolvePlan(input, actorContext);
    plan = await this.blueprintService.authorizePlanAssets(plan, actorContext);
    const routingPolicy = this.blueprintService.routingPolicyService.getPolicy();
    plan.qualityPromptDirective =
      routingPolicy.tiers[plan.qualityTier]?.promptDirective || '';
    plan.templateVersionId = templateContext.session.version.id;
    plan.sourceCommunityPostId = templateContext.post.id;
    plan.canonicalTemplateId = templateContext.session.template.id;
    plan = await this.bindPoseProxy(plan, templateContext);
    if (createFashionPlanHash(plan) !== quote.planHash) {
      throw fashionError('fashion_quote_stale', 'Fashion selections changed after the quote was created.');
    }
    return { quote, plan };
  }

  async validateTemplate(templateId, templateUseSessionId, actorContext) {
    const post = await this.postAccessService.getPostForTemplateUse(templateId, actorContext);
    if (post.postType !== 'template') {
      throw fashionError('fashion_template_invalid', 'The selected post is not a reusable Template.', 409);
    }
    const session = await this.templateCoreService.loadSession(templateUseSessionId, actorContext);
    if (session.template.id !== post.templateId) {
      throw fashionError('fashion_template_session_mismatch', 'The selected Template session does not match this Community post.', 409);
    }
    const previewImage = session.version.preview?.imageUrl
      || session.template.preview?.imageUrl
      || post.imageUrl;
    if (!previewImage) {
      throw fashionError(
        'fashion_template_preview_required',
        'Fashion Templates require an approved final-result preview.',
        409
      );
    }
    const compatibility = session.version.compatibility || session.template.compatibility || {};
    if (
      Array.isArray(compatibility.consumers)
      && compatibility.consumers.length
      && !compatibility.consumers.includes('fashion')
    ) {
      throw fashionError(
        'fashion_template_incompatible',
        'This Template is not compatible with Fashion Studio.',
        409
      );
    }
    const inputs = session.version.publicInputSchema?.inputs || [];
    const hasCharacterBinding = inputs.some(input => {
      const field = String(input.sourceFieldName || '').toLowerCase();
      return input.fashionBindingRole === 'fashion.character'
        || field.includes('character')
        || field.includes('face');
    });
    const hasOutfitBinding = inputs.some(input => {
      const field = String(input.sourceFieldName || '').toLowerCase();
      return String(input.fashionBindingRole || '').startsWith('fashion.outfit')
        || field.includes('outfit');
    });
    if (!hasCharacterBinding || !hasOutfitBinding) {
      throw fashionError(
        'fashion_template_bindings_required',
        'Fashion Templates must expose Character and Outfit replacement bindings.',
        409,
        { hasCharacterBinding, hasOutfitBinding }
      );
    }
    return { post, session };
  }

  async validateApprovedProof(runId, setupFingerprint, actorContext) {
    if (!runId) {
      throw fashionError(
        'fashion_proof_run_required',
        'An approved proof run is required for a continuation quote.'
      );
    }
    const run = await this.runRepository.findByIdForActor(
      runId,
      actorContext.userId
    );
    if (!run || run.quotePurpose !== 'proof' || run.proofStatus !== 'approved') {
      throw fashionError(
        'fashion_proof_not_approved',
        'The Fashion proof must be completed and approved before continuing.',
        409
      );
    }
    if (run.setupFingerprint !== setupFingerprint) {
      throw fashionError(
        'fashion_proof_setup_changed',
        'Fashion setup changed after the proof was approved.',
        409
      );
    }
    return run;
  }

  async bindPoseProxy(plan, templateContext) {
    if (plan.routingMode !== 'simple') return plan;
    if (!this.templatePoseProxyService) {
      throw fashionError('fashion_pose_proxy_service_unavailable', 'Fashion pose preparation is unavailable.', 503);
    }
    const proxy = await this.templatePoseProxyService.requireActive(
      templateContext.session.version.id
    );
    return {
      ...plan,
      templatePoseProxy: {
        id: proxy.id,
        templateVersionId: proxy.templateVersionId,
        poseVariantId: proxy.poseVariantId,
        imageUrl: proxy.proxyImageUrl,
        sourceGenerationId: proxy.operationId,
        processorPolicyVersion: proxy.processorPolicyVersion,
        processorStrategyVersion: proxy.processorStrategyVersion,
        outputRepresentation: proxy.outputRepresentation || 'matte_mannequin'
      }
    };
  }
}

function normalizeQuotePurpose(value) {
  return ['full', 'proof', 'continuation'].includes(value)
    ? value
    : 'full';
}

function publicPlan(plan, operationCount) {
  return {
    templateId: plan.templateId,
    templateUseSessionId: plan.templateUseSessionId,
    qualityTier: plan.qualityTier,
    routingMode: plan.routingMode,
    route: plan.route,
    resolution: plan.resolution,
    aspectRatio: plan.aspectRatio,
    productCount: plan.productItems.length,
    outputCount: operationCount * plan.outputCountPerProduct
  };
}
