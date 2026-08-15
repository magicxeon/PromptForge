import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.resolve(
  __dirname,
  '../../config/fashion-model-qualifications.json'
);

export class FashionModelQualificationService {
  constructor({ configPath = DEFAULT_CONFIG_PATH } = {}) {
    this.configPath = configPath;
    this.cachedConfig = null;
  }

  getConfig() {
    if (this.cachedConfig) return this.cachedConfig;
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    if (!config?.qualificationVersion || !Array.isArray(config.models)) {
      throw qualificationError('fashion_qualification_config_invalid', 'Fashion model qualification configuration is incomplete.', 500);
    }
    this.cachedConfig = config;
    return config;
  }

  resolve(providerId, modelId, operation = 'fashion_final_composition') {
    const config = this.getConfig();
    const record = config.models.find(item =>
      item.providerId === providerId && item.modelId === modelId
    ) || null;
    return record ? {
      ...structuredClone(record),
      qualificationVersion: config.qualificationVersion,
      operationEligible: record.operations.includes(operation)
    } : null;
  }

  requireSimpleEligible(providerId, modelId, operation = 'fashion_final_composition') {
    const config = this.getConfig();
    const record = this.resolve(providerId, modelId, operation);
    if (!record
      || !config.simpleEligibleStatuses.includes(record.status)
      || !record.operationEligible) {
      throw qualificationError(
        'fashion_model_not_qualified',
        `Model "${modelId}" is not qualified for automatic Fashion routing.`,
        409,
        { providerId, modelId, operation, qualificationVersion: config.qualificationVersion }
      );
    }
    return record;
  }

  requireOperationEligible(providerId, modelId, operation = 'fashion_final_composition') {
    const config = this.getConfig();
    const record = this.resolve(providerId, modelId, operation);
    if (!record || !record.operationEligible || record.status === 'failed') {
      throw qualificationError(
        'fashion_model_operation_not_supported',
        `Model "${modelId}" is not qualified for ${operation}.`,
        409,
        { providerId, modelId, operation, qualificationVersion: config.qualificationVersion }
      );
    }
    return record;
  }

  listOperationEligible(operation = 'fashion_final_composition') {
    const config = this.getConfig();
    return config.models
      .filter(record =>
        record.status !== 'failed'
        && record.operations.includes(operation)
      )
      .map(record => ({
        ...structuredClone(record),
        qualificationVersion: config.qualificationVersion,
        operationEligible: true
      }));
  }
}

export const fashionModelQualificationService = new FashionModelQualificationService();

function qualificationError(code, message, statusCode, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
