export const MEDIA_TYPES = Object.freeze(['text', 'image', 'video']);

export function validateProfitMarkup(markup) {
  if (!markup || typeof markup !== 'object' || Array.isArray(markup)
    || Object.keys(markup).length !== MEDIA_TYPES.length
    || !MEDIA_TYPES.every(key => typeof markup[key] === 'number'
      && Number.isFinite(markup[key]) && markup[key] >= 0 && markup[key] <= 1000)) {
    throw new TypeError('Three numeric profit markup percentages between 0 and 1000 are required.');
  }
  return markup;
}

export function calculateCostPlusCredits(providerCostUsd, policy, mediaType) {
  const markup = validateProfitMarkup(policy.profitMarkupPercentByMedia)[mediaType];
  const fx = Number(policy.pricingFxThbPerUsd);
  const buffer = Number(policy.operatingSafetyBufferRate);
  const denomination = Number(policy.creditsPerThbAssumption);
  const increment = Number(policy.creditRoundingIncrement);
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0
    || !Number.isFinite(markup) || !Number.isFinite(fx) || fx <= 0
    || !Number.isFinite(buffer) || buffer < 0 || buffer > 1
    || !Number.isFinite(denomination) || denomination <= 0
    || !Number.isSafeInteger(increment) || increment <= 0) {
    throw new TypeError('Cost-plus pricing inputs are invalid.');
  }
  const credits = Math.ceil(providerCostUsd * fx * (1 + buffer)
    * (1 + markup / 100) * denomination / increment) * increment;
  if (!Number.isSafeInteger(credits) || credits <= 0) throw new TypeError('Cost-plus Credit amount is invalid.');
  return credits;
}
