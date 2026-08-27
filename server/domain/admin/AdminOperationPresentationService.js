import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { adminOperationPresentationRepository } from '../../repositories/admin/AdminOperationPresentationRepository.js';
import { auditService } from '../audit/AuditService.js';
import { adminPolicyService } from './AdminPolicyService.js';

const DISMISSIBLE = new Set(['failed', 'expired', 'reconciliation_required']);

export class AdminOperationPresentationService {
  constructor({
    historyRepo = historyRepository,
    videoTaskRepository = videoProviderTaskRepository,
    presentationRepository = adminOperationPresentationRepository,
    policy = adminPolicyService,
    audit = auditService
  } = {}) {
    this.historyRepo = historyRepo;
    this.videoTaskRepository = videoTaskRepository;
    this.presentationRepository = presentationRepository;
    this.policy = policy;
    this.audit = audit;
  }

  async dismiss(input, actorContext, request = null) {
    const actor = this.policy.assertCanDismissOperation(actorContext);
    const operationId = String(input.operationId || '').trim();
    const mediaType = input.mediaType === 'video' ? 'video' : 'image';
    const reason = this.policy.requireReason(input.reason, 'Dismissing a failed operation');
    const operation = mediaType === 'video'
      ? await this.videoTaskRepository.find(operationId)
      : await this.historyRepo.getById(operationId);
    if (!operation) throw operationError('admin_operation_not_found', 'Generation operation not found.', 404);
    const status = operation.status || 'completed';
    if (!DISMISSIBLE.has(status)) {
      throw operationError('admin_operation_not_dismissible', 'Only failed or reconciliation operations can be dismissed.', 409);
    }
    const result = await this.presentationRepository.dismiss({
      operationId, mediaType, reason, actorUserId: actor.userId
    });
    if (!result.duplicate) {
      await this.audit.record({
        action: 'admin.operation.dismiss', targetType: 'generation_operation', targetId: operationId, reason,
        beforeSnapshot: { presentationStatus: 'visible', lifecycleStatus: status },
        afterSnapshot: { presentationStatus: 'dismissed', lifecycleStatus: status, mediaType }
      }, actor, request);
    }
    return result;
  }

  async restore(input, actorContext, request = null) {
    const actor = this.policy.assertCanDismissOperation(actorContext);
    const operationId = String(input.operationId || '').trim();
    const reason = this.policy.requireReason(input.reason, 'Restoring a dismissed operation');
    const dismissal = await this.presentationRepository.restore(operationId, actor.userId);
    if (!dismissal) throw operationError('admin_operation_dismissal_not_found', 'Dismissed operation not found.', 404);
    await this.audit.record({
      action: 'admin.operation.restore', targetType: 'generation_operation', targetId: operationId, reason,
      beforeSnapshot: { presentationStatus: 'dismissed' }, afterSnapshot: { presentationStatus: 'visible' }
    }, actor, request);
    return { dismissal };
  }
}

function operationError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const adminOperationPresentationService = new AdminOperationPresentationService();
