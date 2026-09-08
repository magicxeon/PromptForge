import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';
import { TRUSTED_GENERATED_SOURCE_POLICY } from '../../config/trustedGeneratedSources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '../../config/cinematic-video-models.json');
const MODEL_ALIASES = new Map([
  ['gemini/gemini-omni-flash-preview', 'gemini-omni-1.1-flash']
]);
const INPUT_MODES = new Set([
  'text_to_video', 'image_to_video', 'first_last_frame', 'multimodal_reference',
  'video_extend', 'video_edit'
]);
const LEGACY_INPUT_OPERATIONS = new Set(['text_to_video', 'image_to_video', 'character_to_video']);
const COMMERCIAL_OPERATIONS = new Set([
  'playground_video', 'cinematic_motion_preview', 'cinematic_draft_clip',
  'cinematic_final_clip', 'cinematic_audio', 'cinematic_final_assembly'
]);
const DEVELOPMENT_POC_WARNING_CODE = 'video_model_unverified_development_poc';
const AUTHORIZED_PORTRAIT_POLICY = 'provider_authorized_asset_required';
const GENERATED_ASSET_POLICY = 'provider_generated_asset_required';
const DEVELOPMENT_POC_REFERENCE_CONSTRAINTS = Object.freeze({
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  minimumWidth: 300,
  minimumHeight: 300,
  maximumWidth: 6000,
  maximumHeight: 6000,
  maximumBytes: 30 * 1024 * 1024,
  minimumAspectRatio: 0.4,
  maximumAspectRatio: 2.5
});

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
  constructor({
    catalogPath = DEFAULT_PATH,
    runtimeEnvironment = process.env.NODE_ENV || 'development',
    developmentPocEnabled = process.env.CINEMATIC_VIDEO_POC_ENABLE_UNVERIFIED_SEEDANCE === 'true',
    developmentPocCredits = process.env.CINEMATIC_VIDEO_POC_CREDITS,
    availabilityPolicy = providerAvailabilityPolicyService
  } = {}) {
    this.catalogPath = catalogPath;
    this.catalog = null;
    this.runtimeEnvironment = runtimeEnvironment;
    this.developmentPocEnabled = runtimeEnvironment !== 'production' && developmentPocEnabled === true;
    this.developmentPocCredits = boundedInteger(developmentPocCredits, 1, 10, 1);
    this.availabilityPolicy = availabilityPolicy;
  }

  load() {
    if (!this.catalog) {
      const parsed = JSON.parse(fs.readFileSync(this.catalogPath, 'utf8'));
      if (!parsed?.catalogVersion || !Array.isArray(parsed.models)) throw new TypeError('Video capability catalog is invalid.');
      this.catalog = parsed;
    }
    return this.catalog;
  }

  getPublicCatalog({ includeResearch = false, includeTesting = false, workflow = null } = {}) {
    const catalog = this.load();
    return {
      schemaVersion: catalog.schemaVersion,
      catalogVersion: this.developmentPocEnabled
        ? `${catalog.catalogVersion}-development-poc`
        : catalog.catalogVersion,
      runtimeControlVersion: this.availabilityPolicy.getVersion(),
      models: catalog.models.filter(model => (
        (includeResearch
          || model.paidRoutingEnabled === true
          || (includeTesting && model.testingRoutingEnabled === true))
        && this.availabilityPolicy.evaluate({
          providerId: model.providerId,
          modelId: model.modelId,
          workflow
        }).enabled
      )).map(model => toPublicModel(this.#effectiveModel(model)))
    };
  }

  getAdminCatalog() {
    return {
      schemaVersion: this.load().schemaVersion,
      catalogVersion: this.load().catalogVersion,
      models: this.load().models.map(model => ({
        providerId: model.providerId,
        modelId: model.modelId,
        displayName: model.displayName,
        staticEnabled: model.enabled !== false,
        qualificationStatus: model.qualificationStatus || 'unqualified',
        pricingStatus: model.pricingStatus || 'unavailable',
        paidRoutingEnabled: model.paidRoutingEnabled === true,
        testingRoutingEnabled: this.runtimeEnvironment !== 'production'
          && model.testingRoutingEnabled === true,
        commercialOperations: getCommercialOperations(model),
        inputModes: getInputModes(model)
      }))
    };
  }

  resolve(providerId, modelId) {
    const canonicalModelId = MODEL_ALIASES.get(`${providerId}/${modelId}`) || modelId;
    const model = this.load().models.find(item => item.providerId === providerId && item.modelId === canonicalModelId);
    return model ? this.#effectiveModel(model) : null;
  }

  validateRequest(input, { allowResearch = false, allowTesting = false, workflow = null } = {}) {
    const model = this.resolve(input.providerId, input.modelId);
    if (!model) throw new VideoCapabilityError('video_model_unknown', 'Video model is unknown.');
    this.availabilityPolicy.assertAvailable({
      providerId: model.providerId,
      modelId: model.modelId,
      workflow: workflow || input.providerWorkflow || null
    });
    if (!allowResearch && model.paidRoutingEnabled !== true
      && !(allowTesting && model.testingRoutingEnabled === true)) {
      throw new VideoCapabilityError('video_model_not_qualified', 'Video model is not qualified for paid routing.', 409);
    }
    const selection = normalizeVideoExecutionSelection(input);
    const commercialOperations = getCommercialOperations(model);
    const inputModes = getInputModes(model);
    if (!commercialOperations.includes(selection.commercialOperation)) {
      throw unsupported('commercialOperation', selection.commercialOperation);
    }
    if (!inputModes.includes(selection.inputMode)) throw unsupported('inputMode', selection.inputMode);
    if (!model.aspectRatios.includes(input.aspectRatio)) throw unsupported('aspectRatio', input.aspectRatio);
    if (!model.resolutions.includes(input.resolution)) throw unsupported('resolution', input.resolution);
    if (!model.durations.includes(Number(input.durationSeconds))) throw unsupported('durationSeconds', input.durationSeconds);
    if (!model.audioModes.includes(input.audioMode)) throw unsupported('audioMode', input.audioMode);
    const referenceCount = Number(input.referenceImageCount || 0);
    if (referenceCount > model.referenceImageLimit) throw unsupported('referenceImageCount', referenceCount);
    validateReferenceCount(selection.inputMode, referenceCount);
    if (referenceCount > 0
      && input.referenceContainsPerson === true
      && model.portraitReferencePolicy === AUTHORIZED_PORTRAIT_POLICY) {
      throw new VideoCapabilityError(
        'video_provider_portrait_authorization_required',
        'This provider requires an authorized portrait Asset for Character image references.',
        409,
        { providerId: model.providerId, modelId: model.modelId, recovery: 'choose_compatible_provider' }
      );
    }
    if (referenceCount > 0
      && input.referenceContainsPerson === true
      && model.portraitReferencePolicy === GENERATED_ASSET_POLICY) {
      validateTrustedGeneratedImageSource(input, model);
    }
    if (model.providerId === 'gemini' && model.modelId.startsWith('veo-')
      && (input.resolution !== '720p' || referenceCount > 0)
      && Number(input.durationSeconds) !== 8) {
      throw new VideoCapabilityError('video_parameter_combination_unsupported', 'This Veo resolution or reference mode requires an 8-second output.');
    }
    return structuredClone({
      ...model,
      commercialOperations,
      inputModes
    });
  }

  #effectiveModel(model) {
    const copy = structuredClone(model);
    copy.supportsOrderedImageReferences = copy.providerId === 'modelark';
    if (copy.trustedGeneratedImageSource?.compatibilityId === 'modelark-seedance-2') {
      copy.playgroundReferencePolicy = structuredClone(TRUSTED_GENERATED_SOURCE_POLICY);
    }
    if (!this.developmentPocEnabled
      || copy.providerId !== 'modelark'
      || !String(copy.modelId || '').includes('seedance')
      || copy.testingRoutingEnabled !== true
      || copy.supportsFirstFrame !== true
      || getInputModes(copy).includes('image_to_video')) {
      return copy;
    }
    copy.operations = [...new Set([...(copy.operations || []), 'image_to_video'])];
    copy.inputModes = [...new Set([...getInputModes(copy), 'image_to_video'])];
    if (copy.developmentPocLookReferences === true) {
      copy.inputModes.push('multimodal_reference');
      copy.supportsCinematicLookReferences = true;
    }
    copy.referenceConstraints ||= structuredClone(DEVELOPMENT_POC_REFERENCE_CONSTRAINTS);
    copy.developmentPocUnverified = true;
    copy.developmentPocCredits = this.developmentPocCredits;
    copy.developmentPocWarningCode = DEVELOPMENT_POC_WARNING_CODE;
    return copy;
  }
}

