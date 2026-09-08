import { fingerprint } from './FinanceReportService.js';

function leaves(value, path = '') {
  if (typeof value === 'number' && Number.isFinite(value))
    return [{ dimension: path, value: String(value) }];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

export function buildFinanceInventory(controls, policy, video) {
  const rows = new Map();
  const ensure = (providerId, modelId, mediaType) => {
    const id = `${providerId}/${modelId}/${mediaType}`;
    if (!rows.has(id))
      rows.set(id, {
        id,
        providerId,
        modelId,
        mediaType,
        providerName: providerId,
        displayName: modelId,
        enabled: false,
        workflows: [],
        coverage: 'missing_rate',
        rates: [],
        retail: [],
        rateVersion: null,
        effectiveAt: null,
        billingMetric: null,
        sourceDate: null,
        source: null,
      });
    return rows.get(id);
  };
  for (const provider of controls.providers)
    for (const model of provider.models) {
      for (const mediaType of model.mediaTypes)
        Object.assign(ensure(provider.providerId, model.modelId, mediaType), {
          providerName: provider.displayName,
          displayName: model.displayName,
          enabled: model.effectiveEnabled,
          workflows: model.workflows.map((item) => item.id),
        });
    }
  for (const model of policy.models) {
    const row = ensure(model.providerId, model.modelId, 'image');
    row.rates = model.providerCostPricing
      ? leaves(model.providerCostPricing.outputTiers.map(({ maxPixels, usdPerImage }) => ({ maxPixels, usdPerImage })), 'outputTiers')
        .concat(leaves(model.providerCostPricing.inputImages, 'inputImages'))
      : leaves(model.providerCostUsd, 'providerCostUsd');
    row.retail = [
      'publishedCredits',
      'baseCreditsByResolution',
      'baseCreditsByQualityAndAspectRatio',
      'referencePricing',
    ].flatMap((key) => leaves(model[key], key));
    row.rateVersion = policy.policyVersion;
    row.effectiveAt = policy.effectiveAt || null;
    row.billingMetric = model.billingMetric || null;
    row.sourceDate =
      model.providerPriceSourceDate || policy.providerPriceSourceDate || null;
    row.source =
      typeof model.providerPriceSource === 'string'
        ? model.providerPriceSource
        : null;
    row.coverage = row.rates.length
      ? model.billingMetric
        ? 'configured'
        : 'unit_unverified'
      : 'missing_rate';
  }
  for (const model of video.models) {
    const row = ensure(model.providerId, model.modelId, 'video');
    row.rates = [
      'ratesByResolutionUsd',
      'ratesByResolutionUsdPerMillionTokens',
      'ratesByAudioUsdPerMillionTokens',
      'ratesByInputModeUsdPerMillionTokens',
      'ratesByResolutionAndInputModeUsdPerMillionTokens',
      'providerDiscounts',
    ].flatMap((key) => leaves(model[key], key));
    row.rateVersion = model.providerRateVersion || video.catalogVersion;
    row.source = model.providerPriceSource || null;
    row.sourceDate = model.providerPriceSourceDate || null;
    row.billingMetric = model.billingMetric || null;
    row.coverage = row.rates.length ? 'configured' : 'missing_rate';
  }
  return {
    revision: fingerprint({ policy, video, controlVersion: controls.version }),
    retailPolicyVersion: policy.policyVersion,
    effectiveAt: policy.effectiveAt || null,
    pricingFxThbPerUsd: String(policy.pricingFxThbPerUsd),
    creditsPerThbAssumption: String(policy.creditsPerThbAssumption),
    rows: [...rows.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
