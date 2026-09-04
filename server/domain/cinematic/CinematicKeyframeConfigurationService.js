import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.resolve(__dirname, '../../config/cinematic');
const DEFAULT_PATHS = Object.freeze({
  policy: path.resolve(CONFIG_ROOT, 'keyframe-policy.v2.json'),
  budget: path.resolve(CONFIG_ROOT, 'prompt-budget.v2.json'),
  captureProfile: path.resolve(CONFIG_ROOT, 'capture-profiles/photorealistic-cinematic.v2.json'),
  providerPromptPolicy: path.resolve(CONFIG_ROOT, 'storyboard-provider-prompt-policy.v2.json')
});

const SECTION_KEYS = new Set([
  'keyframeMoment',
  'subjectAuthority',
  'composition',
  'performance',
  'lightingEnvironment',
  'continuity',
  'prohibitions',
  'authorDirection'
]);

const PROVIDER_PROMPT_BLOCK_KEYS = new Set([
  'visualAuthority',
  'referenceAuthority',
  'subjectBehavior',
  'photographicBehavior',
  'constraints'
]);

const REFERENCE_ROLE_KEYS = Object.freeze([
  'template_baseline_reference',
  'template_baseline',
  'character_reference_a',
  'character_reference_b',
  'character_reference',
  'outfit_front_reference',
  'outfit_back_reference',
  'outfit_front',
  'outfit_back',
  'face_reference_a',
  'face_reference_b',
  'face_reference',
  'style_reference',
  'pose_reference',
  'product_reference',
  'environment_reference'
]);

export class CinematicKeyframeConfigurationService {
  constructor({ paths = DEFAULT_PATHS, policy, budget, captureProfile, providerPromptPolicy } = {}) {
    const resolvedPaths = { ...DEFAULT_PATHS, ...paths };
    this.policy = validatePolicy(policy || loadJson(resolvedPaths.policy));
    this.budget = validateBudget(budget || loadJson(resolvedPaths.budget), this.policy);
    this.captureProfile = validateCaptureProfile(
      captureProfile || loadJson(resolvedPaths.captureProfile)
    );
    this.providerPromptPolicy = validateProviderPromptPolicy(
      providerPromptPolicy || loadJson(resolvedPaths.providerPromptPolicy),
      this.policy
    );
    if (this.policy.defaultCaptureProfileId !== this.captureProfile.id) {
      invalid('The keyframe policy default capture profile is unavailable.');
    }
    this.fingerprint = createFingerprint({
      policy: this.policy,
      budget: this.budget,
      captureProfile: this.captureProfile
    });
    this.providerPromptFingerprint = createFingerprint({
      providerPromptPolicy: this.providerPromptPolicy
    });
  }

  getCompilerConfiguration() {
    return structuredClone({
      policy: this.policy,
      budget: this.budget,
      captureProfile: this.captureProfile,
      providerPromptPolicy: this.providerPromptPolicy,
      fingerprint: this.fingerprint,
      providerPromptFingerprint: this.providerPromptFingerprint
    });
  }
}

