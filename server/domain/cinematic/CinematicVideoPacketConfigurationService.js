import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '../../config/cinematic/video-packet-policy.v2.json');
const DEFAULT_STRATEGY_PATH = path.resolve(__dirname, '../../config/cinematic/video-provider-prompt-strategies.json');
const REQUIRED_SECTIONS = new Set([
  'startAuthority', 'temporalAction', 'camera', 'performance', 'environment',
  'continuity', 'audio', 'prohibitions', 'authorDirection'
]);

export class CinematicVideoPacketConfigurationService {
  constructor({ policyPath = DEFAULT_PATH, strategyPath = DEFAULT_STRATEGY_PATH } = {}) {
    this.policyPath = policyPath;
    this.strategyPath = strategyPath;
    this.cached = null;
    this.cachedStrategies = null;
  }

  getPolicy() {
    if (this.cached) return structuredClone(this.cached);
    const policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    validatePolicy(policy);
    this.cached = Object.freeze(policy);
    return structuredClone(this.cached);
  }

  getPromptStrategy(providerId = '') {
    if (!this.cachedStrategies) {
      const configuration = JSON.parse(fs.readFileSync(this.strategyPath, 'utf8'));
      validateStrategies(configuration);
      this.cachedStrategies = Object.freeze(configuration);
    }
    const provider = String(providerId || '').trim();
    const selected = this.cachedStrategies.strategies.find(strategy => (
      strategy.providerIds.includes(provider)
    )) || this.cachedStrategies.strategies.find(strategy => (
      strategy.id === this.cachedStrategies.defaultStrategyId
    ));
    return structuredClone(selected);
  }
}

function validatePolicy(policy) {
  if (policy.sketchReferenceMode) validateReferenceMode(policy.sketchReferenceMode);
  if (policy.looksOnlyMode) validateReferenceMode(policy.looksOnlyMode);
  if (![1, 2].includes(policy?.schemaVersion) || !policy.id || !Number.isInteger(policy.version)
    || !policy.contractVersion) {
    throw new TypeError('Cinematic video packet policy identity is invalid.');
  }
  if (!Number.isInteger(policy.maximumPromptCharacters)
    || policy.maximumPromptCharacters < 1000 || policy.maximumPromptCharacters > 4000) {
    throw new TypeError('Cinematic video packet prompt budget is invalid.');
  }
  if (!Array.isArray(policy.promptSectionOrder)
    || policy.promptSectionOrder.length !== REQUIRED_SECTIONS.size
    || new Set(policy.promptSectionOrder).size !== REQUIRED_SECTIONS.size
    || policy.promptSectionOrder.some(section => !REQUIRED_SECTIONS.has(section))) {
    throw new TypeError('Cinematic video packet section order is invalid.');
  }
  if (!Array.isArray(policy.globalProhibitions) || !policy.globalProhibitions.length
    || policy.globalProhibitions.some(value => !String(value || '').trim())) {
    throw new TypeError('Cinematic video packet prohibitions are invalid.');
  }
  if (policy.schemaVersion === 2) {
    if (!policy.sectionLabels || !policy.phrasing
      || [...REQUIRED_SECTIONS].some(section => !String(policy.sectionLabels[section] || '').trim())) {
      throw new TypeError('Cinematic video packet wording configuration is invalid.');
    }
  }
}

function validateStrategies(configuration) {
  if (configuration?.schemaVersion !== 1 || !configuration.defaultStrategyId
    || !Array.isArray(configuration.strategies) || !configuration.strategies.length) {
    throw new TypeError('Cinematic video prompt strategies are invalid.');
  }
  const ids = new Set();
  for (const strategy of configuration.strategies) {
    if (!strategy?.id || ids.has(strategy.id) || !Number.isInteger(strategy.version)
      || !Array.isArray(strategy.providerIds) || !strategy.providerIds.length
      || strategy.providerIds.some(value => !String(value || '').trim())) {
      throw new TypeError('Cinematic video prompt strategy entry is invalid.');
    }
    if (strategy.omitSections !== undefined
      && (!Array.isArray(strategy.omitSections)
        || strategy.omitSections.some(section => !REQUIRED_SECTIONS.has(section)))) {
      throw new TypeError('Cinematic video prompt strategy omitted sections are invalid.');
    }
    ids.add(strategy.id);
    if (strategy.lookReferenceMode) validateReferenceMode(strategy.lookReferenceMode);
  }
  if (!ids.has(configuration.defaultStrategyId)) {
    throw new TypeError('Cinematic video default prompt strategy is invalid.');
  }
}

function validateReferenceMode(mode) {
  if (!Number.isInteger(mode.maximumPromptCharacters) || mode.maximumPromptCharacters > 4000
    || mode.maximumPromptCharacters < 1000
    || ['promptPrefix', 'startAuthority', 'characterMapping', 'prohibitions', 'sectionLabel']
      .some(key => !String(mode[key] || '').trim())) {
    throw new TypeError('Cinematic Look reference prompt configuration is invalid.');
  }
}

export const cinematicVideoPacketConfigurationService = new CinematicVideoPacketConfigurationService();
