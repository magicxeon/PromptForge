import { readFileSync } from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../../config/paths.js';
import {
  AUTHORITY_DOMAINS,
  REFERENCE_ROLES,
  ReferenceProcessingError
} from './referenceProcessingContracts.js';

const DEFAULT_POLICY_PATH = path.resolve(
  PROJECT_ROOT,
  'server/config/reference-processing-policy.json'
);
const ALLOWED_SOURCE_KINDS = new Set(['asset', 'history', 'template', 'character']);

export class ReferencePolicyRegistry {
  constructor({
    policy = null,
    policyPath = DEFAULT_POLICY_PATH,
    knownProcessorIds = []
  } = {}) {
    this.policyPath = policyPath;
    this.knownProcessorIds = new Set(knownProcessorIds);
    this.policy = structuredClone(policy || loadJson(policyPath));
    validatePolicy(this.policy, this.knownProcessorIds);
  }

  getPolicyVersion() {
    return this.policy.policyVersion;
  }

  getRole(role) {
    return this.policy.roles[role] || null;
  }

  getDirective(directiveId) {
    return this.policy.directives[directiveId] || null;
  }

  getDomainPriority(domain) {
    return [...(this.policy.domainPriorities[domain] || [])];
  }

  getReferenceOrder(providerId, modelId) {
    const exact = `${providerId}/${modelId}`;
    const providerWildcard = `${providerId}/*`;
    const override = this.policy.providerOverrides[exact]
      || this.policy.providerOverrides[providerWildcard]
      || null;
    return [...(override?.referenceOrder || this.policy.defaultReferenceOrder)];
  }

  getProviderDirectiveSuffixes(providerId, modelId) {
    const exact = `${providerId}/${modelId}`;
    const providerWildcard = `${providerId}/*`;
    const override = this.policy.providerOverrides[exact]
      || this.policy.providerOverrides[providerWildcard]
      || null;
    return [...(override?.directiveSuffixIds || [])];
  }

  getPublicRoleCatalog() {
    return Object.fromEntries(Object.entries(this.policy.roles).map(([role, config]) => [
      role,
      {
        intent: config.intent,
        preserveTraits: [...config.preserveTraits],
        suppressTraits: [...config.suppressTraits],
        scopeOptions: [...(config.scopeOptions || [])],
        defaultScope: config.defaultScope || null,
        minimumConfidence: config.minimumConfidence ?? null
      }
    ]));
  }
}

function loadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new ReferenceProcessingError(
      'reference_policy_invalid',
      `Reference processing policy could not be loaded: ${error.message}`,
      500
    );
  }
}

function validatePolicy(policy, knownProcessorIds) {
  if (!policy || typeof policy !== 'object' || policy.schemaVersion !== 1) {
    invalid('schemaVersion must be 1.');
  }
  if (!String(policy.policyVersion || '').trim()) invalid('policyVersion is required.');
  if (!['safe_deterministic', 'reject'].includes(policy.defaultFallbackMode)) {
    invalid('defaultFallbackMode is invalid.');
  }
  if (!Array.isArray(policy.defaultReferenceOrder) || !policy.defaultReferenceOrder.length) {
    invalid('defaultReferenceOrder is required.');
  }
  if (new Set(policy.defaultReferenceOrder).size !== policy.defaultReferenceOrder.length) {
    invalid('defaultReferenceOrder contains duplicates.');
  }
  for (const role of policy.defaultReferenceOrder) {
    if (!REFERENCE_ROLES.includes(role)) {
      invalid(`defaultReferenceOrder uses unknown role ${role}.`);
    }
  }
  for (const role of REFERENCE_ROLES) {
    const config = policy.roles?.[role];
    if (!config) invalid(`Role ${role} is missing.`);
    for (const field of [
      'allowedSourceKinds',
      'preserveTraits',
      'suppressTraits',
      'authorityDomains',
      'ownedAttributeGroups',
      'editableAttributeFields',
      'processors'
    ]) {
      if (!Array.isArray(config[field])) invalid(`Role ${role}.${field} must be an array.`);
    }
    if (!String(config.intent || '').trim()) invalid(`Role ${role}.intent is required.`);
    for (const sourceKind of config.allowedSourceKinds) {
      if (!ALLOWED_SOURCE_KINDS.has(sourceKind)) {
        invalid(`Role ${role} uses unknown source kind ${sourceKind}.`);
      }
    }
    if (!String(config.directiveId || '').trim() || !policy.directives?.[config.directiveId]?.base) {
      invalid(`Role ${role} references an unknown directive.`);
    }
    for (const domain of config.authorityDomains) {
      if (!AUTHORITY_DOMAINS.includes(domain)) invalid(`Role ${role} uses unknown domain ${domain}.`);
    }
    for (const processorId of config.processors) {
      if (knownProcessorIds.size && !knownProcessorIds.has(processorId)) {
        invalid(`Role ${role} references unknown processor ${processorId}.`);
      }
    }
  }
  for (const [domain, priorities] of Object.entries(policy.domainPriorities || {})) {
    if (!AUTHORITY_DOMAINS.includes(domain) || !Array.isArray(priorities) || !priorities.length) {
      invalid(`Domain priority ${domain} is invalid.`);
    }
  }
  for (const [key, override] of Object.entries(policy.providerOverrides || {})) {
    if (!/^[a-z0-9_-]+\/(?:[a-z0-9_.-]+|\*)$/i.test(key)) {
      invalid(`Provider override ${key} is invalid.`);
    }
    for (const role of override.referenceOrder || []) {
      if (!policy.roles[role]) invalid(`Provider override ${key} uses unknown role ${role}.`);
    }
    for (const directiveId of override.directiveSuffixIds || []) {
      if (!policy.directives[directiveId]) {
        invalid(`Provider override ${key} uses unknown directive ${directiveId}.`);
      }
    }
  }
}

function invalid(message) {
  throw new ReferenceProcessingError(
    'reference_policy_invalid',
    `Invalid reference processing policy: ${message}`,
    500
  );
}
