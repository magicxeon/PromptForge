import { calculateCostPlusCredits } from './CostPlusPricing.js';

// Advisory economics only. These values are never accepted as a charge quote.
export function estimateCinematicWriting(policy, { model, operation, inputBytes, maxOutputTokens }, now = Date.now()) {
  if (policy.cinematicWritingBilling?.enabled) {
    let quote;
    try { quote = quoteCinematicWriting(policy, { model, operation, inputBytes, maxOutputTokens }, now); }
    catch { return null; }
    const bufferedCostThb = quote.providerCostUsd * quote.pricingFxThbPerUsd * (1 + quote.operatingSafetyBufferRate);
    const retailThb = quote.totalCredits / quote.creditsPerThbAssumption;
    return { publicEstimate: { operation, model, credits: quote.totalCredits, retailThb, chargeCredits: quote.totalCredits,
      costBasis: 'service_price_preview', policyVersion: quote.billingPolicyVersion,
      exceedsValueTarget: quote.totalCredits > (policy.cinematicWritingPreview?.operations?.[operation]?.valueReviewCredits ?? Infinity) },
      inputTokens: quote.inputTokenEstimate, maxOutputTokens, providerCostUsd: quote.providerCostUsd, bufferedCostThb,
      grossContributionThb: retailThb - bufferedCostThb, assumedGrossMargin: (retailThb - bufferedCostThb) / retailThb };
  }
  const preview = policy.cinematicWritingPreview;
  const rate = policy.textEnhancement;
  const rule = preview?.operations?.[operation];
  const positive = value => Number.isFinite(value) && value > 0;
  if (!preview?.enabled || !preview.version || !rate?.enabled || rate.modelId !== model || !rule
    || !(Date.parse(rate.effectiveAt) <= now && now < Date.parse(rate.reviewBy))
    || ![preview.inputBytesPerToken, preview.maximumInputTokens, rate.inputUsdPerMillion,
      rate.outputUsdPerMillion, policy.pricingFxThbPerUsd, policy.creditsPerThbAssumption,
      policy.creditRoundingIncrement, rule.floorCredits, rule.valueReviewCredits, maxOutputTokens].every(positive)
    || !Number.isInteger(inputBytes) || inputBytes < 0 || !Number.isInteger(maxOutputTokens)
    || !Number.isFinite(preview.inputOverheadTokens) || preview.inputOverheadTokens < 0
    || !Number.isFinite(policy.targetGrossMarginRate) || policy.targetGrossMarginRate < 0 || policy.targetGrossMarginRate >= 1
    || !Number.isFinite(policy.operatingSafetyBufferRate) || policy.operatingSafetyBufferRate < 0) return null;
  const inputTokens = Math.ceil(inputBytes / preview.inputBytesPerToken) + preview.inputOverheadTokens;
  if (inputTokens > preview.maximumInputTokens) return null;
  const providerCostUsd = (inputTokens * rate.inputUsdPerMillion + maxOutputTokens * rate.outputUsdPerMillion) / 1e6;
  const bufferedCostThb = providerCostUsd * policy.pricingFxThbPerUsd * (1 + policy.operatingSafetyBufferRate);
  const increment = policy.creditRoundingIncrement;
  const credits = Math.ceil(Math.max(rule.floorCredits,
    bufferedCostThb / (1 - policy.targetGrossMarginRate) * policy.creditsPerThbAssumption) / increment) * increment;
  const retailThb = credits / policy.creditsPerThbAssumption;
  return {
    publicEstimate: { operation, model, credits, retailThb, chargeCredits: 0,
      costBasis: 'advisory_byte_estimate', policyVersion: preview.version,
      exceedsValueTarget: credits > rule.valueReviewCredits },
    inputTokens, maxOutputTokens, providerCostUsd, bufferedCostThb,
    grossContributionThb: retailThb - bufferedCostThb,
    assumedGrossMargin: (retailThb - bufferedCostThb) / retailThb
  };
}

