import { fashionAssetService } from './FashionAssetService.js';
import { fashionDirectionResolver } from './FashionDirectionResolver.js';
import { fashionRoutingPolicyService } from './FashionRoutingPolicyService.js';

export class FashionBlueprintService {
  constructor({
    providerRegistry,
    assetService = fashionAssetService,
    directionResolver = fashionDirectionResolver,
    routingPolicyService = fashionRoutingPolicyService
  }) {
    this.providerRegistry = providerRegistry;
    this.assetService = assetService;
    this.directionResolver = directionResolver;
    this.routingPolicyService = routingPolicyService;
  }

  resolvePlan(input = {}, actorContext = null) {
    const items = Array.isArray(input.productItems) ? input.productItems : [];
    if (!input.templateId || !input.templateUseSessionId || !input.characterProfileContext || items.length < 1 || items.length > 5) {
      throw fashionError('fashion_plan_incomplete', 'Template, reusable Character, and one to five products are required.');
    }
    for (const item of items) {
      if (!item?.key || !item.references?.outfit_front) {
        throw fashionError('fashion_outfit_front_required', 'Every product requires an Outfit Front reference.');
      }
    }
    const qualityTier = ['draft', 'selling_quality', 'premium_campaign'].includes(input.qualityTier)
      ? input.qualityTier
      : 'selling_quality';
    const routingMode = input.routingMode === 'advanced' ? 'advanced' : 'simple';
    const route = routingMode === 'advanced'
      ? this.resolveAdvancedRoute(input)
      : this.resolveSimpleRoute(qualityTier);
    const model = route.model;
    const aspectRatio = input.aspectRatio || '6:8';
    const resolution = input.resolution || model.capabilities?.resolutions?.[0] || model.defaults?.resolution || model.defaults?.imageSize || '1K';
    const direction = this.directionResolver.resolve(input);
    const productItems = items.map((item, index) => ({
      key: String(item.key),
      clientKey: String(item.clientKey || item.key),
      name: String(item.name || item.key),
      sku: String(item.sku || '').trim().slice(0, 80) || null,
      productType: String(item.productType || 'clothing_set'),
      outfitScope: normalizeOutfitScope(item.outfitScope),
      colorNotes: String(item.colorNotes || '').trim().slice(0, 160) || null,
      integrityLevel: normalizeIntegrityLevel(item.integrityLevel),
      references: {
        character_reference: normalizeReference(item.references.character_reference),
        outfit_front: normalizeReference(item.references.outfit_front),
        outfit_back: normalizeReference(item.references.outfit_back)
      },
      operations: [{
        operationId: `op_${String(item.key)}_cover`,
        shotKey: 'cover',
        shotIndex: index,
        outputCount: 1
      }]
    }));
    for (const item of productItems) {
      const referenceCount = new Set(
        Object.values(item.references).filter(Boolean).map(reference => reference.assetId || reference.imageUrl)
      ).size;
      this.providerRegistry.validateRequest(model, { aspectRatio, imageResolution: resolution, referenceCount });
    }
    return {
      schemaVersion: 2,
      templateId: String(input.templateId),
      templateUseSessionId: String(input.templateUseSessionId),
      characterProfileContext: input.characterProfileContext,
      productItems,
      qualityTier,
      routingMode,
      route: {
        providerId: route.provider.id,
        modelId: model.id,
        routingPolicyVersion: route.policyVersion || null,
        qualificationVersion: route.qualificationVersion || null,
        qualificationStatus: route.qualificationStatus || (routingMode === 'advanced' ? 'experimental' : null),
        promptStrategyVersion: route.promptStrategyVersion || null
      },
      resolution,
      aspectRatio,
      directionPolicyVersion: direction.policyVersion,
      poseDirection: direction.pose.id,
      poseDirective: direction.pose.directive,
      environmentDirection: direction.environment.id,
      environmentDirective: direction.environment.directive,
      outputCountPerProduct: 1
    };
  }

  async authorizePlanAssets(plan, actorContext) {
    const productItems = [];
    for (const item of plan.productItems) {
      const references = { character_reference: item.references.character_reference };
      for (const role of ['outfit_front', 'outfit_back']) {
        const requested = item.references[role];
        if (!requested) {
          references[role] = null;
          continue;
        }
        const resolved = await this.assetService.resolveOwnedReference(requested, actorContext);
        if (!resolved) {
          throw fashionError(
            'fashion_reference_not_owned',
            'Outfit references must be uploaded by the active user.',
            403,
            { role, assetId: requested.assetId || null }
          );
        }
        references[role] = resolved;
      }
      productItems.push({ ...item, references });
    }
    return { ...plan, productItems };
  }

  resolveAdvancedRoute(input) {
    if (!input.requestedProviderId || !input.requestedModelId) {
      throw fashionError('fashion_route_required', 'Provider and model are required in Advanced mode.');
    }
    return this.providerRegistry.resolveSelection(input.requestedProviderId, input.requestedModelId);
  }

  resolveSimpleRoute(qualityTier) {
    return this.routingPolicyService.resolveSimpleRoute(
      qualityTier,
      this.providerRegistry
    );
  }
}

function normalizeReference(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return { assetId: null, imageUrl: value };
  }
  return {
    assetId: String(value.assetId || value.referenceId || '').trim() || null,
    imageUrl: String(value.imageUrl || '').trim() || null
  };
}

function normalizeOutfitScope(value) {
  return ['full_look', 'top_only', 'bottom_only', 'single_item'].includes(value)
    ? value
    : 'full_look';
}

function normalizeIntegrityLevel(value) {
  return ['creative', 'balanced', 'strict'].includes(value)
    ? value
    : 'balanced';
}

export function fashionError(code, message, statusCode = 400, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
