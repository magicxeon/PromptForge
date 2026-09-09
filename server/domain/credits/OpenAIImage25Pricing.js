import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

const count = value => Number.isSafeInteger(value) && value >= 0;

// Missing modality/cache detail is unknown cost, never a zero-cost inference.
export function calculateImageTokenCost(usage, rates) {
  const input = usage?.input_tokens_details;
  const output = usage?.output_tokens_details;
  const cached = input?.cached_tokens_details;
  const text = input?.text_tokens, image = input?.image_tokens, generated = output?.image_tokens;
  const cachedText = cached?.text_tokens ?? 0, cachedImage = cached?.image_tokens ?? 0;
  if (![text, image, generated, cachedText, cachedImage, usage?.input_tokens, usage?.output_tokens, usage?.total_tokens].every(count)
    || !generated || (output.text_tokens ?? 0) !== 0 || text + image !== usage.input_tokens
    || generated !== usage.output_tokens || usage.total_tokens !== usage.input_tokens + usage.output_tokens
    || cachedText > text || cachedImage > image
    || (input.cached_tokens !== undefined && input.cached_tokens !== cachedText + cachedImage)
    || (usage.cached_tokens !== undefined && usage.cached_tokens !== cachedText + cachedImage)
    || !['textInput', 'imageInput', 'imageOutput', 'cachedTextInput', 'cachedImageInput'].every(key => Number.isFinite(rates?.[key]) && rates[key] > 0)) return null;
  const usd = ((text - cachedText) * rates.textInput + cachedText * rates.cachedTextInput
    + (image - cachedImage) * rates.imageInput + cachedImage * rates.cachedImageInput
    + generated * rates.imageOutput) / 1e6;
  if (!Number.isFinite(usd)) return null;
  return { providerCostUsd: Number(usd.toFixed(9)), costBasis: 'provider_reported_usage',
    providerRateVersion: rates.version, currency: 'USD',
    tokens: { textInput: text, imageInput: image, imageOutput: generated, cachedTextInput: cachedText, cachedImageInput: cachedImage } };
}

export function resolveImage25MeasuredPrice(record, { resolution, aspectRatio, quality, referenceCount, outputCount }, floor) {
  const profile = record.measuredUsagePricing;
  if (resolution !== '1K' || !profile.aspectRatios.includes(aspectRatio)
    || (quality && quality !== 'auto') || !count(referenceCount) || referenceCount > profile.maxReferences
    || !count(outputCount) || outputCount < 1 || outputCount > 4) {
    throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
      'Image 2.5 measured pricing currently covers 1K, 3:4 or 6:8, auto quality and up to two references.', 400);
  }
  const base = calculateImageTokenCost(profile.textOnly.usage, record.tokenRateEvidence);
  const selected = referenceCount ? calculateImageTokenCost(profile.withReferences.usage, record.tokenRateEvidence) : base;
  if (!base || !selected) throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE, 'Measured token pricing evidence is invalid.', 400);
  const baseOutputCredits = floor(base.providerCostUsd);
  const perOutputCredits = floor(selected.providerCostUsd);
  return { baseOutputCredits, referenceCredits: perOutputCredits - baseOutputCredits,
    providerCost: { providerCostUsd: Number((selected.providerCostUsd * outputCount).toFixed(9)),
      costBasis: 'measured_usage_baseline', providerRateVersion: record.tokenRateEvidence.version,
      tokenRates: structuredClone(record.tokenRateEvidence), measuredUsageVersion: profile.version,
      measuredUsage: structuredClone(referenceCount ? profile.withReferences.usage : profile.textOnly.usage),
      billingMetric: 'image_tokens', qualifiedWidth: 768, qualifiedHeight: 1024 } };
}
