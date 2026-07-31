import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.resolve(
  __dirname,
  '../../config/fashion-quality-tiers.json'
);

export class FashionRoutingPolicyService {
  constructor({ policyPath = DEFAULT_POLICY_PATH } = {}) {
    this.policyPath = policyPath;
    this.cachedPolicy = null;
  }

  getPolicy() {
    if (this.cachedPolicy) return this.cachedPolicy;
    const policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    if (!policy?.policyVersion || !policy?.tiers || !policy?.defaultTier) {
      throw policyError(
        'fashion_routing_policy_invalid',
        'Fashion routing policy is incomplete.',
        500
      );
    }
    this.cachedPolicy = policy;
    return policy;
  }

  resolveSimpleRoute(qualityTier, providerRegistry) {
    const policy = this.getPolicy();
    const tierId = policy.tiers[qualityTier]
      ? qualityTier
      : policy.defaultTier;
    const tier = policy.tiers[tierId];
    const catalog = providerRegistry.getPublicCatalog();
    for (const modelId of tier.preferredModels || []) {
      const provider = catalog.providers.find(entry =>
        entry.models.some(model => model.id === modelId)
      );
      if (provider) {
        const selection = providerRegistry.resolveSelection(provider.id, modelId);
        return {
          ...selection,
          qualityTier: tierId,
          policyVersion: policy.policyVersion,
          promptDirective: tier.promptDirective
        };
      }
    }
    throw policyError(
      'fashion_route_unavailable',
      `No configured model is available for Fashion tier "${tierId}".`,
      503
    );
  }
}

export const fashionRoutingPolicyService = new FashionRoutingPolicyService();

function policyError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
