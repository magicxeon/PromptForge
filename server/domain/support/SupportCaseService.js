import { supportCaseRepository } from '../../repositories/support/SupportCaseRepository.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { auditService } from '../audit/AuditService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { adminFeaturePolicyService } from '../admin/AdminFeaturePolicyService.js';

const STATUSES = new Set(['open', 'investigating', 'waiting_for_customer', 'resolved', 'closed']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const TRANSITIONS = {
  open: new Set(['investigating', 'waiting_for_customer', 'resolved']),
  investigating: new Set(['waiting_for_customer', 'resolved']),
  waiting_for_customer: new Set(['investigating', 'resolved']),
  resolved: new Set(['investigating', 'closed']),
  closed: new Set(['investigating'])
};

export class SupportCaseService {
  constructor({ repository = supportCaseRepository, policy = adminPolicyService, featurePolicy = adminFeaturePolicyService, audit = auditService } = {}) {
    this.repository = repository;
    this.policy = policy;
    this.featurePolicy = featurePolicy;
    this.audit = audit;
  }

  list(query, actorContext) {
    this.featurePolicy.assertEnabled('supportCases', actorContext);
    return this.repository.list(query);
  }

  async get(caseId, actorContext) {
    this.featurePolicy.assertEnabled('supportCases', actorContext);
    const record = await this.repository.findById(caseId);
    if (!record) throw new RepositoryContractError('support_case_not_found', 'Support case not found.', 404);
    return record;
  }

  async create(input, actorContext, request = null) {
    this.featurePolicy.assertEnabled('supportCases', actorContext);
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    const title = String(input.title || '').trim();
    if (title.length < 4) throw new RepositoryContractError('support_case_title_required', 'A meaningful case title is required.', 400);
    const record = await this.repository.create({
      title,
      description: String(input.description || '').trim(),
      priority: PRIORITIES.has(input.priority) ? input.priority : 'normal',
      customerUserId: normalizeOptional(input.customerUserId),
      assigneeUserId: normalizeOptional(input.assigneeUserId),
      links: normalizeLinks(input.links),
      idempotencyKey: normalizeOptional(input.idempotencyKey),
      createdByUserId: actor.userId
    });
    await this.audit.record({ action: 'support_case_created', targetType: 'support_case', targetId: record.id, afterSnapshot: caseAuditSnapshot(record) }, actorContext, request);
    return record;
  }

  async update(caseId, input, actorContext, request = null) {
    this.featurePolicy.assertEnabled('supportCases', actorContext);
    this.policy.assertCanAccessBackoffice(actorContext);
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    const before = await this.get(caseId, actorContext);
    const updated = await this.repository.update(caseId, input.expectedVersion, draft => {
      if (input.status && input.status !== draft.status) {
        if (!STATUSES.has(input.status) || !TRANSITIONS[draft.status]?.has(input.status)) {
          throw new RepositoryContractError('support_case_transition_invalid', `Cannot move case from ${draft.status} to ${input.status}.`, 409);
        }
        draft.status = input.status;
        if (input.status === 'resolved') draft.resolvedAt = new Date().toISOString();
        if (input.status === 'closed') draft.closedAt = new Date().toISOString();
      }
      if (input.priority && PRIORITIES.has(input.priority)) draft.priority = input.priority;
      if ('assigneeUserId' in input) draft.assigneeUserId = normalizeOptional(input.assigneeUserId);
      if (String(input.note || '').trim()) draft.notes.push({ id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, body: String(input.note).trim(), authorUserId: actor.userId, createdAt: new Date().toISOString() });
      if (input.links) draft.links = normalizeLinks(input.links);
    });
    await this.audit.record({ action: 'support_case_updated', targetType: 'support_case', targetId: caseId, reason: normalizeOptional(input.reason), beforeSnapshot: caseAuditSnapshot(before), afterSnapshot: caseAuditSnapshot(updated) }, actorContext, request);
    return updated;
  }
}

function normalizeOptional(value) { const text = String(value || '').trim(); return text || null; }
function normalizeLinks(links) {
  return (Array.isArray(links) ? links : []).slice(0, 20).map(link => ({
    targetType: String(link?.targetType || 'unknown').trim(), targetId: String(link?.targetId || '').trim()
  })).filter(link => link.targetId);
}
function caseAuditSnapshot(record) {
  return { id: record.id, version: record.version, status: record.status, priority: record.priority, customerUserId: record.customerUserId, assigneeUserId: record.assigneeUserId, linkCount: record.links.length, noteCount: record.notes.length };
}

export const supportCaseService = new SupportCaseService();
