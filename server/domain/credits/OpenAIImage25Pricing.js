import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';
import { OPENAI_IMAGE25_SIZES } from '../../config/openAIImage25.js';

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
  const estimation = profile.estimation;
  const size = OPENAI_IMAGE25_SIZES[aspectRatio];
  const factor = estimation?.qualityFactors?.[quality || 'auto'];
  if (!size || !Number.isFinite(factor) || factor < 1 || !count(referenceCount) || referenceCount > estimation.maxReferences
    || !count(outputCount) || outputCount < 1 || outputCount > 4) {
    throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
      'Image 2.5 requires a supported aspect ratio, quality, reference count and output count.', 400);
  }
  const base = calculateImageTokenCost(profile.textOnly.usage, record.tokenRateEvidence);
  const selected = referenceCount ? calculateImageTokenCost(profile.withReferences.usage, record.tokenRateEvidence) : base;
  if (!base || !selected) throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE, 'Measured token pricing evidence is invalid.', 400);
  const [width, height] = size.split('x').map(Number);
  const pixelFactor = Math.max(1, width * height / estimation.baselinePixels);
  const referenceBuckets = Math.ceil(referenceCount / profile.withReferences.referenceCount);
  const baseUsd = base.providerCostUsd * pixelFactor * factor;
  const perOutputUsd = baseUsd + Math.max(0, selected.providerCostUsd - base.providerCostUsd) * referenceBuckets;
  const measured = profile.aspectRatios.includes(aspectRatio) && (!quality || quality === 'auto')
    && referenceCount <= profile.maxReferences;
  const baseOutputCredits = floor(baseUsd);
  const perOutputCredits = floor(perOutputUsd);
  return { baseOutputCredits, referenceCredits: perOutputCredits - baseOutputCredits,
    providerCost: { providerCostUsd: Number((perOutputUsd * outputCount).toFixed(9)),
      costBasis: measured ? 'measured_usage_baseline' : 'provisional_usage_estimate', providerRateVersion: record.tokenRateEvidence.version,
      estimation: { version: estimation.version, width, height, pixelFactor, qualityFactor: factor,
        quality: quality || 'auto', referenceCount, referenceBuckets, outputCount },
      tokenRates: structuredClone(record.tokenRateEvidence), measuredUsageVersion: profile.version,
      measuredUsage: structuredClone(referenceCount ? profile.withReferences.usage : profile.textOnly.usage),
      billingMetric: 'image_tokens', ...(measured ? { qualifiedWidth: 768, qualifiedHeight: 1024 } : {}) } };
}