export function normalizeWritingUsage(usage) {
  if (!usage || !Number.isInteger(usage.input_tokens) || usage.input_tokens < 0
    || !Number.isInteger(usage.output_tokens) || usage.output_tokens < 0) return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.output_tokens_details?.reasoning_tokens ?? 0;
  if (!Number.isInteger(cached) || cached < 0 || cached > usage.input_tokens
    || !Number.isInteger(reasoning) || reasoning < 0 || reasoning > usage.output_tokens) return null;
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
    cachedInputTokens: cached, reasoningTokens: reasoning };
}

export function quoteCinematicWriting(policy, { model, operation, inputBytes, maxOutputTokens }, now = Date.now()) {
  const billing = policy.cinematicWritingBilling;
  const rate = policy.textEnhancement;
  const floor = billing?.operations?.[operation]?.floorCredits;
  const markup = policy.profitMarkupPercentByMedia?.text;
  const positive = value => Number.isFinite(value) && value > 0;
  if (!billing?.enabled || !billing.version || !rate?.enabled || rate.modelId !== model
    || !(Date.parse(rate.effectiveAt) <= now && now < Date.parse(rate.reviewBy))
    || ![billing.inputBytesPerToken, billing.maximumInputBytes, billing.quoteTtlSeconds,
      rate.inputUsdPerMillion, rate.outputUsdPerMillion, floor, maxOutputTokens,
      policy.pricingFxThbPerUsd, policy.creditsPerThbAssumption, policy.creditRoundingIncrement].every(positive)
    || !Number.isSafeInteger(inputBytes) || inputBytes < 0 || inputBytes > billing.maximumInputBytes
    || !Number.isSafeInteger(maxOutputTokens) || !Number.isFinite(billing.inputOverheadTokens)
    || billing.inputOverheadTokens < 0 || !Number.isFinite(markup) || markup < 0 || markup > 1000
    || !Number.isFinite(policy.operatingSafetyBufferRate) || policy.operatingSafetyBufferRate < 0) {
    throw Object.assign(new Error('Writing pricing is unavailable for this operation or model.'),
      { code: 'cinematic_writing_pricing_unavailable', statusCode: 503 });
  }
  const inputTokenEstimate = Math.ceil(inputBytes / billing.inputBytesPerToken) + billing.inputOverheadTokens;
  const providerCostUsd = (inputTokenEstimate * rate.inputUsdPerMillion + maxOutputTokens * rate.outputUsdPerMillion) / 1e6;
  const bufferedCostThb = providerCostUsd * policy.pricingFxThbPerUsd * (1 + policy.operatingSafetyBufferRate);
  const increment = policy.creditRoundingIncrement;
  const totalCredits = Math.max(Math.ceil(floor / increment) * increment,
    calculateCostPlusCredits(providerCostUsd, policy, 'text'));
  if (!Number.isSafeInteger(totalCredits) || totalCredits <= 0) throw new Error('Invalid writing Credit total.');
  return {
    operation, providerId: rate.providerId, modelId: model, totalCredits,
    billingMode: 'fixed_service_quote', costBasis: 'bounded_context_output_allowance',
    pricingPolicyVersion: policy.policyVersion, billingPolicyVersion: billing.version,
    providerRate: { version: rate.version, effectiveAt: rate.effectiveAt, reviewBy: rate.reviewBy,
      inputUsdPerMillion: rate.inputUsdPerMillion, outputUsdPerMillion: rate.outputUsdPerMillion,
      cachedInputUsdPerMillion: rate.cachedInputUsdPerMillion },
    inputTokenEstimate, maxOutputTokens, providerCostUsd, profitMarkupPercent: markup,
    pricingFxThbPerUsd: policy.pricingFxThbPerUsd, operatingSafetyBufferRate: policy.operatingSafetyBufferRate,
    creditsPerThbAssumption: policy.creditsPerThbAssumption, roundingIncrement: increment,
    createdAt: new Date(now).toISOString(), expiresAt: new Date(Math.min(Date.parse(rate.reviewBy),
      now + Math.min(900, billing.quoteTtlSeconds) * 1000)).toISOString()
  };
}
