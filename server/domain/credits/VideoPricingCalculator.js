import { calculateCostPlusCredits } from './CostPlusPricing.js';
import { assertVideoPaidActivationRequest } from '../../config/videoPaidActivation.js';

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
    const calibrated = model.modelId === 'dreamina-seedance-2-5-260628'
      && commercialPolicy.videoActualUsage?.enabled === true && inputVideoSeconds === 0
      && fps === 24 && input.aspectRatio === '9:16' && ['480p', '720p'].includes(input.resolution);
    estimatedCompletionTokens = calibrated
      ? Math.floor((durationSeconds * fps + 1) * dimensions[0] * dimensions[1] / 1024)
      : ((inputVideoSeconds + durationSeconds) * dimensions[0] * dimensions[1] * fps) / 1024;
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
      && (commercialPolicy.videoActualUsage?.enabled !== true || model.providerDiscountEligibilityVerified === true)
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
    estimatedCredits: commercialPolicy.profitMarkupPercentByMedia
      ? calculateCostPlusCredits(providerCostUsd, commercialPolicy, 'video')
      : Math.ceil(rawCredits / increment) * increment,
    billingMetric: model.billingMetric,
    providerRateVersion: promotion ? `${model.providerRateVersion}:${promotion.id}` : model.providerRateVersion,
    tokenRateUsdPerMillion: tokenRate,
    outputSecondRateUsd: model.billingMetric === 'output_second'
      ? Number(model.ratesByResolutionUsd?.[input.resolution]) : null,
    estimatorVersion: model.modelId === 'dreamina-seedance-2-5-260628'
      && commercialPolicy.videoActualUsage?.enabled === true && inputVideoSeconds === 0
      && fps === 24 && input.aspectRatio === '9:16' && ['480p', '720p'].includes(input.resolution)
      ? 'seedance25-portrait-24fps-extra-frame-v1' : 'video-dimensions-duration-v1',
    discountId: promotion?.id || null,
    discountEndsAt: promotion?.endsAt || null,
    costBasis: 'estimated_usage',
    pricingStatus: model.pricingStatus
  };
}

export function createVideoSettlementSnapshot(model, request, policy, preview) {
  assertVideoPaidActivationRequest(model, request);
  if (model.paidRoutingEnabled !== true || model.pricingStatus !== 'priced'
    || model.qualificationStatus !== 'qualified' || !model.providerRateVersion
    || !/^https:\/\//.test(model.providerPriceSource || '')
    || !Number.isFinite(Date.parse(model.providerPriceSourceDate))
    || (model.providerId === 'gemini' && String(model.modelId).includes('omni'))
    || !policy.videoActualUsage?.version) {
    throw new TypeError('Video model and rate must be qualified for paid usage.');
  }
  const multiplier = policy.videoActualUsage.reservationCostMultiplier;
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 2) {
    throw new TypeError('Video reservation multiplier is invalid.');
  }
  const retailPolicy = {
    pricingFxThbPerUsd: policy.pricingFxThbPerUsd,
    operatingSafetyBufferRate: policy.operatingSafetyBufferRate,
    creditsPerThbAssumption: policy.creditsPerThbAssumption,
    creditRoundingIncrement: policy.creditRoundingIncrement,
    profitMarkupPercentByMedia: structuredClone(policy.profitMarkupPercentByMedia)
  };
  return {
    version: policy.videoActualUsage.version,
    mode: 'actual_usage',
    billingMetric: preview.billingMetric,
    providerRateVersion: preview.providerRateVersion,
    providerPriceSource: model.providerPriceSource,
    providerPriceSourceDate: model.providerPriceSourceDate,
    rateEvidenceBasis: model.paidUsageActivation?.rateEvidenceBasis || 'configured_provider_rate',
    paidUsageActivationVersion: model.paidUsageActivationVersion || null,
    tokenRateUsdPerMillion: preview.tokenRateUsdPerMillion,
    outputSecondRateUsd: preview.outputSecondRateUsd,
    outputCount: Number(request.outputCount ?? 1),
    retailPolicy,
    maximumCredits: calculateCostPlusCredits(preview.providerCostUsd * multiplier, retailPolicy, 'video')
  };
}

export function calculateVideoUsageSettlement(usage, snapshot) {
  if (snapshot?.mode !== 'actual_usage' || !snapshot.version || !snapshot.providerRateVersion
    || !usage || usage.billingMetric !== snapshot.billingMetric
    || (usage.outputCount ?? 1) !== snapshot.outputCount) throw new TypeError('Video usage is unavailable or inconsistent.');
  let providerCostUsd;
  if (snapshot.billingMetric === 'completion_token') {
    if (!Number.isSafeInteger(usage.completionTokens) || usage.completionTokens <= 0
      || usage.source !== 'provider_response'
      || !Number.isFinite(snapshot.tokenRateUsdPerMillion) || snapshot.tokenRateUsdPerMillion <= 0) {
      throw new TypeError('Provider-reported completion tokens are required.');
    }
    providerCostUsd = usage.completionTokens * snapshot.tokenRateUsdPerMillion / 1_000_000;
  } else if (snapshot.billingMetric === 'output_second') {
    if (!Number.isFinite(usage.outputSeconds) || usage.outputSeconds <= 0
      || !['provider_response', 'locked_provider_request'].includes(usage.source)
      || !Number.isFinite(snapshot.outputSecondRateUsd) || snapshot.outputSecondRateUsd <= 0) {
      throw new TypeError('Billable output seconds are required.');
    }
    providerCostUsd = usage.outputSeconds * snapshot.outputSecondRateUsd * snapshot.outputCount;
  } else throw new TypeError('Video usage billing metric is unsupported.');
  const actualCredits = calculateCostPlusCredits(providerCostUsd, snapshot.retailPolicy, 'video');
  if (!Number.isSafeInteger(snapshot.maximumCredits) || snapshot.maximumCredits <= 0) throw new TypeError('Video consent cap is invalid.');
  return {
    actualCredits,
    providerCostUsd,
    providerRateVersion: snapshot.providerRateVersion,
    rateEvidenceBasis: snapshot.rateEvidenceBasis || 'configured_provider_rate',
    costBasis: usage.source === 'provider_response' ? 'provider_reported_usage' : 'locked_provider_request',
    markupPercent: snapshot.retailPolicy.profitMarkupPercentByMedia.video,
    capExceeded: actualCredits > snapshot.maximumCredits
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