export function validateTrustedGeneratedImageSource(input, model, { now = new Date() } = {}) {
  const requirement = model?.trustedGeneratedImageSource;
  const authority = input?.referenceAuthority;
  const provenance = authority?.providerOutputProvenance;
  let reason = null;
  if (!requirement || !authority || authority.kind !== 'cinematic_storyboard_source') {
    reason = 'source_authority_missing';
  } else if (authority.immutable !== true || !authority.contentHash || !authority.sourceFingerprint) {
    reason = 'source_authority_invalid';
  } else if (!provenance || provenance.kind !== 'provider_generated_image') {
    reason = 'source_provenance_missing';
  } else if (provenance.providerId !== requirement.providerId
    || !requirement.modelIds?.includes(provenance.resolvedModelId)) {
    reason = 'source_model_not_qualified';
  } else if (requirement.requiresOriginalBytes === true
    && provenance.originalBytesPreserved !== true) {
    reason = 'source_bytes_not_preserved';
  } else if (requirement.requiresSameCredentialScope === true
    && (!provenance.credentialScope
      || provenance.credentialScope !== input.providerCredentialScope)) {
    reason = 'source_credential_scope_mismatch';
  } else {
    const generatedAt = new Date(provenance.generatedAt);
    const maximumAgeMs = Math.max(1, Number(requirement.maximumAgeDays || 30)) * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(generatedAt.getTime())
      || generatedAt.getTime() > new Date(now).getTime() + 5 * 60 * 1000
      || generatedAt.getTime() + maximumAgeMs <= new Date(now).getTime()) {
      reason = 'source_trust_window_expired';
    }
  }
  if (!reason) return true;
  throw new VideoCapabilityError(
    'video_provider_synthetic_character_source_required',
    'Seedance requires this Character keyframe to be generated by a compatible Seedream model.',
    409,
    {
      providerId: model.providerId,
      modelId: model.modelId,
      reason,
      recovery: 'regenerate_storyboard_with_compatible_seedream'
    }
  );
}

