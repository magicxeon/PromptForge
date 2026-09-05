import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fashionModelQualificationService } from './FashionModelQualificationService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.resolve(
  __dirname,
  '../../config/fashion-quality-tiers.json'
);

export class FashionRoutingPolicyService {
  constructor({
    policyPath = DEFAULT_POLICY_PATH,
    qualificationService = fashionModelQualificationService
  } = {}) {
    this.policyPath = policyPath;
    this.qualificationService = qualificationService;
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
    const catalog = providerRegistry.getPublicCatalog({
      generationSurface: 'fashion', generationMode: 'fashion'
    });
    for (const modelId of tier.preferredModels || []) {
      const provider = catalog.providers.find(entry =>
        entry.models.some(model => model.id === modelId)
      );
      if (provider) {
        const selection = providerRegistry.resolveSelection(provider.id, modelId, {
          generationSurface: 'fashion', generationMode: 'fashion'
        });
        const qualification = this.qualificationService.requireSimpleEligible(
          provider.id,
          modelId
        );
        return {
          ...selection,
          qualityTier: tierId,
          policyVersion: policy.policyVersion,
          promptDirective: tier.promptDirective,
          qualificationVersion: qualification.qualificationVersion,
          qualificationStatus: qualification.status,
          promptStrategyVersion: qualification.promptStrategyVersion
        };
      }
    }
    throw policyError(
      'fashion_route_unavailable',
      `No configured model is available for Fashion tier "${tierId}".`,
      503
    );
  }

  resolveAdvancedRoute(providerId, modelId, providerRegistry) {
    const selection = providerRegistry.resolveSelection(providerId, modelId, {
      generationSurface: 'fashion', generationMode: 'fashion'
    });
    const qualification = this.qualificationService.requireOperationEligible(
      providerId,
      modelId,
      'fashion_final_composition'
    );
    return {
      ...selection,
      qualificationVersion: qualification.qualificationVersion,
      qualificationStatus: qualification.status,
      promptStrategyVersion: qualification.promptStrategyVersion || null
    };
  }

  getAdvancedCatalog(providerRegistry) {
    const catalog = providerRegistry.getPublicCatalog({
      generationSurface: 'fashion', generationMode: 'fashion'
    });
    const eligibleRecords = this.qualificationService.listOperationEligible(
      'fashion_final_composition'
    );
    const eligibleByKey = new Map(eligibleRecords.map(record => [
      `${record.providerId}:${record.modelId}`,
      record
    ]));
    const providers = catalog.providers
      .map(provider => {
        const models = provider.models
          .filter(model => (
            eligibleByKey.has(`${provider.id}:${model.id}`)
            || (provider.catalogVisible === true && model.paidRoutingEnabled === false)
          ))
          .map(model => ({
            ...model,
            fashionQualification: eligibleByKey.get(`${provider.id}:${model.id}`) || null,
            paidRoutingEnabled: model.paidRoutingEnabled !== false
              && eligibleByKey.has(`${provider.id}:${model.id}`),
            unavailableReason: eligibleByKey.has(`${provider.id}:${model.id}`)
              ? model.unavailableReason || null
              : 'fashion_operation_unqualified'
          }));
        if (!models.length) return null;
        return {
          ...provider,
          defaultModel: models.some(model => model.id === provider.defaultModel)
            ? provider.defaultModel
            : models[0].id,
          models
        };
      })
      .filter(Boolean);
    const defaultProvider = providers.some(provider =>
      provider.id === catalog.defaultProvider
    )
      ? catalog.defaultProvider
      : providers[0]?.id || '';
    return {
      ...catalog,
      defaultProvider,
      providers,
      fashionOperation: 'fashion_final_composition',
      qualificationVersion: eligibleRecords[0]?.qualificationVersion || null
    };
  }
}

export const fashionRoutingPolicyService = new FashionRoutingPolicyService();

function policyError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