function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${CONFIG_ROOT}${path.sep}`)) {
    invalid('Cinematic keyframe configuration must remain under server/config/cinematic.');
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function validatePolicy(value) {
  assertHeader(value, 'keyframe policy');
  if (!text(value.contractVersion) || !text(value.defaultCaptureProfileId)) {
    invalid('The keyframe policy requires contractVersion and defaultCaptureProfileId.');
  }
  if (!Array.isArray(value.promptSectionOrder)
    || value.promptSectionOrder.length !== SECTION_KEYS.size
    || new Set(value.promptSectionOrder).size !== SECTION_KEYS.size
    || value.promptSectionOrder.some(section => !SECTION_KEYS.has(section))) {
    invalid('The keyframe policy prompt section order is invalid.');
  }
  if (!Array.isArray(value.requiredShotFields) || !value.requiredShotFields.length) {
    invalid('The keyframe policy requires Shot fields.');
  }
  if (!Array.isArray(value.globalProhibitions) || !value.globalProhibitions.length) {
    invalid('The keyframe policy requires global prohibitions.');
  }
  const referencePolicy = value.referencePolicy;
  if (!referencePolicy || !Number.isInteger(referencePolicy.maximumLookAssets)
    || referencePolicy.maximumLookAssets < 0) {
    invalid('The keyframe reference policy is invalid.');
  }
  if (!value.stillFramePositions || Object.values(value.stillFramePositions).some(item => !text(item))) {
    invalid('The keyframe policy requires still-frame positions.');
  }
  return freezeClone(value);
}

function validateBudget(value, policy) {
  assertHeader(value, 'prompt budget');
  if (!Number.isInteger(value.maximumPromptCharacters) || value.maximumPromptCharacters < 1000) {
    invalid('The prompt budget maximum is invalid.');
  }
  if (!value.sectionCharacterLimits || typeof value.sectionCharacterLimits !== 'object') {
    invalid('The prompt budget requires section limits.');
  }
  for (const section of policy.promptSectionOrder) {
    if (!Number.isInteger(value.sectionCharacterLimits[section])
      || value.sectionCharacterLimits[section] < 100) {
      invalid(`The prompt budget for ${section} is invalid.`);
    }
  }
  return freezeClone(value);
}

function validateCaptureProfile(value) {
  assertHeader(value, 'capture profile');
  if (!text(value.label) || !Array.isArray(value.instructions) || !value.instructions.length
    || !Array.isArray(value.prohibitions) || !value.prohibitions.length) {
    invalid('The capture profile is incomplete.');
  }
  return freezeClone(value);
}

function validateProviderPromptPolicy(value, keyframePolicy) {
  assertHeader(value, 'provider prompt policy');
  if (!Number.isInteger(value.defaultMaximumPromptCharacters)
    || value.defaultMaximumPromptCharacters < 1000) {
    invalid('The provider prompt policy default maximum is invalid.');
  }
  if (!value.providerMaximumPromptCharacters
    || typeof value.providerMaximumPromptCharacters !== 'object'
    || Object.values(value.providerMaximumPromptCharacters).some(maximum => (
      !Number.isInteger(maximum) || maximum < 1000
    ))) {
    invalid('The provider prompt policy provider maximums are invalid.');
  }
  if (!Array.isArray(value.blockOrder)
    || value.blockOrder.length !== PROVIDER_PROMPT_BLOCK_KEYS.size
    || new Set(value.blockOrder).size !== PROVIDER_PROMPT_BLOCK_KEYS.size
    || value.blockOrder.some(block => !PROVIDER_PROMPT_BLOCK_KEYS.has(block))) {
    invalid('The provider prompt policy block order is invalid.');
  }
  if (!value.blockCharacterLimits || typeof value.blockCharacterLimits !== 'object') {
    invalid('The provider prompt policy requires block limits.');
  }
  for (const block of value.blockOrder) {
    if (!Number.isInteger(value.blockCharacterLimits[block])
      || value.blockCharacterLimits[block] < 100) {
      invalid(`The provider prompt policy limit for ${block} is invalid.`);
    }
    if (block !== 'visualAuthority' && !text(value.blockLabels?.[block])) {
      invalid(`The provider prompt policy label for ${block} is invalid.`);
    }
  }
  if (!Number.isInteger(value.reservedFormattingCharacters)
    || value.reservedFormattingCharacters < 0) {
    invalid('The provider prompt policy formatting reserve is invalid.');
  }
  const smallestMaximum = Math.min(
    value.defaultMaximumPromptCharacters,
    ...Object.values(value.providerMaximumPromptCharacters)
  );
  const blockMaximum = value.blockOrder.reduce(
    (total, block) => total + value.blockCharacterLimits[block],
    value.reservedFormattingCharacters
  );
  if (blockMaximum > smallestMaximum) {
    invalid('The provider prompt policy block limits exceed a provider maximum.');
  }
  if (!value.referenceRoleInstructions || REFERENCE_ROLE_KEYS.some(role => (
    !text(value.referenceRoleInstructions[role])
  ))) {
    invalid('The provider prompt policy reference role coverage is incomplete.');
  }
  if (!text(value.referenceBoundaryInstruction)
    || !text(value.multiViewInstruction)
    || !text(value.preserveOutfitInstruction)
    || !text(value.replaceOutfitInstruction)) {
    invalid('The provider prompt policy authority instructions are incomplete.');
  }
  for (const field of [
    'narrativeBehaviorInstructions',
    'baselinePhotographicInstructions',
    'constraintInstructions'
  ]) {
    if (!Array.isArray(value[field]) || !value[field].length || value[field].some(item => !text(item))) {
      invalid(`The provider prompt policy ${field} are incomplete.`);
    }
  }
  if (!Array.isArray(value.captureProfileInstructions?.[keyframePolicy.defaultCaptureProfileId])
    || !value.captureProfileInstructions[keyframePolicy.defaultCaptureProfileId].length
    || value.captureProfileInstructions[keyframePolicy.defaultCaptureProfileId]
      .some(item => !text(item))) {
    invalid('The provider prompt policy capture profile instructions are incomplete.');
  }
  return freezeClone(value);
}

function assertHeader(value, label) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1
    || !text(value.id) || !Number.isInteger(value.version) || value.version <= 0) {
    invalid(`Cinematic ${label} header is invalid.`);
  }
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

function createFingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function text(value) {
  return String(value || '').trim();
}

function invalid(message) {
  throw new TypeError(message);
}

export const cinematicKeyframeConfigurationService = new CinematicKeyframeConfigurationService();
