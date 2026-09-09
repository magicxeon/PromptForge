import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

export function calculateTextEnhancementPrice(policy, { provider, model, inputTokenBudget, maxOutputTokens }, now = Date.now()) {
  const rate = policy.textEnhancement;
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (!rate?.enabled || rate.billingMode !== 'fixed_service_fee' || !rate.version
    || rate.providerId !== provider || rate.modelId !== model
    || !(Date.parse(rate.effectiveAt) <= now && now < Date.parse(rate.reviewBy))
    || ![rate.inputUsdPerMillion, rate.outputUsdPerMillion, rate.roundingIncrement,
      policy.pricingFxThbPerUsd, policy.creditsPerThbAssumption].every(positive)
    || !Number.isInteger(inputTokenBudget) || inputTokenBudget < 1 || inputTokenBudget > rate.maxInputTokenBudget
    || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > rate.maxOutputTokens
    || !Number.isFinite(policy.operatingSafetyBufferRate) || policy.operatingSafetyBufferRate < 0
    || !Number.isFinite(policy.targetGrossMarginRate) || policy.targetGrossMarginRate < 0 || policy.targetGrossMarginRate >= 1) {
    throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE, 'Text enhancement pricing is unavailable.', 400);
  }
  const providerCostUsd = (inputTokenBudget * rate.inputUsdPerMillion + maxOutputTokens * rate.outputUsdPerMillion) / 1e6;
  const retail = providerCostUsd * policy.pricingFxThbPerUsd * (1 + policy.operatingSafetyBufferRate)
    / (1 - policy.targetGrossMarginRate) * policy.creditsPerThbAssumption;
  return {
    providerId: provider, modelId: model,
    totalCredits: Math.max(1, Math.ceil(retail / rate.roundingIncrement) * rate.roundingIncrement),
    providerCostUsd, costBasis: 'estimated_upper_budget', billingMode: 'fixed_service_fee',
    providerRate: structuredClone(rate), pricingPolicyVersion: policy.policyVersion,
    inputTokenBudget, maxOutputTokens,
    expiresAt: new Date(Math.min(now + Math.min(900, policy.estimateTtlSeconds) * 1000, Date.parse(rate.reviewBy))).toISOString()
  };
}
