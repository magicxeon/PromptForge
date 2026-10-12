import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

// Fixed customer service tariff and provisional provider output-cost evidence
// are separate. No Gemini usage is passed to the OpenAI token-cost parser.
export function resolveGeminiNanoBananaPrice(record, { resolution, aspectRatio, referenceCount, outputCount }) {
  const rule = record.geminiImagePricing;
  const base = record.baseCreditsByResolution?.[resolution];
  const outputUsd = rule?.imageOutputUsdPerResolution?.[resolution];
  const ratio = aspectRatio || '1:1';
  if (!rule?.version || !Number.isSafeInteger(base) || base <= 0
    || !Number.isFinite(outputUsd) || outputUsd <= 0
    || !Number.isSafeInteger(rule.maxReferences) || rule.maxReferences < 0 || rule.maxReferences > 6
    || !Number.isSafeInteger(rule.maxOutputs) || rule.maxOutputs < 1 || rule.maxOutputs > 4
    || ![rule.inputUsdPerMillion, rule.textThinkingUsdPerMillion, rule.imageOutputUsdPerMillion].every(value => Number.isFinite(value) && value > 0)
    || !Array.isArray(rule.aspectRatios) || !rule.aspectRatios.includes(ratio)
    || !Number.isSafeInteger(referenceCount) || referenceCount < 0 || referenceCount > rule.maxReferences
    || !Number.isSafeInteger(outputCount) || outputCount < 1 || outputCount > rule.maxOutputs) {
    throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
      'Nano Banana 2.1 requires a supported resolution, ratio and image count.', 400);
  }
  return { baseOutputCredits: base,
    providerCost: {
      providerCostUsd: Number((outputUsd * outputCount).toFixed(9)),
      outputUnitCostUsd: outputUsd,
      costBasis: 'published_image_output_only',
      costScope: 'image_output_only',
      excludedCostComponents: ['input', 'text_and_thinking', 'search_grounding'],
      providerRateVersion: rule.version,
      providerPriceSource: record.providerPriceSource,
      providerPriceSourceDate: record.providerPriceSourceDate,
      outputCount,
      geminiTokenRateEvidence: {
        inputUsdPerMillion: rule.inputUsdPerMillion,
        textThinkingUsdPerMillion: rule.textThinkingUsdPerMillion,
        imageOutputUsdPerMillion: rule.imageOutputUsdPerMillion,
      },
    },
  };
}