export function normalizeVideoExecutionSelection(input = {}, { defaultCommercialOperation = 'playground_video' } = {}) {
  const legacyOperation = String(input.operation || '').trim();
  const explicitCommercialOperation = String(input.commercialOperation || '').trim();
  const explicitInputMode = String(input.inputMode || '').trim();
  const referenceCount = Math.max(0, Number(input.referenceImageCount || 0));
  const commercialOperation = explicitCommercialOperation
    || (COMMERCIAL_OPERATIONS.has(legacyOperation) ? legacyOperation : defaultCommercialOperation);
  const inputMode = explicitInputMode
    || legacyInputMode(legacyOperation)
    || inferInputMode(referenceCount);
  if (!COMMERCIAL_OPERATIONS.has(commercialOperation)) throw unsupported('commercialOperation', commercialOperation);
  if (!INPUT_MODES.has(inputMode)) throw unsupported('inputMode', inputMode);
  return {
    commercialOperation,
    inputMode,
    operation: adapterOperation(legacyOperation, inputMode, input),
    legacyInferred: !explicitCommercialOperation || !explicitInputMode
  };
}

function unsupported(field, value) {
  return new VideoCapabilityError('video_parameter_unsupported', `Video ${field} is unsupported.`, 400, { field, value });
}

function toPublicModel(model) {
  const { ratesByResolutionUsd, ratesByResolutionUsdPerMillionTokens, ratesByAudioUsdPerMillionTokens, ratesByInputModeUsdPerMillionTokens,
    ratesByResolutionAndInputModeUsdPerMillionTokens, providerDiscounts, minimumInputVideoTokens, ...safe } = model;
  return {
    ...safe,
    commercialOperations: getCommercialOperations(model),
    inputModes: getInputModes(model)
  };
}

function getCommercialOperations(model) {
  if (Array.isArray(model.commercialOperations)) return [...model.commercialOperations];
  const operations = (model.operations || []).filter(operation => COMMERCIAL_OPERATIONS.has(operation));
  if ((model.operations || []).some(operation => LEGACY_INPUT_OPERATIONS.has(operation))) operations.unshift('playground_video');
  return [...new Set(operations)];
}

function getInputModes(model) {
  if (Array.isArray(model.inputModes)) return [...model.inputModes];
  return [...new Set((model.operations || []).flatMap(operation => {
    if (operation === 'character_to_video') return ['multimodal_reference'];
    return INPUT_MODES.has(operation) ? [operation] : [];
  }))];
}

function legacyInputMode(operation) {
  if (operation === 'character_to_video') return 'multimodal_reference';
  return INPUT_MODES.has(operation) ? operation : null;
}

function inferInputMode(referenceCount) {
  if (referenceCount === 0) return 'text_to_video';
  if (referenceCount === 1) return 'image_to_video';
  if (referenceCount === 2) return 'first_last_frame';
  return 'multimodal_reference';
}

function adapterOperation(legacyOperation, inputMode, input) {
  if (LEGACY_INPUT_OPERATIONS.has(legacyOperation)) return legacyOperation;
  if (inputMode === 'text_to_video') return 'text_to_video';
  if (inputMode === 'multimodal_reference' && (input.characterProfileId || input.characterProfileVersionId)) {
    return 'character_to_video';
  }
  return 'image_to_video';
}

function validateReferenceCount(inputMode, referenceCount) {
  if (inputMode === 'text_to_video' && referenceCount !== 0) throw unsupported('referenceImageCount', referenceCount);
  if (inputMode === 'image_to_video' && referenceCount !== 1) throw unsupported('referenceImageCount', referenceCount);
  if (inputMode === 'first_last_frame' && referenceCount !== 2) throw unsupported('referenceImageCount', referenceCount);
  if (inputMode === 'multimodal_reference' && referenceCount < 1) throw unsupported('referenceImageCount', referenceCount);
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

export function resolveCanonicalVideoModelId(providerId, modelId) {
  return MODEL_ALIASES.get(`${providerId}/${modelId}`) || modelId;
}

export const videoCapabilityRegistry = new VideoCapabilityRegistry();
