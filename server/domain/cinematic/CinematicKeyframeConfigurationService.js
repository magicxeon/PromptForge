import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.resolve(__dirname, '../../config/cinematic');
const DEFAULT_PATHS = Object.freeze({
  policy: path.resolve(CONFIG_ROOT, 'keyframe-policy.v2.json'),
  budget: path.resolve(CONFIG_ROOT, 'prompt-budget.v2.json'),
  captureProfile: path.resolve(CONFIG_ROOT, 'capture-profiles/photorealistic-cinematic.v1.json')
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

export class CinematicKeyframeConfigurationService {
  constructor({ paths = DEFAULT_PATHS, policy, budget, captureProfile } = {}) {
    this.policy = validatePolicy(policy || loadJson(paths.policy));
    this.budget = validateBudget(budget || loadJson(paths.budget), this.policy);
    this.captureProfile = validateCaptureProfile(captureProfile || loadJson(paths.captureProfile));
    if (this.policy.defaultCaptureProfileId !== this.captureProfile.id) {
      invalid('The keyframe policy default capture profile is unavailable.');
    }
    this.fingerprint = createFingerprint({
      policy: this.policy,
      budget: this.budget,
      captureProfile: this.captureProfile
    });
  }

  getCompilerConfiguration() {
    return structuredClone({
      policy: this.policy,
      budget: this.budget,
      captureProfile: this.captureProfile,
      fingerprint: this.fingerprint
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
