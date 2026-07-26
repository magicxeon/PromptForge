import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

const CONFIG_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../config/community-feature-flags.json'
);

const REQUIRED_BOOLEAN_PATHS = Object.freeze([
  'community.enabled',
  'community.shareEnabled',
  'community.exploreEnabled',
  'community.engagementEnabled',
  'community.creatorProfilesEnabled',
  'community.galleryEnabled',
  'community.moderationEnabled',
  'community.privateBeta',
  'development.mockActorSwitcherEnabled',
  'routing.automaticSimpleModeEnabled'
]);

let cachedFlags = null;

export class CommunityFeaturePolicyService {
  constructor({ configLoader = loadCommunityFeatureFlags } = {}) {
    this.configLoader = configLoader;
  }

  async getFlags() {
    return this.configLoader();
  }

  async getEffectiveFlags() {
    const flags = await this.getFlags();
    if (!isDevelopmentEnvironment() && flags.community.privateBeta !== true) {
      flags.community.exploreEnabled = false;
      flags.community.engagementEnabled = false;
      flags.community.creatorProfilesEnabled = false;
      flags.community.galleryEnabled = false;
      flags.community.moderationEnabled = false;
      flags.development.mockActorSwitcherEnabled = false;
    }
    return flags;
  }

  async getPublicFlags() {
    const flags = await this.getEffectiveFlags();
    return {
      schemaVersion: flags.schemaVersion,
      community: structuredClone(flags.community),
      development: {
        mockActorSwitcherEnabled: isDevelopmentEnvironment()
          && flags.development.mockActorSwitcherEnabled === true
      },
      routing: {
        automaticSimpleModeEnabled: flags.routing.automaticSimpleModeEnabled === true
      }
    };
  }

  async isEnabled(featurePath) {
    const flags = await this.getEffectiveFlags();
    return readBooleanPath(flags, featurePath);
  }

  async assertEnabled(featurePath) {
    const enabled = await this.isEnabled(featurePath);
    if (enabled) return true;
    throw new RepositoryContractError(
      'community_feature_disabled',
      'This Community feature is not available.',
      404
    );
  }
}

export async function loadCommunityFeatureFlags({ forceReload = false } = {}) {
  if (cachedFlags && !forceReload) return structuredClone(cachedFlags);
  const parsed = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
  validateCommunityFeatureFlags(parsed);
  cachedFlags = parsed;
  return structuredClone(cachedFlags);
}

export function validateCommunityFeatureFlags(flags) {
  if (!flags || typeof flags !== 'object') {
    throw new TypeError('Community feature flags must be an object.');
  }
  if (!Number.isInteger(Number(flags.schemaVersion))) {
    throw new TypeError('Community feature flag schemaVersion is required.');
  }
  for (const featurePath of REQUIRED_BOOLEAN_PATHS) {
    if (typeof readPath(flags, featurePath) !== 'boolean') {
      throw new TypeError(`Community feature flag "${featurePath}" must be boolean.`);
    }
  }
  if (flags.community.enabled !== true) {
    const enabledChild = Object.entries(flags.community)
      .some(([key, value]) => key !== 'enabled' && value === true);
    if (enabledChild) {
      throw new TypeError('Community child features cannot be enabled while Community is disabled.');
    }
  }
  if (flags.community.exploreEnabled && !flags.community.shareEnabled) {
    throw new TypeError('Community Explore requires Community sharing.');
  }
  if (flags.community.engagementEnabled
    && (!flags.community.exploreEnabled || !flags.community.moderationEnabled)) {
    throw new TypeError('Community engagement requires Explore and moderation.');
  }
  if (flags.community.galleryEnabled && !flags.community.creatorProfilesEnabled) {
    throw new TypeError('Community gallery requires creator profiles.');
  }
  return true;
}

function readBooleanPath(value, featurePath) {
  return readPath(value, featurePath) === true;
}

function readPath(value, featurePath) {
  return String(featurePath).split('.').reduce(
    (current, key) => current && typeof current === 'object' ? current[key] : undefined,
    value
  );
}

function isDevelopmentEnvironment() {
  return process.env.NODE_ENV !== 'production';
}

export const communityFeaturePolicyService = new CommunityFeaturePolicyService();
