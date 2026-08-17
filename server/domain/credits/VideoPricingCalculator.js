const DIMENSIONS = {
  '9:16': { '480p': [480, 854], '720p': [720, 1280], '1080p': [1080, 1920], '4K': [2160, 3840] },
  '16:9': { '480p': [854, 480], '720p': [1280, 720], '1080p': [1920, 1080], '4K': [3840, 2160] }
};

export function calculateVideoPricingPreview(model, input, commercialPolicy) {
  const durationSeconds = Number(input.durationSeconds);
  const outputCount = Math.max(1, Number(input.outputCount || 1));
  const fps = Number(input.fps || 24);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new TypeError('Video duration must be positive.');
  let providerCostUsd;
  let estimatedCompletionTokens = null;
  if (model.billingMetric === 'output_second') {
    const rate = Number(model.ratesByResolutionUsd?.[input.resolution]);
    if (!rate) throw new TypeError('Video output-second rate is unavailable.');
    providerCostUsd = rate * durationSeconds * outputCount;
  } else if (model.billingMetric === 'completion_token') {
    const dimensions = DIMENSIONS[input.aspectRatio]?.[input.resolution];
    if (!dimensions) throw new TypeError('Video output dimensions are unavailable.');
    estimatedCompletionTokens = ((Number(input.inputVideoSeconds || 0) + durationSeconds)
      * dimensions[0] * dimensions[1] * fps) / 1024;
    const rate = resolveTokenRate(model, input);
    providerCostUsd = estimatedCompletionTokens / 1_000_000 * rate * outputCount;
  } else {
    throw new TypeError('Video billing metric is unsupported.');
  }
  const rawCredits = providerCostUsd
    * Number(commercialPolicy.pricingFxThbPerUsd)
    * (1 + Number(commercialPolicy.operatingSafetyBufferRate))
    / (1 - Number(commercialPolicy.targetGrossMarginRate))
    * Number(commercialPolicy.creditsPerThbAssumption);
  const increment = Number(commercialPolicy.creditRoundingIncrement || 1);
  return {
    providerCostUsd,
    estimatedCompletionTokens,
    estimatedCredits: Math.ceil(rawCredits / increment) * increment,
    billingMetric: model.billingMetric,
    providerRateVersion: model.providerRateVersion,
    pricingStatus: model.pricingStatus
  };
}

function resolveTokenRate(model, input) {
  if (model.ratesByAudioUsdPerMillionTokens) return Number(model.ratesByAudioUsdPerMillionTokens[input.audioMode]);
  if (model.ratesByInputModeUsdPerMillionTokens) {
    return Number(model.ratesByInputModeUsdPerMillionTokens[Number(input.inputVideoSeconds || 0) > 0 ? 'with_video' : 'without_video']);
  }
  return Number(model.ratesByResolutionUsdPerMillionTokens?.[input.resolution]);
}
