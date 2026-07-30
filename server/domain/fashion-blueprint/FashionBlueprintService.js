const QUALITY_ROUTE_PREFERENCES = {
  draft: ['gemini-3.1-flash-lite-image', 'gpt-image-1-mini'],
  selling_quality: ['gemini-3.1-flash-image', 'gpt-image-1'],
  premium_campaign: ['gemini-3-pro-image', 'gpt-image-1.5']
};

export class FashionBlueprintService {
  constructor({ providerRegistry }) {
    this.providerRegistry = providerRegistry;
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
      for (const role of ['outfit_front', 'outfit_back']) {
        const value = item.references?.[role];
        if (value && !isOwnedFashionReference(value, actorContext?.userId)) {
          throw fashionError(
            'fashion_reference_not_owned',
            'Outfit references must be uploaded by the active user.',
            403,
            { role }
          );
        }
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
    const productItems = items.map(item => ({
      key: String(item.key),
      name: String(item.name || item.key),
      productType: String(item.productType || 'clothing_set'),
      outfitScope: normalizeOutfitScope(item.outfitScope),
      references: {
        character_reference: String(item.references.character_reference || ''),
        outfit_front: String(item.references.outfit_front),
        outfit_back: item.references.outfit_back ? String(item.references.outfit_back) : null
      }
    }));
    for (const item of productItems) {
      const referenceCount = new Set(Object.values(item.references).filter(Boolean)).size;
      this.providerRegistry.validateRequest(model, { aspectRatio, imageResolution: resolution, referenceCount });
    }
    return {
      schemaVersion: 1,
      templateId: String(input.templateId),
      templateUseSessionId: String(input.templateUseSessionId),
      characterProfileContext: input.characterProfileContext,
      productItems,
      qualityTier,
      routingMode,
      route: { providerId: route.provider.id, modelId: model.id },
      resolution,
      aspectRatio,
      poseDirection: normalizeDirection(input.poseDirection, 'template_pose'),
      environmentDirection: normalizeDirection(input.environmentDirection, 'template_environment'),
      outputCountPerProduct: 1
    };
  }

  resolveAdvancedRoute(input) {
    if (!input.requestedProviderId || !input.requestedModelId) {
      throw fashionError('fashion_route_required', 'Provider and model are required in Advanced mode.');
    }
    return this.providerRegistry.resolveSelection(input.requestedProviderId, input.requestedModelId);
  }

  resolveSimpleRoute(qualityTier) {
    const catalog = this.providerRegistry.getPublicCatalog();
    const preferred = QUALITY_ROUTE_PREFERENCES[qualityTier];
    for (const modelId of preferred) {
      const provider = catalog.providers.find(entry => entry.models.some(model => model.id === modelId));
      if (provider) return this.providerRegistry.resolveSelection(provider.id, modelId);
    }
    const provider = catalog.providers[0];
    const model = provider?.models[0];
    if (!provider || !model) throw fashionError('fashion_route_unavailable', 'No available image provider can run Fashion Blueprint.', 503);
    return this.providerRegistry.resolveSelection(provider.id, model.id);
  }
}

function normalizeDirection(value, fallback) {
  const normalized = String(value || '').trim().slice(0, 160);
  return normalized || fallback;
}

function normalizeOutfitScope(value) {
  return ['full_look', 'top_only', 'bottom_only', 'single_item'].includes(value)
    ? value
    : 'full_look';
}

function isOwnedFashionReference(value, userId) {
  if (!userId) return false;
  const prefix = `/outputs/fashion-references/${encodeURIComponent(userId)}/`;
  return String(value).startsWith(prefix) && !String(value).slice(prefix.length).includes('/');
}

export function fashionError(code, message, statusCode = 400, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
