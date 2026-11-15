import { resolveModelArkOutputSize } from '../../providers/ModelArkSeedreamProvider.js';

export function resolveBytePlusImagePricing(model, { resolution, aspectRatio, referenceCount, outputCount }) {
  const rule = model.providerCostPricing;
  const size = resolveModelArkOutputSize({ model: model.modelId, resolution, aspectRatio });
  const dimensions = size.match(/^(\d+)x(\d+)$/);
  const pixels = dimensions ? Number(dimensions[1]) * Number(dimensions[2]) : null;
  const costPlus = rule.retailMode === 'cost_plus';
  if (costPlus && (!Number.isSafeInteger(rule.minimumPixels) || !Number.isSafeInteger(rule.maximumPixels)
    || rule.minimumPixels <= 0 || rule.maximumPixels < rule.minimumPixels
    || (pixels !== null && (pixels < rule.minimumPixels || pixels > rule.maximumPixels)))) throw new TypeError('Invalid image output pixel bounds.');
  const tier = selectImagePixelTier(rule.outputTiers, pixels, { requireCredits: !costPlus });
  if (!Number.isSafeInteger(rule.inputImages.freeCount) || rule.inputImages.freeCount < 0
    || !Number.isSafeInteger(referenceCount) || referenceCount < 0
    || (model.modelId === 'dola-seedream-5-5-261028' && referenceCount > 10)) throw new TypeError('Invalid image reference counts.');
  const references = Math.max(0, referenceCount - rule.inputImages.freeCount);
  const outputMicros = usdMicros(tier.usdPerImage);
  const referenceMicros = references * usdMicros(rule.inputImages.usdPerImage);
  if (!Number.isSafeInteger(outputCount) || outputCount < 1
    || !Number.isSafeInteger(references) || references < 0) throw new TypeError('Invalid image pricing counts.');
  return {
    baseOutputCredits: tier.publishedCredits,
    provisional: pixels === null,
    providerCost: {
      providerCostUsd: (outputMicros + referenceMicros) * outputCount / 1_000_000,
      outputUnitCostUsd: tier.usdPerImage,
      referenceCostUsdPerRequest: referenceMicros / 1_000_000,
      billableReferencesPerRequest: references,
      outputCount,
      requestedSize: size,
      requestedPixels: pixels,
      costBasis: pixels === null ? 'upper_bound_auto_size' : 'requested_pixels',
      billingMetric: model.billingMetric,
      providerRateVersion: rule.version,
      providerPriceSource: model.providerPriceSource,
      providerPriceSourceDate: model.providerPriceSourceDate
    }
  };
}

export function selectImagePixelTier(tiers, pixels, { requireCredits = true } = {}) {
  if (!Array.isArray(tiers) || tiers.length !== 2
    || !Number.isSafeInteger(tiers[0].maxPixels) || tiers[0].maxPixels <= 0
    || tiers[1].maxPixels !== null
    || tiers.some(tier => (requireCredits && (!Number.isSafeInteger(tier.publishedCredits) || tier.publishedCredits <= 0))
      || !Number.isFinite(tier.usdPerImage) || tier.usdPerImage <= 0)) {
    throw new TypeError('Image pixel pricing tiers are invalid.');
  }
  if (pixels !== null && (!Number.isSafeInteger(pixels) || pixels <= 0)) throw new TypeError('Invalid output pixel count.');
  return pixels !== null && pixels <= tiers[0].maxPixels ? tiers[0] : tiers[1];
}

function usdMicros(value) {
  const micros = Math.round(value * 1_000_000);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(micros)) throw new TypeError('Invalid image unit cost.');
  return micros;
}
