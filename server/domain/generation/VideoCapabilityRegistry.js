import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '../../config/cinematic-video-models.json');
const MODEL_ALIASES = new Map([
  ['gemini/gemini-omni-flash-preview', 'gemini-omni-1.1-flash']
]);

export class VideoCapabilityError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'VideoCapabilityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class VideoCapabilityRegistry {
  constructor({ catalogPath = DEFAULT_PATH } = {}) {
    this.catalogPath = catalogPath;
    this.catalog = null;
  }

  load() {
    if (!this.catalog) {
      const parsed = JSON.parse(fs.readFileSync(this.catalogPath, 'utf8'));
      if (!parsed?.catalogVersion || !Array.isArray(parsed.models)) throw new TypeError('Video capability catalog is invalid.');
      this.catalog = parsed;
    }
    return this.catalog;
  }

  getPublicCatalog({ includeResearch = false, includeTesting = false } = {}) {
    const catalog = this.load();
    return {
      schemaVersion: catalog.schemaVersion,
      catalogVersion: catalog.catalogVersion,
      models: catalog.models.filter(model => (
        includeResearch
        || model.paidRoutingEnabled === true
        || (includeTesting && model.testingRoutingEnabled === true)
      )).map(toPublicModel)
    };
  }

  resolve(providerId, modelId) {
    const canonicalModelId = MODEL_ALIASES.get(`${providerId}/${modelId}`) || modelId;
    return this.load().models.find(model => model.providerId === providerId && model.modelId === canonicalModelId) || null;
  }

  validateRequest(input, { allowResearch = false, allowTesting = false } = {}) {
    const model = this.resolve(input.providerId, input.modelId);
    if (!model) throw new VideoCapabilityError('video_model_unknown', 'Video model is unknown.');
    if (!allowResearch && model.paidRoutingEnabled !== true
      && !(allowTesting && model.testingRoutingEnabled === true)) {
      throw new VideoCapabilityError('video_model_not_qualified', 'Video model is not qualified for paid routing.', 409);
    }
    if (!model.operations.includes(input.operation)) throw unsupported('operation', input.operation);
    if (!model.aspectRatios.includes(input.aspectRatio)) throw unsupported('aspectRatio', input.aspectRatio);
    if (!model.resolutions.includes(input.resolution)) throw unsupported('resolution', input.resolution);
    if (!model.durations.includes(Number(input.durationSeconds))) throw unsupported('durationSeconds', input.durationSeconds);
    if (!model.audioModes.includes(input.audioMode)) throw unsupported('audioMode', input.audioMode);
    const referenceCount = Number(input.referenceImageCount || 0);
    if (referenceCount > model.referenceImageLimit) throw unsupported('referenceImageCount', referenceCount);
    if (model.providerId === 'gemini' && model.modelId.startsWith('veo-')
      && (input.resolution !== '720p' || referenceCount > 0)
      && Number(input.durationSeconds) !== 8) {
      throw new VideoCapabilityError('video_parameter_combination_unsupported', 'This Veo resolution or reference mode requires an 8-second output.');
    }
    return structuredClone(model);
  }
}

function unsupported(field, value) {
  return new VideoCapabilityError('video_parameter_unsupported', `Video ${field} is unsupported.`, 400, { field, value });
}

function toPublicModel(model) {
  const { ratesByResolutionUsd, ratesByResolutionUsdPerMillionTokens, ratesByAudioUsdPerMillionTokens, ratesByInputModeUsdPerMillionTokens, ...safe } = model;
  return safe;
}

export function resolveCanonicalVideoModelId(providerId, modelId) {
  return MODEL_ALIASES.get(`${providerId}/${modelId}`) || modelId;
}

export const videoCapabilityRegistry = new VideoCapabilityRegistry();
