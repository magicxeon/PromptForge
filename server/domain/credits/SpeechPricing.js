import { calculateCostPlusCredits } from './CostPlusPricing.js';
export function quoteSpeechPrice(policy, { modelId, inputTokens, outputTokens, originalSeconds, operation = 'speech' }, now = Date.now()) {
  const rates = policy.speechGeneration?.rates || [];
  const rate = rates.find(item => item.modelId === modelId && Date.parse(item.effectiveAt) <= now && now < Date.parse(item.until));
  const durationBased = rate?.unit === 'original_second';
  const validAllowance = durationBased
    ? operation === 'speech' && Number.isSafeInteger(originalSeconds) && originalSeconds > 0
      && Number.isFinite(rate.usdPerSecond) && rate.usdPerSecond > 0
    : Number.isSafeInteger(inputTokens) && inputTokens > 0 && Number.isSafeInteger(outputTokens) && outputTokens > 0
      && [rate?.inputUsdPerMillion, rate?.outputUsdPerMillion].every(value => Number.isFinite(value) && value > 0);
  if (!rate || !validAllowance || !['speech','voice_design'].includes(operation) || (operation === 'voice_design' && !policy.speechGeneration?.voiceDesign?.enabled)) {
    throw Object.assign(new Error('Speech pricing unavailable.'), { code: 'speech_pricing_unavailable', statusCode: 503 });
  }
  const providerCostUsd = durationBased ? originalSeconds * rate.usdPerSecond : (inputTokens * rate.inputUsdPerMillion + outputTokens * rate.outputUsdPerMillion) / 1e6;
  // Speech uses the existing text-service markup, not an independently invented tariff.
  return { modelId, operation, providerId: rate.providerId || 'gemini', totalCredits: calculateCostPlusCredits(providerCostUsd, policy, 'text'),
    ...(operation === 'voice_design' ? { pricingEvidence: structuredClone(policy.speechGeneration.voiceDesign) } : {}),
    providerCostUsd, billingMode: 'actual_usage_capped', ...(durationBased
      ? {costBasis:'maximum_original_duration', originalSeconds} : {costBasis:'maximum_token_allowance', inputTokens, outputTokens}),
    settlementPolicy: { profitMarkupPercentByMedia: structuredClone(policy.profitMarkupPercentByMedia), pricingFxThbPerUsd: policy.pricingFxThbPerUsd,
      operatingSafetyBufferRate: policy.operatingSafetyBufferRate, creditsPerThbAssumption: policy.creditsPerThbAssumption, creditRoundingIncrement: policy.creditRoundingIncrement },
    providerRate: structuredClone(rate), pricingPolicyVersion: policy.policyVersion,
    expiresAt: new Date(Math.min(now + 900000, Date.parse(rate.until))).toISOString() };
}
export function settleSpeechPrice(quote, usage) {
  if (quote.costBasis === 'maximum_original_duration') {
    const seconds = usage?.original_duration;
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > quote.originalSeconds)
      throw Object.assign(new Error('Speech duration requires reconciliation.'), {code:'speech_usage_reconciliation_required',statusCode:409});
    const providerCostUsd = seconds * quote.providerRate.usdPerSecond;
    const amountCredits = calculateCostPlusCredits(providerCostUsd, quote.settlementPolicy, 'text');
    if (amountCredits > quote.totalCredits) throw Object.assign(new Error('Speech usage exceeds cap.'), {code:'speech_usage_exceeds_consent',statusCode:409});
    return {amountCredits, providerCostUsd, originalSeconds:seconds};
  }
  const reportedInput = usage?.total_input_tokens ?? usage?.input_tokens;
  const output = usage?.total_output_tokens ?? usage?.output_tokens;
  let input = reportedInput;
  let usageEvidence;
  if (!Number.isSafeInteger(reportedInput) || reportedInput < 0 || reportedInput > quote.inputTokens
    || !Number.isSafeInteger(output) || output <= 0 || output > quote.outputTokens) {
    throw Object.assign(new Error('Speech usage requires reconciliation.'), { code: 'speech_usage_reconciliation_required', statusCode: 409 });
  }
  if (quote.operation === 'voice_design') {
    const modalityTokens = (items, modality) => {
      if (!Array.isArray(items) || !items.length
        || !items.every(item => item?.modality === modality && Number.isSafeInteger(item.tokens) && item.tokens >= 0)) return NaN;
      return items.reduce((sum, item) => sum + item.tokens, 0);
    };
    const textTokens = modalityTokens(usage.input_tokens_by_modality, 'text');
    const audioTokens = modalityTokens(usage.output_tokens_by_modality, 'audio');
    const thoughtTokens = usage.total_thought_tokens ?? 0;
    const invalidCounter = ['total_tokens', 'initial_input_tokens', 'total_input_tokens',
      'total_output_tokens', 'input_tokens', 'output_tokens', 'total_thought_tokens',
      'total_tool_use_tokens', 'total_cached_tokens'].some(key => usage[key] !== undefined
        && (!Number.isSafeInteger(usage[key]) || usage[key] < 0));
    if (!Number.isSafeInteger(textTokens) || textTokens > reportedInput
      || audioTokens !== output || invalidCounter
      || ['total_tool_use_tokens','total_cached_tokens'].some(key => usage[key] != null && usage[key] !== 0)) {
      throw Object.assign(new Error('Voice design usage requires reconciliation.'), { code: 'speech_usage_reconciliation_required', statusCode: 409 });
    }
    // Voices may report internal input/thought tokens outside the priced modalities.
    // Charge only evidenced text/audio at the frozen rates. Do not guess a thought
    // tariff or classify an unexplained input remainder as text; retain it for audit.
    input = textTokens;
    usageEvidence = {
      mapping: 'voice_design_priced_modalities_v1',
      reportedInputTokens: reportedInput,
      reportedOutputTokens: output,
      unpricedInputTokens: reportedInput - textTokens,
      unpricedThoughtTokens: thoughtTokens,
      costCoverage: reportedInput !== textTokens || thoughtTokens > 0 ? 'priced_modality_subtotal' : 'reported_modalities',
    };
  }
  const providerCostUsd = (input * quote.providerRate.inputUsdPerMillion + output * quote.providerRate.outputUsdPerMillion) / 1e6;
  const amountCredits = calculateCostPlusCredits(providerCostUsd, quote.settlementPolicy, 'text');
  if (amountCredits > quote.totalCredits) throw Object.assign(new Error('Speech usage exceeds cap.'), { code: 'speech_usage_exceeds_consent', statusCode: 409 });
  return { amountCredits, providerCostUsd, inputTokens: input, outputTokens: output,
    ...(usageEvidence ? { usageEvidence } : {}) };
}
