import { adminConfigurationRepository } from '../../repositories/admin-configuration/AdminConfigurationRepository.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { adminFeaturePolicyService } from '../admin/AdminFeaturePolicyService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';
import { isFinanceDraftScope, validateFinanceDraft } from './financeDraftValidation.js';
import { validatePricingDraft } from './pricingDraftValidation.js';
import { creditPricingPolicyService } from '../credits/CreditPricingPolicyService.js';

const SCOPES = new Set(['providers', 'pricing', 'video_pricing', 'qualification', 'feature_exposure', 'finance_provider_cost', 'finance_supplier_agreement']);
const FORBIDDEN_KEY = /(secret|api.?key|token|password|credential)/i;

export class AdminConfigurationService {
  constructor({ repository = adminConfigurationRepository, featurePolicy = adminFeaturePolicyService, policy = adminPolicyService,
    audit = auditService, pricingPolicy = creditPricingPolicyService, environment = process.env } = {}) {
    this.repository = repository; this.featurePolicy = featurePolicy; this.policy = policy; this.audit = audit;
    this.pricingPolicy = pricingPolicy; this.environment = environment;
  }
  async list(actorContext) {
    this.featurePolicy.assertEnabled('runtimeConfigurationDrafts', actorContext);
    this.policy.assertCanAccessBackoffice(actorContext);
    const state = await this.repository.getState();
    const pricing = await this.pricingPolicy.loadPolicy();
    const financeAllowed = actorContext.role === 'admin' && process.env.NODE_ENV !== 'production';
    return { activePricing: {
      pricingPolicyVersion: pricing.policyVersion,
      profitMarkupPercentByMedia: pricing.profitMarkupPercentByMedia || null,
      revisionId: state.activeRevisionIds.pricing || null
    }, activeRevisionIds: Object.fromEntries(Object.entries(state.activeRevisionIds)
      .filter(([scope]) => financeAllowed || !isFinanceDraftScope(scope))),
    revisions: state.revisions.filter(item => financeAllowed || !isFinanceDraftScope(item.scope)) };
  }
  validate(input, actorContext) {
    this.#assertPricingAccess(input?.scope, actorContext);
    assertFinanceDraftAccess(input?.scope, actorContext, this.policy);
    this.featurePolicy.assertEnabled('runtimeConfigurationDrafts', actorContext);
    this.policy.assertCanAccessBackoffice(actorContext);
    return validateDraft(input);
  }
  async createDraft(input, actorContext, request = null) {
    this.#assertPricingAccess(input?.scope, actorContext);
    assertFinanceDraftAccess(input?.scope, actorContext, this.policy);
    this.featurePolicy.assertEnabled('runtimeConfigurationDrafts', actorContext);
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    const validation = validateDraft(input);
    if (!validation.valid) {
      const error = new RepositoryContractError('admin_configuration_invalid', 'Configuration draft is invalid.', 400);
      error.details = validation;
      throw error;
    }
    const record = await this.repository.createDraft({ scope: input.scope, values: input.values, validation,
      commandId: isFinanceDraftScope(input.scope) || input.scope === 'pricing' ? input.values.commandId : null, createdByUserId: actor.userId });
    if (!record.replayed) await this.audit.record({ action: 'admin_configuration_draft_created', targetType: 'configuration_revision', targetId: record.id, afterSnapshot: { scope: record.scope, status: record.status, valueKeys: Object.keys(record.values) } }, actorContext, request);
    return record;
  }
  publish(revisionId, actorContext, request = null) {
    this.featurePolicy.assertEnabled('runtimeConfigurationPublish', actorContext);
    if (!request) throw new RepositoryContractError('admin_configuration_publish_not_implemented',
      'Pricing publication requires an explicit versioned command.', 501);
    return this.#publishPricing(revisionId, actorContext, request);
  }
  async #publishPricing(revisionId, actorContext, request) {
    this.#assertPricingAccess('pricing', actorContext);
    const revision = await this.repository.findById(revisionId);
    if (!revision || revision.scope !== 'pricing') {
      throw new RepositoryContractError('admin_configuration_publish_not_implemented', 'Only bounded local pricing publication is available.', 501);
    }
    const validation = validatePricingDraft({ scope: 'pricing', values: revision.values });
    const command = request?.body ?? request;
    if (!validation.valid || !Number.isSafeInteger(command.expectedVersion) || command.expectedVersion <= 0
      || (command.baseActiveRevisionId !== null && typeof command.baseActiveRevisionId !== 'string')
      || typeof command.commandId !== 'string' || !/^[a-zA-Z0-9:_-]{8,160}$/.test(command.commandId)
      || typeof command.reason !== 'string' || command.reason.trim().length < 3 || command.reason.length > 500
      || Object.keys(command).some(key => !['expectedVersion', 'baseActiveRevisionId', 'commandId', 'reason'].includes(key))) {
      throw new RepositoryContractError('admin_configuration_invalid', 'Pricing publication command is invalid.', 400);
    }
    await this.audit.record({ action: 'admin_pricing_publication_requested', targetType: 'configuration_revision',
      targetId: revisionId, reason: command.reason,
      afterSnapshot: { commandId: command.commandId, expectedVersion: command.expectedVersion,
        baseActiveRevisionId: command.baseActiveRevisionId, profitMarkupPercentByMedia: revision.values.profitMarkupPercentByMedia }
    }, actorContext, request?.body ? request : null);
    return this.repository.publishPricing({ revisionId, ...command, actorUserId: actorContext.userId });
  }
  #assertPricingAccess(scope, actorContext) {
    if (scope !== 'pricing') return;
    if (this.policy.assertCanAccessBackoffice(actorContext).role !== 'admin') {
      throw new RepositoryContractError('admin_pricing_forbidden', 'Pricing changes require Admin access.', 403);
    }
    if ((this.environment.NODE_ENV || 'development') === 'production') {
      throw new RepositoryContractError('admin_pricing_production_gated', 'Production pricing publication requires trusted identity and transactional storage.', 503);
    }
  }
}

function validateDraft(input = {}) {
  if (input.scope === 'pricing') return validatePricingDraft(input);
  if (isFinanceDraftScope(input.scope)) return validateFinanceDraft(input);
  const errors = [];
  if (!SCOPES.has(input.scope)) errors.push({ path: ['scope'], code: 'unsupported_scope' });
  if (!input.values || typeof input.values !== 'object' || Array.isArray(input.values)) errors.push({ path: ['values'], code: 'object_required' });
  for (const path of findForbiddenKeys(input.values)) errors.push({ path: ['values', ...path], code: 'secret_key_forbidden' });
  return { valid: errors.length === 0, errors, warnings: ['Drafts do not affect runtime consumers until the production publication gate is implemented.'] };
}
function assertFinanceDraftAccess(scope, actor, policy) {
  if (!isFinanceDraftScope(scope)) return;
  if (policy.assertCanAccessBackoffice(actor).role !== 'admin') {
    throw new RepositoryContractError('finance_access_forbidden', 'Finance requires Admin access.', 403);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new RepositoryContractError('finance_trusted_identity_required', 'Trusted Finance identity is required.', 503);
  }
}
function findForbiddenKeys(value, prefix = []) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(FORBIDDEN_KEY.test(key) ? [[...prefix, key]] : []),
    ...findForbiddenKeys(child, [...prefix, key])
  ]);
}
export const adminConfigurationService = new AdminConfigurationService();
