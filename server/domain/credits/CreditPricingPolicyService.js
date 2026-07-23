import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_POLICY_PATH = path.resolve(__dirname, '../../config/credit-pricing-policy.json');

function normalizeResolution(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeOptional(value) {
  return value === undefined || value === null || value === '' ? null : String(value).trim();
}

function requireFinitePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Credit pricing policy requires a positive ${name}.`);
  }
  return number;
}

export class CreditPricingPolicyService {
  constructor({ policyPath = DEFAULT_POLICY_PATH, policyData = null } = {}) {
    this.policyPath = policyPath;
    this.policy = policyData;
  }

  validatePolicy(policy) {
    if (!policy || !Array.isArray(policy.models) || !policy.policyVersion) {
      throw new Error('Credit pricing policy is missing policyVersion or models.');
    }

    for (const field of [
      'pricingFxThbPerUsd',
      'operatingSafetyBufferRate',
      'targetGrossMarginRate',
      'creditsPerThbAssumption',
      'creditRoundingIncrement',
      'estimateTtlSeconds'
    ]) {
      requireFinitePositive(policy[field], field);
    }

    if (Number(policy.targetGrossMarginRate) >= 1) {
      throw new Error('Credit pricing policy targetGrossMarginRate must be less than 1.');
    }

    return policy;
  }

  async loadPolicy() {
    if (this.policy) return this.validatePolicy(this.policy);

    try {
      const content = await fs.readFile(this.policyPath, 'utf8');
      this.policy = this.validatePolicy(JSON.parse(content));
      return this.policy;
    } catch (err) {
      throw createCreditError(
        CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
        `Failed to load credit pricing policy: ${err.message}`,
        500
      );
    }
  }

  async getPolicyVersion() {
    return (await this.loadPolicy()).policyVersion;
  }

  calculateMinimumRetailFloorFromPolicy(providerCostUsd, policy) {
    const providerCostThb = requireFinitePositive(providerCostUsd, 'providerCostUsd')
      * Number(policy.pricingFxThbPerUsd);
    const bufferedCostThb = providerCostThb * (1 + Number(policy.operatingSafetyBufferRate));
    const minimumRetailThb = bufferedCostThb / (1 - Number(policy.targetGrossMarginRate));
    const rawMinimumCredits = minimumRetailThb * Number(policy.creditsPerThbAssumption);
    const increment = Number(policy.creditRoundingIncrement);
    return Math.ceil(rawMinimumCredits / increment) * increment;
  }

  async calculateMinimumRetailFloor(providerCostUsd) {
    return this.calculateMinimumRetailFloorFromPolicy(providerCostUsd, await this.loadPolicy());
  }

  async findModelPricing(providerId, modelId) {
    const policy = await this.loadPolicy();
    const modelRecord = policy.models.find(
      model => model.providerId === providerId && model.modelId === modelId
    );

    if (!modelRecord || !modelRecord.enabled || modelRecord.pricingStatus !== 'priced') {
      throw createCreditError(
        CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
        `Pricing is unavailable for provider "${providerId}" and model "${modelId}".`,
        400,
        { providerId, modelId, policyVersion: policy.policyVersion }
      );
    }

    return modelRecord;
  }

  async calculateEstimate(options = {}) {
    const policy = await this.loadPolicy();
    const {
      routingMode = 'advanced',
      qualityTier = 'standard',
      generationMode = 'scene',
      requestedProviderId,
      requestedModelId,
      resolution = '1K',
      quality = null,
      referenceCount = 0,
      outputCount = 1,
      userId
    } = options;

    if (!userId || !requestedProviderId || !requestedModelId) {
      throw createCreditError(
        CREDIT_ERROR_CODES.PRICING_UNAVAILABLE,
        'User ID, provider ID, and model ID are required for a credit estimate.',
        400
      );
    }

    const modelRecord = await this.findModelPricing(requestedProviderId, requestedModelId);
    const normalizedResolution = normalizeResolution(resolution) || '1K';
    const normalizedQuality = normalizeOptional(quality);
    const qualityForLookup = normalizedQuality || normalizeOptional(qualityTier) || 'standard';
    let baseOutputCredits = Number(modelRecord.publishedCredits || 0);

    if (modelRecord.baseCreditsByResolution) {
      const prices = modelRecord.baseCreditsByResolution;
      baseOutputCredits = Number(prices[normalizedResolution] ?? prices.default ?? baseOutputCredits);
    } else if (modelRecord.baseCreditsByQuality) {
      const prices = modelRecord.baseCreditsByQuality;
      baseOutputCredits = Number(prices[qualityForLookup] ?? prices.standard ?? baseOutputCredits);
    }

    if (!Number.isFinite(baseOutputCredits) || baseOutputCredits <= 0) {
      throw createCreditError(CREDIT_ERROR_CODES.PRICING_UNAVAILABLE, 'No valid base credit rate exists for this request.', 400);
    }

    const referencePolicy = modelRecord.referencePricing || { mode: 'free', unitCredits: 0, freeCount: 0 };
    const normalizedReferenceCount = Math.max(0, Math.floor(Number(referenceCount) || 0));
    const normalizedOutputCount = Math.max(1, Math.floor(Number(outputCount) || 1));
    const billableReferences = Math.max(0, normalizedReferenceCount - Math.max(0, Number(referencePolicy.freeCount) || 0));
    const referenceCredits = referencePolicy.mode === 'free'
      ? 0
      : billableReferences * Math.max(0, Number(referencePolicy.unitCredits) || 0);
    const totalCredits = (baseOutputCredits + referenceCredits) * normalizedOutputCount;
    const now = new Date();

    return {
      estimateId: `est_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      pricingPolicyVersion: policy.policyVersion,
      routing: {
        routingMode: normalizeOptional(routingMode) || 'advanced',
        qualityTier: normalizeOptional(qualityTier) || 'standard',
        requestedProviderId,
        requestedModelId,
        resolvedProviderId: requestedProviderId,
        resolvedModelId: requestedModelId
      },
      pricingInputs: {
        resolution: normalizedResolution,
        quality: normalizedQuality,
        referenceCount: normalizedReferenceCount,
        outputCount: normalizedOutputCount,
        generationMode: normalizeOptional(generationMode) || 'scene'
      },
      breakdown: {
        baseOutputCredits,
        referenceCredits,
        textCredits: 0,
        adjustmentCredits: 0,
        totalCredits
      },
      estimatedCredits: totalCredits,
      estimateConfidence: referencePolicy.mode === 'provisional' ? 'provisional' : 'locked',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + Number(policy.estimateTtlSeconds) * 1000).toISOString()
    };
  }
}

export const creditPricingPolicyService = new CreditPricingPolicyService();
