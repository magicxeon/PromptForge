// Advisory economics only. These values are never accepted as a charge quote.
export function estimateCinematicWriting(policy, { model, operation, inputBytes, maxOutputTokens }, now = Date.now()) {
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
