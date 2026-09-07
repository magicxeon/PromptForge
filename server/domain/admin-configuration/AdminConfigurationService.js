import { adminConfigurationRepository } from '../../repositories/admin-configuration/AdminConfigurationRepository.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { adminFeaturePolicyService } from '../admin/AdminFeaturePolicyService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';
import { isFinanceDraftScope, validateFinanceDraft } from './financeDraftValidation.js';

const SCOPES = new Set(['providers', 'pricing', 'video_pricing', 'qualification', 'feature_exposure', 'finance_provider_cost', 'finance_supplier_agreement']);
const FORBIDDEN_KEY = /(secret|api.?key|token|password|credential)/i;

export class AdminConfigurationService {
  constructor({ repository = adminConfigurationRepository, featurePolicy = adminFeaturePolicyService, policy = adminPolicyService, audit = auditService } = {}) {
    this.repository = repository; this.featurePolicy = featurePolicy; this.policy = policy; this.audit = audit;
  }
  async list(actorContext) {
    this.featurePolicy.assertEnabled('runtimeConfigurationDrafts', actorContext);
    this.policy.assertCanAccessBackoffice(actorContext);
    const state = await this.repository.getState();
    const financeAllowed = actorContext.role === 'admin' && process.env.NODE_ENV !== 'production';
    return { activeRevisionIds: Object.fromEntries(Object.entries(state.activeRevisionIds)
      .filter(([scope]) => financeAllowed || !isFinanceDraftScope(scope))),
    revisions: state.revisions.filter(item => financeAllowed || !isFinanceDraftScope(item.scope)) };
  }
  validate(input, actorContext) {
    assertFinanceDraftAccess(input?.scope, actorContext, this.policy);
    this.featurePolicy.assertEnabled('runtimeConfigurationDrafts', actorContext);
    this.policy.assertCanAccessBackoffice(actorContext);
    return validateDraft(input);
  }
  async createDraft(input, actorContext, request = null) {
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
      commandId: isFinanceDraftScope(input.scope) ? input.values.commandId : null, createdByUserId: actor.userId });
    if (!record.replayed) await this.audit.record({ action: 'admin_configuration_draft_created', targetType: 'configuration_revision', targetId: record.id, afterSnapshot: { scope: record.scope, status: record.status, valueKeys: Object.keys(record.values) } }, actorContext, request);
    return record;
  }
  publish(_revisionId, actorContext) {
    this.featurePolicy.assertEnabled('runtimeConfigurationPublish', actorContext);
    throw new RepositoryContractError('admin_configuration_publish_not_implemented', 'Production publication remains gated until transactional consumer cutover exists.', 501);
  }
}

function validateDraft(input = {}) {
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
