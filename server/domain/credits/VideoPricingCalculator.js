const DIMENSIONS = {
  '9:16': { '480p': [480, 854], '720p': [720, 1280], '1080p': [1080, 1920], '4K': [2160, 3840] },
  '16:9': { '480p': [854, 480], '720p': [1280, 720], '1080p': [1920, 1080], '4K': [3840, 2160] }
};

export function calculateVideoPricingPreview(model, input, commercialPolicy, { now = new Date() } = {}) {
  const durationSeconds = Number(input.durationSeconds);
  const outputCount = Number(input.outputCount ?? 1);
  const fps = Number(input.fps ?? 24);
  const inputVideoSeconds = Number(input.inputVideoSeconds ?? 0);
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new TypeError('Video duration must be positive.');
  if (!Number.isSafeInteger(outputCount) || outputCount <= 0 || !Number.isFinite(fps) || fps <= 0
    || !Number.isFinite(inputVideoSeconds) || inputVideoSeconds < 0 || !Number.isFinite(timestamp)) {
    throw new TypeError('Video pricing inputs are invalid.');
  }
  if (input.serviceTier && input.serviceTier !== 'online') throw new TypeError('Offline video pricing is not supported.');
  let providerCostUsd;
  let estimatedCompletionTokens = null;
  let tokenRate = null;
  let promotion = null;
  if (model.billingMetric === 'output_second') {
    const rate = Number(model.ratesByResolutionUsd?.[input.resolution]);
    if (!Number.isFinite(rate) || rate <= 0) throw new TypeError('Video output-second rate is unavailable.');
    providerCostUsd = rate * durationSeconds * outputCount;
  } else if (model.billingMetric === 'completion_token') {
    const dimensions = DIMENSIONS[input.aspectRatio]?.[input.resolution];
    if (!dimensions) throw new TypeError('Video output dimensions are unavailable.');
    estimatedCompletionTokens = ((inputVideoSeconds + durationSeconds)
      * dimensions[0] * dimensions[1] * fps) / 1024;
    if (inputVideoSeconds > 0 && model.requiresInputVideoMinimumTokens) {
      const floor = model.minimumInputVideoTokens?.[input.resolution]?.[input.aspectRatio]?.[durationSeconds];
      if (!Number.isFinite(floor) || floor <= 0) throw new TypeError('Verified input-video minimum token floor is unavailable.');
      estimatedCompletionTokens = Math.max(estimatedCompletionTokens, floor);
    }
    const listRate = resolveTokenRate(model, input);
    if (!Number.isFinite(listRate) || listRate <= 0) throw new TypeError('Video token rate is unavailable.');
    const discounts = model.providerDiscounts || [];
    if (!Array.isArray(discounts) || discounts.some(discount => !discount.id
      || !Array.isArray(discount.resolutions)
      || !Number.isFinite(Date.parse(discount.startsAt)) || !Number.isFinite(Date.parse(discount.endsAt))
      || Date.parse(discount.startsAt) >= Date.parse(discount.endsAt)
      || !Number.isFinite(discount.multiplier) || discount.multiplier <= 0 || discount.multiplier > 1)) {
      throw new TypeError('Provider discount is invalid.');
    }
    const active = discounts.filter(discount =>
      discount.resolutions.includes(input.resolution)
      && timestamp >= Date.parse(discount.startsAt) && timestamp < Date.parse(discount.endsAt));
    if (active.length > 1) throw new TypeError('Overlapping provider discounts.');
    promotion = active[0] || null;
    if (promotion && (!Number.isFinite(promotion.multiplier) || promotion.multiplier <= 0 || promotion.multiplier > 1)) {
      throw new TypeError('Provider discount is invalid.');
    }
    tokenRate = Math.round(listRate * (promotion?.multiplier ?? 1) * 1_000_000) / 1_000_000;
    providerCostUsd = estimatedCompletionTokens / 1_000_000 * tokenRate * outputCount;
  } else {
    throw new TypeError('Video billing metric is unsupported.');
  }
  const rawCredits = providerCostUsd
    * Number(commercialPolicy.pricingFxThbPerUsd)
    * (1 + Number(commercialPolicy.operatingSafetyBufferRate))
    / (1 - Number(commercialPolicy.targetGrossMarginRate))
    * Number(commercialPolicy.creditsPerThbAssumption);
  const increment = Number(commercialPolicy.creditRoundingIncrement || 1);
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0 || !Number.isFinite(rawCredits) || rawCredits <= 0
    || !Number.isFinite(increment) || increment <= 0) throw new TypeError('Video commercial pricing is invalid.');
  return {
    providerCostUsd,
    estimatedCompletionTokens,
    estimatedCredits: Math.ceil(rawCredits / increment) * increment,
    billingMetric: model.billingMetric,
    providerRateVersion: promotion ? `${model.providerRateVersion}:${promotion.id}` : model.providerRateVersion,
    tokenRateUsdPerMillion: tokenRate,
    discountId: promotion?.id || null,
    discountEndsAt: promotion?.endsAt || null,
    costBasis: 'estimated_usage',
    pricingStatus: model.pricingStatus
  };
}

function resolveTokenRate(model, input) {
  if (model.ratesByResolutionAndInputModeUsdPerMillionTokens) {
    return Number(model.ratesByResolutionAndInputModeUsdPerMillionTokens[input.resolution]?.[
      Number(input.inputVideoSeconds || 0) > 0 ? 'with_video' : 'without_video'
    ]);
  }
  if (model.ratesByAudioUsdPerMillionTokens) return Number(model.ratesByAudioUsdPerMillionTokens[input.audioMode]);
  if (model.ratesByInputModeUsdPerMillionTokens) {
    return Number(model.ratesByInputModeUsdPerMillionTokens[Number(input.inputVideoSeconds || 0) > 0 ? 'with_video' : 'without_video']);
  }
  return Number(model.ratesByResolutionUsdPerMillionTokens?.[input.resolution]);
}
