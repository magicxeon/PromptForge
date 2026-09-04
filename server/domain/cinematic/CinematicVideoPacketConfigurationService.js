import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '../../config/cinematic/video-packet-policy.v1.json');
const REQUIRED_SECTIONS = new Set([
  'startAuthority', 'temporalAction', 'camera', 'performance', 'environment',
  'continuity', 'audio', 'prohibitions', 'authorDirection'
]);

export class CinematicVideoPacketConfigurationService {
  constructor({ policyPath = DEFAULT_PATH } = {}) {
    this.policyPath = policyPath;
    this.cached = null;
  }

  getPolicy() {
    if (this.cached) return structuredClone(this.cached);
    const policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    validatePolicy(policy);
    this.cached = Object.freeze(policy);
    return structuredClone(this.cached);
  }
}

function validatePolicy(policy) {
  if (policy?.schemaVersion !== 1 || !policy.id || !Number.isInteger(policy.version)
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
}

export const cinematicVideoPacketConfigurationService = new CinematicVideoPacketConfigurationService();
