import type { ProviderCatalog } from './schemas/generationSchemas';

export function imageModelUnavailableReason(
  model: ProviderCatalog['providers'][number]['models'][number] | undefined,
  requiredReferenceCount = 0,
  aspectRatio: string | null = null
) {
  if (!model) return 'model_unavailable';
  if (model.paidRoutingEnabled === false && model.testingRoutingEnabled !== true) {
    return model.unavailableReason || 'provider_not_released';
  }
  if (model.pricingStatus === 'unavailable') return 'pricing_unavailable';
  if (model.qualificationStatus === 'unqualified') return 'model_unqualified';
  if (requiredReferenceCount > 0 && model.capabilities.imageReferences !== true) {
    return 'references_unsupported';
  }
  if (requiredReferenceCount > Number(model.capabilities.maxReferenceImages || 0)) {
    return 'reference_limit';
  }
  if (
    aspectRatio
    && model.capabilities.aspectRatios.length
    && !model.capabilities.aspectRatios.includes(aspectRatio)
  ) {
    return 'aspect_ratio_unsupported';
  }
  return null;
}
